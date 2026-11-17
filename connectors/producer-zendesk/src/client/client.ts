import { ConnectorError, Metrics, Telemetry } from "@useairfoil/connector-kit";
import {
  Config,
  Context,
  Duration,
  Effect,
  Layer,
  Option,
  Predicate,
  Redacted,
  Schedule,
  Schema,
} from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";
import { RateLimiter } from "effect/persistence";

import { type ZendeskConfig, manifest } from "../manifest";
import * as ZendeskAuth from "./auth";
import { baseUrl } from "./constants";

const maxRetries = 5;
const retryBaseDelay = Duration.seconds(1);
const requestTimeout = Duration.minutes(2);
// Start at the lowest plan limit; headers give the account's actual limit.
const accountLimit = 200;
// Incremental exports allow 10 per minute, shared with every other tool on the
// account. The users export has its own 20. We space calls out evenly, since a
// full bucket would let a burst through on top of the refill. Their limiters
// ignore headers, or they would pick up the account limit.
const exportInterval = "6 seconds";
const usersExportInterval = "3 seconds";

export type ZendeskClientService = {
  readonly get: <A>(
    schema: Schema.Decoder<A>,
    path: string,
    params?: Readonly<Record<string, string>>,
  ) => Effect.Effect<A, ConnectorError>;
  /** Like `get`, but a `404` gives `None`. */
  readonly find: <A>(
    schema: Schema.Decoder<A>,
    path: string,
    params?: Readonly<Record<string, string>>,
  ) => Effect.Effect<Option.Option<A>, ConnectorError>;
};

export class ZendeskClient extends Context.Service<ZendeskClient, ZendeskClientService>()(
  "@useairfoil/producer-zendesk/ZendeskClient",
) {}

const ErrorBodySchema = Schema.Struct({
  description: Schema.optional(Schema.String),
  // The survey API puts it here instead.
  errors: Schema.optional(Schema.Array(Schema.Struct({ title: Schema.String }))),
});

const statusError = (response: HttpClientResponse.HttpClientResponse, path: string) =>
  HttpClientResponse.schemaBodyJson(ErrorBodySchema)(response).pipe(
    Effect.map((body) => body.description ?? body.errors?.[0]?.title),
    Effect.orElseSucceed(() => undefined),
    Effect.flatMap((detail) =>
      Effect.fail(
        new ConnectorError({
          message: `Zendesk API returned ${response.status} for ${path}${detail ? `: ${detail}` : ""}`,
        }),
      ),
    ),
    Effect.tapError((error) => Telemetry.annotateError("api_status", error)),
  );

const isResponse = (value: unknown): value is HttpClientResponse.HttpClientResponse =>
  Predicate.hasProperty(value, HttpClientResponse.TypeId);

const retrySchedule = Metrics.retrySchedule({
  connector: manifest.name,
  baseDelay: retryBaseDelay,
  times: maxRetries,
}).pipe(
  Schedule.modifyDelay(({ input, duration }) => {
    const retryAfter =
      isResponse(input) && input.status === 429 ? Number(input.headers["retry-after"]) : Number.NaN;
    return Effect.succeed(Number.isFinite(retryAfter) ? Duration.seconds(retryAfter) : duration);
  }),
);

export const make = Effect.fnUntraced(function* (config: Pick<ZendeskConfig, "subdomain">) {
  const auth = yield* ZendeskAuth.ZendeskAuth;
  const limiter = yield* RateLimiter.RateLimiter;
  const base = (yield* HttpClient.HttpClient).pipe(
    HttpClient.mapRequest(HttpClientRequest.prependUrl(`${baseUrl(config.subdomain)}/api/v2`)),
    HttpClient.mapRequest(HttpClientRequest.acceptJson),
    HttpClient.mapRequestEffect((request) =>
      auth.get.pipe(
        Effect.map((token) => HttpClientRequest.bearerToken(request, Redacted.value(token))),
      ),
    ),
    // Rate limit waits don't count towards the attempt's timeout.
    HttpClient.transform((effect) => Effect.timeout(effect, requestTimeout)),
  );
  const limited = (options: {
    readonly key: string;
    readonly limit: number;
    readonly window: Duration.Input;
    readonly readHeaders: boolean;
  }) =>
    base.pipe(
      HttpClient.withRateLimiter({
        limiter,
        key: options.key,
        limit: options.limit,
        window: options.window,
        algorithm: "token-bucket",
        // `retryTransient` retries `429`, with a cap and a metric.
        times: 0,
        disableResponseInspection: !options.readHeaders,
      }),
      HttpClient.retryTransient({ schedule: retrySchedule }),
    );
  const client = limited({
    key: "zendesk",
    limit: accountLimit,
    window: "1 minute",
    readHeaders: true,
  });
  const exportClient = limited({
    key: "zendesk-export",
    limit: 1,
    window: exportInterval,
    readHeaders: false,
  });
  const usersExportClient = limited({
    key: "zendesk-users-export",
    limit: 1,
    window: usersExportInterval,
    readHeaders: false,
  });
  const clientFor = (path: string) =>
    path.startsWith("/incremental/users/")
      ? usersExportClient
      : path.startsWith("/incremental/") || path.startsWith("/channels/voice/stats/incremental/")
        ? exportClient
        : client;

  const send = (path: string, params: Readonly<Record<string, string>>) =>
    clientFor(path)
      .execute(HttpClientRequest.get(path).pipe(HttpClientRequest.setUrlParams(params)))
      .pipe(
        Effect.catchTag(["HttpClientError", "RateLimiterError", "TimeoutError"], (error) =>
          Telemetry.annotateError("api_http", error).pipe(
            Effect.andThen(
              Effect.fail(
                new ConnectorError({
                  message: `Zendesk API request ${error._tag === "TimeoutError" ? "timed out" : "failed"} for ${path}`,
                  cause: error,
                }),
              ),
            ),
          ),
        ),
      );

  const decode = <A>(
    schema: Schema.Decoder<A>,
    response: HttpClientResponse.HttpClientResponse,
    path: string,
  ) =>
    HttpClientResponse.matchStatus(response, {
      "2xx": (ok) =>
        HttpClientResponse.schemaBodyJson(schema)(ok).pipe(
          Effect.tapError((error) => Telemetry.annotateError("api_decode", error)),
          Effect.mapError(
            (error) =>
              new ConnectorError({
                message: Schema.isSchemaError(error)
                  ? `Zendesk API response for ${path} does not match the schema`
                  : `Zendesk API returned invalid JSON for ${path}`,
                cause: error,
              }),
          ),
        ),
      orElse: (failed) => statusError(failed, path),
    });

  const traced = (path: string) =>
    Effect.withSpan(Telemetry.SpanName.apiFetch, {
      kind: "client",
      attributes: { [Telemetry.Attr.apiPath]: path },
    });

  const get = <A>(
    schema: Schema.Decoder<A>,
    path: string,
    params: Readonly<Record<string, string>> = {},
  ) =>
    send(path, params).pipe(
      Effect.flatMap((response) => decode(schema, response, path)),
      traced(path),
    );

  const find = <A>(
    schema: Schema.Decoder<A>,
    path: string,
    params: Readonly<Record<string, string>> = {},
  ) =>
    send(path, params).pipe(
      Effect.flatMap((response) =>
        response.status === 404
          ? Effect.succeedNone
          : decode(schema, response, path).pipe(Effect.map(Option.some)),
      ),
      traced(path),
    );

  return ZendeskClient.of({ get, find });
});

const RateLimiterLive = RateLimiter.layer.pipe(Layer.provide(RateLimiter.layerStoreMemory));

export const layer = (
  config: ZendeskConfig,
): Layer.Layer<ZendeskClient, never, HttpClient.HttpClient> =>
  Layer.effect(ZendeskClient)(make(config)).pipe(
    Layer.provide(Layer.merge(RateLimiterLive, ZendeskAuth.layer(config))),
  );

export const layerConfig = (
  config: Config.Wrap<ZendeskConfig>,
): Layer.Layer<ZendeskClient, Config.ConfigError, HttpClient.HttpClient> =>
  Layer.unwrap(Config.unwrap(config).pipe(Effect.map(layer)));

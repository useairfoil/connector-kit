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
import { HttpClient, HttpClientRequest, HttpClientResponse, type UrlParams } from "effect/http";
import { RateLimiter } from "effect/persistence";

import { type IncidentIoConnectionConfig, manifest } from "../manifest";

const baseUrl = "https://api.incident.io";

const maxRetries = 5;
const retryBaseDelay = Duration.seconds(1);
const requestTimeout = Duration.minutes(2);
const keyLimit = 1200;
// Listing incidents has its own, much lower limit.
const incidentsLimit = 60;

export type IncidentIoClientService = {
  readonly get: <A>(
    schema: Schema.Decoder<A>,
    path: string,
    params?: UrlParams.Input,
  ) => Effect.Effect<A, ConnectorError>;
  /** Like `get`, but a `404` gives `None`. */
  readonly find: <A>(
    schema: Schema.Decoder<A>,
    path: string,
    params?: UrlParams.Input,
  ) => Effect.Effect<Option.Option<A>, ConnectorError>;
};

export class IncidentIoClient extends Context.Service<IncidentIoClient, IncidentIoClientService>()(
  "@useairfoil/producer-incident-io/IncidentIoClient",
) {}

const ErrorBodySchema = Schema.Struct({
  type: Schema.optional(Schema.String),
  errors: Schema.optional(Schema.Array(Schema.Struct({ message: Schema.String }))),
});

const statusError = (response: HttpClientResponse.HttpClientResponse, path: string) =>
  HttpClientResponse.schemaBodyJson(ErrorBodySchema)(response).pipe(
    Effect.map((body) => body.errors?.[0]?.message ?? body.type),
    Effect.orElseSucceed(() => undefined),
    Effect.flatMap((detail) =>
      Effect.fail(
        new ConnectorError({
          message: `incident.io API returned ${response.status} for ${path}${detail ? `: ${detail}` : ""}`,
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

export const make = Effect.fnUntraced(function* (config: IncidentIoConnectionConfig) {
  const limiter = yield* RateLimiter.RateLimiter;
  const base = (yield* HttpClient.HttpClient).pipe(
    HttpClient.mapRequest(HttpClientRequest.prependUrl(baseUrl)),
    HttpClient.mapRequest(HttpClientRequest.acceptJson),
    HttpClient.mapRequest(HttpClientRequest.bearerToken(Redacted.value(config.apiKey))),
    // Rate limit waits don't count towards the attempt's timeout.
    HttpClient.transform((effect) => Effect.timeout(effect, requestTimeout)),
  );
  const limit = (key: string, limit: number) =>
    HttpClient.withRateLimiter({
      limiter,
      key,
      limit,
      window: "1 minute",
      algorithm: "token-bucket",
      // `retryTransient` retries `429`, with a cap and a metric.
      times: 0,
      // `X-RateLimit-Limit` lists several limits, such as `60, 1200;window=60`.
      disableResponseInspection: true,
    });
  const keyLimited = base.pipe(limit("incident-io", keyLimit));
  const client = keyLimited.pipe(HttpClient.retryTransient({ schedule: retrySchedule }));
  // The incidents list also counts towards the key's limit.
  const incidentsClient = keyLimited.pipe(
    limit("incident-io-incidents", incidentsLimit),
    HttpClient.retryTransient({ schedule: retrySchedule }),
  );
  const clientFor = (path: string) => (path === "/v2/incidents" ? incidentsClient : client);

  const send = (path: string, params: UrlParams.Input) =>
    clientFor(path)
      .execute(HttpClientRequest.get(path).pipe(HttpClientRequest.setUrlParams(params)))
      .pipe(
        Effect.catchTag(["HttpClientError", "RateLimiterError", "TimeoutError"], (error) =>
          Telemetry.annotateError("api_http", error).pipe(
            Effect.andThen(
              Effect.fail(
                new ConnectorError({
                  message: `incident.io API request ${error._tag === "TimeoutError" ? "timed out" : "failed"} for ${path}`,
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
                  ? `incident.io API response for ${path} does not match the schema`
                  : `incident.io API returned invalid JSON for ${path}`,
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

  const get = <A>(schema: Schema.Decoder<A>, path: string, params: UrlParams.Input = {}) =>
    send(path, params).pipe(
      Effect.flatMap((response) => decode(schema, response, path)),
      traced(path),
    );

  const find = <A>(schema: Schema.Decoder<A>, path: string, params: UrlParams.Input = {}) =>
    send(path, params).pipe(
      Effect.flatMap((response) =>
        response.status === 404
          ? Effect.succeedNone
          : decode(schema, response, path).pipe(Effect.map(Option.some)),
      ),
      traced(path),
    );

  return IncidentIoClient.of({ get, find });
});

const RateLimiterLive = RateLimiter.layer.pipe(Layer.provide(RateLimiter.layerStoreMemory));

export const layer = (
  config: IncidentIoConnectionConfig,
): Layer.Layer<IncidentIoClient, never, HttpClient.HttpClient> =>
  Layer.effect(IncidentIoClient)(make(config)).pipe(Layer.provide(RateLimiterLive));

export const layerConfig = (
  config: Config.Wrap<IncidentIoConnectionConfig>,
): Layer.Layer<IncidentIoClient, Config.ConfigError, HttpClient.HttpClient> =>
  Layer.unwrap(Config.unwrap(config).pipe(Effect.map(layer)));

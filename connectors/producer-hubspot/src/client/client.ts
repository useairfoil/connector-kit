import { ConnectorError, Metrics, Telemetry } from "@useairfoil/connector-kit";
import { Config, Context, DateTime, Duration, Effect, Layer, Redacted, Schema } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";
import { RateLimiter } from "effect/persistence";

import { type HubSpotConnectionConfig, manifest } from "../manifest";

// Keep this version aligned with the resource schemas.
export const HUBSPOT_API_VERSION = "2026-09";

const baseUrl = "https://api.hubapi.com";
const maxRetries = 5;
// HubSpot's burst limit is per 10 seconds, so retries start at a second.
const retryBaseDelay = Duration.seconds(1);
const requestTimeout = Duration.minutes(2);
// Search allows 5 requests per second per account. One every 250 ms keeps it at
// 4, with no burst.
const searchInterval = "250 millis";
// Other calls allow 100 per 10 seconds on the lowest tier. The limiter learns
// the account's real limit from `X-HubSpot-RateLimit-Max`.
const burstLimit = 100;

export type HubSpotResponse<A> = {
  readonly body: A;
  /** When the response arrived. Used as the row version. */
  readonly fetchedAt: Date;
};

export type HubSpotClientService = {
  readonly get: <A>(
    schema: Schema.Decoder<A>,
    path: string,
    params?: Readonly<Record<string, string>>,
  ) => Effect.Effect<HubSpotResponse<A>, ConnectorError>;
  /** Search paths use the stricter search limit. */
  readonly post: <A>(
    schema: Schema.Decoder<A>,
    path: string,
    body: unknown,
  ) => Effect.Effect<HubSpotResponse<A>, ConnectorError>;
};

export class HubSpotClient extends Context.Service<HubSpotClient, HubSpotClientService>()(
  "@useairfoil/producer-hubspot/HubSpotClient",
) {}

const ErrorBodySchema = Schema.Struct({
  message: Schema.optional(Schema.String),
});

/** HubSpot puts the reason in the body, for example a missing scope. */
const statusError = (response: HttpClientResponse.HttpClientResponse, path: string) =>
  HttpClientResponse.schemaBodyJson(ErrorBodySchema)(response).pipe(
    Effect.map((body) => body.message),
    Effect.orElseSucceed(() => undefined),
    Effect.flatMap((detail) =>
      Effect.fail(
        new ConnectorError({
          message: `HubSpot API returned ${response.status} for ${path}${detail ? `: ${detail}` : ""}`,
        }),
      ),
    ),
    Effect.tapError((error) => Telemetry.annotateError("api_status", error)),
  );

const isSearch = (path: string) => path.endsWith("/search");

export const make = Effect.fnUntraced(function* (config: HubSpotConnectionConfig) {
  const limiter = yield* RateLimiter.RateLimiter;
  const retrySchedule = Metrics.retrySchedule({
    connector: manifest.name,
    baseDelay: retryBaseDelay,
    times: maxRetries,
  });
  const base = (yield* HttpClient.HttpClient).pipe(
    HttpClient.mapRequest(HttpClientRequest.prependUrl(baseUrl)),
    HttpClient.mapRequest(HttpClientRequest.bearerToken(Redacted.value(config.accessToken))),
    HttpClient.mapRequest(HttpClientRequest.acceptJson),
  );
  const client = base.pipe(
    HttpClient.withRateLimiter({
      limiter,
      key: "hubspot",
      limit: burstLimit,
      window: "10 seconds",
      algorithm: "token-bucket",
      // `retryTransient` retries `429`, with a cap and a metric.
      times: 0,
      responseHeaders: { limit: "x-hubspot-ratelimit-max" },
    }),
    HttpClient.retryTransient({ schedule: retrySchedule }),
  );
  const searchClient = base.pipe(
    HttpClient.withRateLimiter({
      limiter,
      key: "hubspot-search",
      limit: 1,
      window: searchInterval,
      algorithm: "token-bucket",
      times: 0,
    }),
    HttpClient.retryTransient({ schedule: retrySchedule }),
  );

  const execute = <A>(
    schema: Schema.Decoder<A>,
    request: HttpClientRequest.HttpClientRequest,
    path: string,
  ): Effect.Effect<HubSpotResponse<A>, ConnectorError> =>
    Effect.gen(function* () {
      const response = yield* (isSearch(path) ? searchClient : client).execute(request).pipe(
        Effect.tapError((error) => Telemetry.annotateError("api_http", error)),
        Effect.mapError(
          (error) =>
            new ConnectorError({ message: `HubSpot API request failed for ${path}`, cause: error }),
        ),
      );
      // After rate-limit waits and retries, so the version matches the data.
      const fetchedAt = yield* DateTime.nowAsDate;
      if (response.status < 200 || response.status >= 300) {
        return yield* statusError(response, path);
      }
      const body = yield* HttpClientResponse.schemaBodyJson(schema)(response).pipe(
        Effect.tapError((error) => Telemetry.annotateError("api_decode", error)),
        Effect.mapError(
          (error) =>
            new ConnectorError({
              message: `Could not decode HubSpot API response for ${path}`,
              cause: error,
            }),
        ),
      );
      return { body, fetchedAt };
    }).pipe(
      Effect.timeoutOrElse({
        duration: requestTimeout,
        orElse: () =>
          Effect.fail(new ConnectorError({ message: `HubSpot API request timed out for ${path}` })),
      }),
      Effect.withSpan(Telemetry.SpanName.apiFetch, {
        kind: "client",
        attributes: {
          [Telemetry.Attr.apiPath]: path,
          "hubspot.api.version": HUBSPOT_API_VERSION,
        },
      }),
    );

  const get = <A>(
    schema: Schema.Decoder<A>,
    path: string,
    params: Readonly<Record<string, string>> = {},
  ) =>
    execute(schema, HttpClientRequest.get(path).pipe(HttpClientRequest.setUrlParams(params)), path);

  const post = <A>(schema: Schema.Decoder<A>, path: string, body: unknown) =>
    execute(
      schema,
      HttpClientRequest.post(path).pipe(HttpClientRequest.bodyJsonUnsafe(body)),
      path,
    );

  return HubSpotClient.of({ get, post });
});

// Each process runs one connector, so the rate limit can stay in memory.
const RateLimiterLive = RateLimiter.layer.pipe(Layer.provide(RateLimiter.layerStoreMemory));

export const layer = (
  config: HubSpotConnectionConfig,
): Layer.Layer<HubSpotClient, never, HttpClient.HttpClient> =>
  Layer.effect(HubSpotClient)(make(config)).pipe(Layer.provide(RateLimiterLive));

export const layerConfig = (
  config: Config.Wrap<HubSpotConnectionConfig>,
): Layer.Layer<HubSpotClient, Config.ConfigError, HttpClient.HttpClient> =>
  Layer.effect(HubSpotClient)(Config.unwrap(config).pipe(Effect.flatMap(make))).pipe(
    Layer.provide(RateLimiterLive),
  );

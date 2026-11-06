import { ConnectorError, Metrics, Telemetry } from "@useairfoil/connector-kit";
import { Config, Context, Duration, Effect, Layer, Option, Schema } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";
import { RateLimiter } from "effect/persistence";

import { manifest, type PolarConnectionConfig } from "./manifest";
import { type ListResponse, makeListResponseSchema } from "./resources/shared";

export type PolarApiClientService = {
  readonly fetchJson: <A>(
    schema: Schema.Decoder<A>,
    path: string,
    params?: Record<string, string>,
  ) => Effect.Effect<A, ConnectorError>;
  readonly fetchList: <A>(
    schema: Schema.Decoder<A>,
    path: string,
    options: {
      readonly page: number;
      readonly limit: number;
      readonly sorting: string;
    },
  ) => Effect.Effect<ListResponse<A>, ConnectorError>;
};

export class PolarApiClient extends Context.Service<PolarApiClient, PolarApiClientService>()(
  "@useairfoil/producer-polar/PolarApiClient",
) {}

// Keep this version aligned with the REST and webhook schemas.
export const POLAR_API_VERSION = "2026-10";

const maxRetries = 5;
const retryBaseDelay = Duration.millis(200);
// Retries can wait, so every request needs a timeout.
const requestTimeout = Duration.minutes(2);

// Polar allows 500 requests per minute in production and 100 in sandbox.
const isSandbox = (apiBaseUrl: string): boolean =>
  new URL(apiBaseUrl).hostname === "sandbox-api.polar.sh";

// Polar puts the reason in `detail`, or the error name in `error`.
const ErrorBodySchema = Schema.Struct({
  error: Schema.optional(Schema.String),
  detail: Schema.optional(Schema.Unknown),
});

const statusError = (response: HttpClientResponse.HttpClientResponse, path: string) =>
  HttpClientResponse.schemaBodyJson(ErrorBodySchema)(response).pipe(
    Effect.map((body) => (typeof body.detail === "string" ? body.detail : body.error)),
    Effect.orElseSucceed(() => undefined),
    Effect.flatMap((detail) =>
      Effect.fail(
        new ConnectorError({
          message: `Polar API returned ${response.status} for ${path}${detail ? `: ${detail}` : ""}`,
        }),
      ),
    ),
    Effect.tapError((error) => Telemetry.annotateError("api_status", error)),
  );

export const make = Effect.fnUntraced(function* (config: PolarConnectionConfig) {
  const limiter = yield* RateLimiter.RateLimiter;
  const retrySchedule = Metrics.retrySchedule({
    connector: manifest.name,
    baseDelay: retryBaseDelay,
    times: maxRetries,
  });
  const client = (yield* HttpClient.HttpClient).pipe(
    HttpClient.mapRequest(HttpClientRequest.prependUrl(config.apiBaseUrl)),
    HttpClient.mapRequest(HttpClientRequest.bearerToken(config.accessToken)),
    HttpClient.mapRequest(HttpClientRequest.acceptJson),
    HttpClient.mapRequest(HttpClientRequest.setHeader("Polar-Version", POLAR_API_VERSION)),
    HttpClient.withRateLimiter({
      limiter,
      key: "polar",
      limit: isSandbox(config.apiBaseUrl) ? 100 : 500,
      window: "1 minute",
      algorithm: "token-bucket",
      // `retryTransient` retries `429`, with a cap and a metric.
      times: 0,
    }),
    HttpClient.retryTransient({
      schedule: retrySchedule,
    }),
  );

  const fetchJson = <A>(
    schema: Schema.Decoder<A>,
    path: string,
    params: Record<string, string> = {},
  ): Effect.Effect<A, ConnectorError> =>
    client.execute(HttpClientRequest.get(path).pipe(HttpClientRequest.setUrlParams(params))).pipe(
      Effect.tapError((error) => Telemetry.annotateError("api_http", error)),
      Effect.mapError(
        (error) =>
          new ConnectorError({ message: `Polar API request failed for ${path}`, cause: error }),
      ),
      Effect.flatMap((response) =>
        HttpClientResponse.matchStatus(response, {
          "2xx": (ok) =>
            HttpClientResponse.schemaBodyJson(schema)(ok).pipe(
              Effect.tapError((error) => Telemetry.annotateError("api_decode", error)),
              Effect.mapError(
                (error) =>
                  new ConnectorError({
                    message: Schema.isSchemaError(error)
                      ? `Polar API response for ${path} does not match the schema`
                      : `Polar API returned invalid JSON for ${path}`,
                    cause: error,
                  }),
              ),
            ),
          orElse: (other) => statusError(other, path),
        }),
      ),
      Effect.timeoutOrElse({
        duration: requestTimeout,
        orElse: () =>
          Effect.fail(new ConnectorError({ message: `Polar API request timed out for ${path}` })),
      }),
      Effect.withSpan(Telemetry.SpanName.apiFetch, {
        kind: "client",
        attributes: {
          [Telemetry.Attr.apiPath]: path,
          "polar.api.version": POLAR_API_VERSION,
        },
      }),
    );

  const fetchList = <A>(
    schema: Schema.Decoder<A>,
    path: string,
    options: {
      readonly page: number;
      readonly limit: number;
      readonly sorting: string;
    },
  ): Effect.Effect<ListResponse<A>, ConnectorError> =>
    fetchJson(makeListResponseSchema(schema), path, {
      page: String(options.page),
      limit: String(options.limit),
      sorting: options.sorting,
      ...Option.match(config.organizationId, {
        onNone: () => ({}),
        onSome: (organizationId) => ({ organization_id: organizationId }),
      }),
    });

  return { fetchJson, fetchList };
});

// Each process runs one connector, so the rate limit can stay in memory.
const RateLimiterLive = RateLimiter.layer.pipe(Layer.provide(RateLimiter.layerStoreMemory));

export const layer = (
  config: PolarConnectionConfig,
): Layer.Layer<PolarApiClient, never, HttpClient.HttpClient> =>
  Layer.effect(PolarApiClient)(make(config)).pipe(Layer.provide(RateLimiterLive));

export const layerConfig = (
  config: Config.Wrap<PolarConnectionConfig>,
): Layer.Layer<PolarApiClient, Config.ConfigError, HttpClient.HttpClient> =>
  Layer.effect(PolarApiClient)(Config.unwrap(config).pipe(Effect.flatMap(make))).pipe(
    Layer.provide(RateLimiterLive),
  );

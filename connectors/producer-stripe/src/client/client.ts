import { ConnectorError, Metrics, Telemetry } from "@useairfoil/connector-kit";
import { Config, Context, DateTime, Duration, Effect, Layer, Option, Schema } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";
import { RateLimiter } from "effect/persistence";

import { manifest, type StripeConnectionConfig } from "../manifest";

// Keep this version aligned with the resource schemas.
export const STRIPE_API_VERSION = "2026-09-30.endive";

const baseUrl = "https://api.stripe.com/v1/";
const maxRetries = 5;
const retryBaseDelay = Duration.millis(250);
// Retries can wait, so every request needs a timeout.
const requestTimeout = Duration.minutes(2);

export type StripeListPage<A> = {
  readonly items: ReadonlyArray<A>;
  readonly hasMore: boolean;
  /** When the response arrived. Used as the row version. */
  readonly fetchedAt: Date;
};

export type StripeObject<A> = {
  readonly item: A;
  /** When the response arrived. Used as the row version. */
  readonly fetchedAt: Date;
};

/** Repeated keys are allowed, for example `types[]`. */
export type StripeParams = ReadonlyArray<readonly [string, string]>;

export type StripeClientService = {
  readonly list: <A>(
    schema: Schema.Decoder<A>,
    path: string,
    params: StripeParams,
  ) => Effect.Effect<StripeListPage<A>, ConnectorError>;
  /** Gets one object, or none when Stripe returns `404`. */
  readonly retrieve: <A>(
    schema: Schema.Decoder<A>,
    path: string,
  ) => Effect.Effect<Option.Option<StripeObject<A>>, ConnectorError>;
};

export class StripeClient extends Context.Service<StripeClient, StripeClientService>()(
  "@useairfoil/producer-stripe/StripeClient",
) {}

const StripeErrorSchema = Schema.Struct({
  error: Schema.Struct({
    message: Schema.optional(Schema.String),
    type: Schema.optional(Schema.String),
    code: Schema.optional(Schema.String),
  }),
});

const makeListSchema = <A>(item: Schema.Decoder<A>) =>
  Schema.Struct({
    data: Schema.Array(item),
    has_more: Schema.Boolean,
  });

/** Stripe puts the reason in the body, for example a missing key permission. */
const statusError = (response: HttpClientResponse.HttpClientResponse, path: string) =>
  HttpClientResponse.schemaBodyJson(StripeErrorSchema)(response).pipe(
    Effect.map((body) => body.error.message),
    Effect.orElseSucceed(() => undefined),
    Effect.flatMap((detail) =>
      Effect.fail(
        new ConnectorError({
          message: `Stripe API returned ${response.status} for ${path}${detail ? `: ${detail}` : ""}`,
        }),
      ),
    ),
    Effect.tapError((error) => Telemetry.annotateError("api_status", error)),
  );

export const make = Effect.fnUntraced(function* (config: StripeConnectionConfig) {
  const limiter = yield* RateLimiter.RateLimiter;
  const retrySchedule = Metrics.retrySchedule({
    connector: manifest.name,
    baseDelay: retryBaseDelay,
    times: maxRetries,
  });
  const client = (yield* HttpClient.HttpClient).pipe(
    HttpClient.mapRequest(HttpClientRequest.prependUrl(baseUrl)),
    HttpClient.mapRequest(HttpClientRequest.bearerToken(config.apiKey)),
    HttpClient.mapRequest(HttpClientRequest.acceptJson),
    HttpClient.mapRequest(HttpClientRequest.setHeader("Stripe-Version", STRIPE_API_VERSION)),
    HttpClient.withRateLimiter({
      limiter,
      key: "stripe",
      limit: config.rateLimitPerSecond,
      window: "1 second",
      algorithm: "token-bucket",
      // `retryTransient` retries `429`, with a cap and a metric.
      times: 0,
    }),
    HttpClient.retryTransient({ schedule: retrySchedule }),
  );

  const decode = <A>(
    schema: Schema.Decoder<A>,
    response: HttpClientResponse.HttpClientResponse,
    path: string,
  ) =>
    HttpClientResponse.schemaBodyJson(schema)(response).pipe(
      Effect.tapError((error) => Telemetry.annotateError("api_decode", error)),
      Effect.mapError(
        (error) =>
          new ConnectorError({
            message: `Could not decode Stripe response for ${path}`,
            cause: error,
          }),
      ),
    );

  const get = <B>(
    path: string,
    params: StripeParams,
    handle: (
      response: HttpClientResponse.HttpClientResponse,
      fetchedAt: Date,
    ) => Effect.Effect<B, ConnectorError>,
  ): Effect.Effect<B, ConnectorError> =>
    Effect.gen(function* () {
      const request = HttpClientRequest.get(path).pipe(HttpClientRequest.setUrlParams(params));
      const response = yield* client.execute(request).pipe(
        Effect.tapError((error) => Telemetry.annotateError("api_http", error)),
        Effect.mapError(
          (error) =>
            new ConnectorError({ message: `Stripe API request failed for ${path}`, cause: error }),
        ),
      );
      // After rate-limit waits and retries, so the version matches the data.
      const fetchedAt = yield* DateTime.nowAsDate;
      return yield* handle(response, fetchedAt);
    }).pipe(
      Effect.timeoutOrElse({
        duration: requestTimeout,
        orElse: () =>
          Effect.fail(new ConnectorError({ message: `Stripe API request timed out for ${path}` })),
      }),
      Effect.withSpan(Telemetry.SpanName.apiFetch, {
        kind: "client",
        attributes: {
          [Telemetry.Attr.apiPath]: path,
          "stripe.api.version": STRIPE_API_VERSION,
        },
      }),
    );

  const list = <A>(schema: Schema.Decoder<A>, path: string, params: StripeParams) =>
    get(path, params, (response, fetchedAt) =>
      HttpClientResponse.matchStatus(response, {
        "2xx": (ok) =>
          decode(makeListSchema(schema), ok, path).pipe(
            Effect.map((body) => ({ items: body.data, hasMore: body.has_more, fetchedAt })),
          ),
        orElse: (other) => statusError(other, path),
      }),
    );

  const retrieve = <A>(schema: Schema.Decoder<A>, path: string) =>
    get(path, [], (response, fetchedAt) =>
      HttpClientResponse.matchStatus(response, {
        "2xx": (ok) =>
          decode(schema, ok, path).pipe(Effect.map((item) => Option.some({ item, fetchedAt }))),
        404: () => Effect.succeedNone,
        orElse: (other) => statusError(other, path),
      }),
    );

  return StripeClient.of({ list, retrieve });
});

// Each process runs one connector, so the rate limit can stay in memory.
const RateLimiterLive = RateLimiter.layer.pipe(Layer.provide(RateLimiter.layerStoreMemory));

export const layer = (
  config: StripeConnectionConfig,
): Layer.Layer<StripeClient, never, HttpClient.HttpClient> =>
  Layer.effect(StripeClient)(make(config)).pipe(Layer.provide(RateLimiterLive));

export const layerConfig = (
  config: Config.Wrap<StripeConnectionConfig>,
): Layer.Layer<StripeClient, Config.ConfigError, HttpClient.HttpClient> =>
  Layer.effect(StripeClient)(Config.unwrap(config).pipe(Effect.flatMap(make))).pipe(
    Layer.provide(RateLimiterLive),
  );

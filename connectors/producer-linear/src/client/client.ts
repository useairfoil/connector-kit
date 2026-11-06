import { ConnectorError, Metrics, Telemetry } from "@useairfoil/connector-kit";
import {
  Config,
  Context,
  Data,
  Duration,
  Effect,
  Layer,
  Option,
  Redacted,
  Schedule,
  Schema,
} from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

import { type LinearConnectionConfig, manifest } from "../manifest";

const endpoint = "https://api.linear.app/graphql";
const maxRetries = 5;
const retryBaseDelay = Duration.seconds(1);
const requestTimeout = Duration.minutes(2);
// Keep retrying rate limits; a failed source stays stopped until restart.
const limitRetry = Schedule.min([Schedule.exponential("1 minute"), Schedule.spaced("10 minutes")]);

type Variables = Readonly<Record<string, unknown>>;

export type LinearClientService = {
  readonly query: <A>(
    schema: Schema.Decoder<A>,
    document: string,
    variables?: Variables,
  ) => Effect.Effect<A, ConnectorError>;
  /** Like `query`, but "Entity not found" gives `None`. */
  readonly find: <A>(
    schema: Schema.Decoder<A>,
    document: string,
    variables?: Variables,
  ) => Effect.Effect<Option.Option<A>, ConnectorError>;
};

export class LinearClient extends Context.Service<LinearClient, LinearClientService>()(
  "@useairfoil/producer-linear/LinearClient",
) {}

const ResponseSchema = Schema.Struct({
  data: Schema.optional(Schema.Unknown),
  errors: Schema.optional(
    Schema.Array(
      Schema.Struct({
        message: Schema.String,
        extensions: Schema.optional(Schema.Struct({ code: Schema.optional(Schema.String) })),
      }),
    ),
  ),
});

class RateLimited extends Data.TaggedError("RateLimited")<{ readonly message: string }> {}

const isNotFound = (message: string) => message.startsWith("Entity not found");

const operationName = (document: string) => /^\s*query\s+(\w+)/.exec(document)?.[1] ?? "query";

export const make = Effect.fnUntraced(function* (config: LinearConnectionConfig) {
  const client = (yield* HttpClient.HttpClient).pipe(
    HttpClient.mapRequest((request) =>
      request.pipe(
        HttpClientRequest.acceptJson,
        // Personal API keys go in the header as they are, without `Bearer`.
        HttpClientRequest.setHeader("Authorization", Redacted.value(config.apiKey)),
      ),
    ),
    HttpClient.retryTransient({
      schedule: Metrics.retrySchedule({
        connector: manifest.name,
        baseDelay: retryBaseDelay,
        times: maxRetries,
      }),
    }),
  );

  const execute = <A>(
    schema: Schema.Decoder<A>,
    document: string,
    variables: Variables = {},
  ): Effect.Effect<Option.Option<A>, ConnectorError> => {
    const operation = operationName(document);
    return Effect.gen(function* () {
      const response = yield* client
        .execute(
          HttpClientRequest.post(endpoint).pipe(
            HttpClientRequest.bodyJsonUnsafe({ query: document, variables }),
          ),
        )
        .pipe(
          Effect.tapError((error) => Telemetry.annotateError("api_http", error)),
          Effect.mapError(
            (error) =>
              new ConnectorError({
                message: `Linear API request failed for ${operation}`,
                cause: error,
              }),
          ),
        );
      // GraphQL errors come with 200 or 400, so read the body first.
      const body = yield* HttpClientResponse.schemaBodyJson(ResponseSchema)(response).pipe(
        Effect.tapError((error) => Telemetry.annotateError("api_status", error)),
        Effect.mapError(
          (error) =>
            new ConnectorError({
              message: `Linear API returned ${response.status} for ${operation}`,
              cause: error,
            }),
        ),
      );
      const errors = body.errors ?? [];
      if (errors.some((error) => error.extensions?.code === "RATELIMITED")) {
        return yield* new RateLimited({ message: `Linear rate limit reached for ${operation}` });
      }
      if (response.status === 401) {
        return yield* new ConnectorError({ message: "Linear rejected the API key" });
      }
      if (errors.length > 0 && errors.every((error) => isNotFound(error.message))) {
        return Option.none();
      }
      const [first] = errors;
      if (first !== undefined || response.status < 200 || response.status >= 300) {
        const error = new ConnectorError({
          message: `Linear API returned ${response.status} for ${operation}${first ? `: ${first.message}` : ""}`,
          cause: errors,
        });
        yield* Telemetry.annotateError("api_graphql", error);
        return yield* error;
      }
      return Option.some(
        yield* Schema.decodeUnknownEffect(schema)(body.data).pipe(
          Effect.tapError((error) => Telemetry.annotateError("api_decode", error)),
          Effect.mapError(
            (error) =>
              new ConnectorError({
                message: `Linear API response for ${operation} does not match the schema`,
                cause: error,
              }),
          ),
        ),
      );
    }).pipe(
      Effect.timeoutOrElse({
        duration: requestTimeout,
        orElse: () =>
          Effect.fail(
            new ConnectorError({ message: `Linear API request timed out for ${operation}` }),
          ),
      }),
      Effect.retry({
        schedule: limitRetry.pipe(
          Schedule.tap(({ duration }) =>
            Effect.logWarning("Linear rate limit reached, waiting to try again").pipe(
              Effect.annotateLogs({ operation, waitMillis: Duration.toMillis(duration) }),
            ),
          ),
        ),
        while: (error) => error._tag === "RateLimited",
      }),
      Effect.catchTag("RateLimited", (error) =>
        Effect.fail(new ConnectorError({ message: error.message })),
      ),
      Effect.withSpan(Telemetry.SpanName.apiFetch, {
        kind: "client",
        attributes: { [Telemetry.Attr.apiPath]: `graphql:${operation}` },
      }),
    );
  };

  const query = <A>(schema: Schema.Decoder<A>, document: string, variables?: Variables) =>
    execute(schema, document, variables).pipe(
      Effect.flatMap(
        Option.match({
          onNone: () =>
            Effect.fail(
              new ConnectorError({
                message: `Linear API found nothing for ${operationName(document)}`,
              }),
            ),
          onSome: Effect.succeed,
        }),
      ),
    );

  return LinearClient.of({ query, find: execute });
});

export const layer = (
  config: LinearConnectionConfig,
): Layer.Layer<LinearClient, never, HttpClient.HttpClient> =>
  Layer.effect(LinearClient)(make(config));

export const layerConfig = (
  config: Config.Wrap<LinearConnectionConfig>,
): Layer.Layer<LinearClient, Config.ConfigError, HttpClient.HttpClient> =>
  Layer.unwrap(Config.unwrap(config).pipe(Effect.map(layer)));

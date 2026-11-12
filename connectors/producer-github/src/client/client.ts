import { ConnectorError, Metrics, Telemetry } from "@useairfoil/connector-kit";
import { Config, Context, Duration, Effect, Layer, Option, Schedule, Schema } from "effect";
import { HttpClient, HttpClientError, HttpClientRequest, HttpClientResponse } from "effect/http";

import { type GitHubConnectionConfig, manifest } from "../manifest";
import * as GitHubAuth from "./auth";
import { GITHUB_API_VERSION, baseUrl } from "./constants";

const maxRetries = 5;
const retryBaseDelay = Duration.millis(500);
const requestTimeout = Duration.minutes(2);

export type GitHubPage<A> = {
  readonly body: A;
  readonly next: Option.Option<string>;
};

export type GitHubClientService = {
  /** GETs a path such as `/repos/o/r/issues?state=all`, or a `next` URL. */
  readonly get: <A>(
    schema: Schema.Decoder<A>,
    url: string,
  ) => Effect.Effect<GitHubPage<A>, ConnectorError>;
};

export class GitHubClient extends Context.Service<GitHubClient, GitHubClientService>()(
  "@useairfoil/producer-github/GitHubClient",
) {}

export const withParams = (path: string, params: Readonly<Record<string, string>>): string =>
  `${path}?${new URLSearchParams(params).toString()}`;

export const nextLink = (header: string | undefined): Option.Option<string> =>
  Option.fromNullishOr(/<([^>]+)>;\s*rel="next"/.exec(header ?? "")?.[1]);

const ErrorBodySchema = Schema.Struct({ message: Schema.optional(Schema.String) });

const statusError = (response: HttpClientResponse.HttpClientResponse, path: string) =>
  HttpClientResponse.schemaBodyJson(ErrorBodySchema)(response).pipe(
    Effect.map((body) => body.message),
    Effect.orElseSucceed(() => undefined),
    Effect.flatMap((detail) =>
      Effect.fail(
        new ConnectorError({
          message: `GitHub API returned ${response.status} for ${path}${detail ? `: ${detail}` : ""}`,
        }),
      ),
    ),
    Effect.tapError((error) => Telemetry.annotateError("api_status", error)),
  );

/**
 * GitHub answers rate limits with `403` or `429`. A `403` is a rate limit when
 * it has `retry-after`, `x-ratelimit-remaining: 0`, or a rate limit message;
 * otherwise it's a permission error.
 */
const isRateLimited = (response: HttpClientResponse.HttpClientResponse, body: string) =>
  response.status === 429 ||
  (response.status === 403 &&
    (response.headers["retry-after"] !== undefined ||
      response.headers["x-ratelimit-remaining"] === "0" ||
      /rate limit/i.test(body)));

// Rate limits fail with a status error, so `retryTransient` retries a `403` too.
const rateLimitedResponse = (input: unknown) =>
  HttpClientError.isHttpClientError(input) && input.reason._tag === "StatusCodeError"
    ? input.reason.response
    : undefined;

const retrySchedule = Metrics.retrySchedule({
  connector: manifest.name,
  baseDelay: retryBaseDelay,
  times: maxRetries,
}).pipe(
  Schedule.modifyDelay(({ input, duration, now, attempt }) => {
    const response = rateLimitedResponse(input);
    if (response === undefined) return Effect.succeed(duration);
    const retryAfter = response.headers["retry-after"];
    if (retryAfter !== undefined) return Effect.succeed(Duration.seconds(Number(retryAfter)));
    if (response.headers["x-ratelimit-remaining"] === "0") {
      // The reset is in whole seconds and our clock can differ, so wait a second more.
      return Effect.succeed(
        Duration.millis(
          Math.max(Number(response.headers["x-ratelimit-reset"]) * 1000 - now, 0) + 1000,
        ),
      );
    }
    // With neither header, GitHub says to wait at least a minute, then longer.
    return Effect.succeed(Duration.minutes(2 ** (attempt - 1)));
  }),
);

export const make = Effect.fnUntraced(function* () {
  const auth = yield* GitHubAuth.GitHubAuth;
  const client = (yield* HttpClient.HttpClient).pipe(
    HttpClient.mapRequest((request) =>
      request.pipe(
        HttpClientRequest.acceptJson,
        HttpClientRequest.setHeader("X-GitHub-Api-Version", GITHUB_API_VERSION),
      ),
    ),
    HttpClient.mapRequestEffect((request) =>
      auth.get.pipe(Effect.map((token) => HttpClientRequest.bearerToken(request, token))),
    ),
    HttpClient.transformResponse(
      Effect.flatMap((response) =>
        // Reads the body inside the timeout. The response caches it for decoding.
        Effect.flatMap(response.text, (body) =>
          isRateLimited(response, body)
            ? Effect.fail(
                new HttpClientError.HttpClientError({
                  reason: new HttpClientError.StatusCodeError({
                    request: response.request,
                    response,
                  }),
                }),
              )
            : Effect.succeed(response),
        ),
      ),
    ),
    // Rate-limit waits don't count towards the attempt's timeout.
    HttpClient.transform((effect) => Effect.timeout(effect, requestTimeout)),
    HttpClient.retryTransient({
      schedule: retrySchedule,
      while: (error) => rateLimitedResponse(error) !== undefined,
    }),
  );

  const get = <A>(
    schema: Schema.Decoder<A>,
    url: string,
  ): Effect.Effect<GitHubPage<A>, ConnectorError> => {
    const fullUrl = url.startsWith("/") ? `${baseUrl}${url}` : url;
    // `next` URLs come from GitHub, but never send the token anywhere else.
    if (!fullUrl.startsWith(`${baseUrl}/`)) {
      return Effect.fail(new ConnectorError({ message: `Not a GitHub API URL: ${url}` }));
    }
    const path = fullUrl.slice(baseUrl.length).split("?")[0] ?? fullUrl;

    return client.execute(HttpClientRequest.get(fullUrl)).pipe(
      Effect.catchTag(["HttpClientError", "TimeoutError"], (error) => {
        // Out of retries: report the rate limit with GitHub's message, like any status.
        const response = rateLimitedResponse(error);
        if (response !== undefined) return Effect.succeed(response);
        return Telemetry.annotateError("api_http", error).pipe(
          Effect.andThen(
            Effect.fail(
              new ConnectorError({
                message: `GitHub API request ${error._tag === "TimeoutError" ? "timed out" : "failed"} for ${path}`,
                cause: error,
              }),
            ),
          ),
        );
      }),
      Effect.flatMap((response) =>
        HttpClientResponse.matchStatus(response, {
          "2xx": (ok) =>
            HttpClientResponse.schemaBodyJson(schema)(ok).pipe(
              Effect.tapError((error) => Telemetry.annotateError("api_decode", error)),
              Effect.mapError(
                (cause) =>
                  new ConnectorError({ message: `Invalid GitHub API response for ${path}`, cause }),
              ),
              Effect.map((body) => ({ body, next: nextLink(ok.headers.link) })),
            ),
          orElse: (failed) => statusError(failed, path),
        }),
      ),
      Effect.withSpan(Telemetry.SpanName.apiFetch, {
        kind: "client",
        attributes: {
          [Telemetry.Attr.apiPath]: path,
          "github.api.version": GITHUB_API_VERSION,
        },
      }),
    );
  };

  return GitHubClient.of({ get });
});

export const layer = (
  config: GitHubConnectionConfig,
): Layer.Layer<GitHubClient, never, HttpClient.HttpClient> =>
  Layer.effect(GitHubClient)(make()).pipe(Layer.provide(GitHubAuth.layer(config)));

export const layerConfig = (
  config: Config.Wrap<GitHubConnectionConfig>,
): Layer.Layer<GitHubClient, Config.ConfigError, HttpClient.HttpClient> =>
  Layer.unwrap(Config.unwrap(config).pipe(Effect.map(layer)));

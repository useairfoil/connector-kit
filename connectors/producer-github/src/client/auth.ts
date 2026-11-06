import { Auth, ConnectorError, Telemetry } from "@useairfoil/connector-kit";
import { Clock, Context, Duration, Effect, Layer, Redacted, Schedule, Schema } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";
import { createPrivateKey, sign } from "node:crypto";

import type { GitHubConnectionConfig } from "../manifest";

import { GITHUB_API_VERSION, baseUrl } from "./constants";

export type GitHubAuthService = Auth.TokenCache<ConnectorError>;

export class GitHubAuth extends Context.Service<GitHubAuth, GitHubAuthService>()(
  "@useairfoil/producer-github/GitHubAuth",
) {}

const TokenResponseSchema = Schema.Struct({
  token: Schema.String,
  expires_at: Schema.DateFromString,
});

const base64Url = (value: string | Buffer): string => Buffer.from(value).toString("base64url");

/**
 * Signs the app JWT with RS256. GitHub allows at most 10 minutes, and asks for
 * `iat` 60 seconds in the past to allow for clock drift.
 */
export const makeAppJwt = (options: {
  readonly clientId: string;
  readonly privateKey: string;
  readonly nowMillis: number;
}): Effect.Effect<string, ConnectorError> =>
  Effect.try({
    try: () => {
      const now = Math.floor(options.nowMillis / 1000);
      const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
      const claims = base64Url(
        JSON.stringify({ iat: now - 60, exp: now + 9 * 60, iss: options.clientId }),
      );
      const signingInput = `${header}.${claims}`;
      // Env files often keep the PEM on one line with escaped newlines.
      const key = createPrivateKey(options.privateKey.replace(/\\n/g, "\n"));
      return `${signingInput}.${base64Url(sign("sha256", Buffer.from(signingInput), key))}`;
    },
    catch: (cause) => new ConnectorError({ message: "Invalid GitHub App private key", cause }),
  });

export const make = Effect.fnUntraced(function* (config: GitHubConnectionConfig) {
  const client = (yield* HttpClient.HttpClient).pipe(
    HttpClient.retryTransient({
      schedule: Schedule.exponential("250 millis").pipe(Schedule.jittered),
      times: 3,
    }),
  );
  const path = `/app/installations/${config.installationId}/access_tokens`;

  return yield* Auth.makeTokenCache({
    acquire: Effect.gen(function* () {
      const jwt = yield* makeAppJwt({
        clientId: config.appClientId,
        privateKey: Redacted.value(config.appPrivateKey),
        nowMillis: yield* Clock.currentTimeMillis,
      });
      const request = HttpClientRequest.post(`${baseUrl}${path}`).pipe(
        HttpClientRequest.bearerToken(jwt),
        HttpClientRequest.acceptJson,
        HttpClientRequest.setHeader("X-GitHub-Api-Version", GITHUB_API_VERSION),
      );
      const response = yield* client
        .execute(request)
        .pipe(
          Effect.mapError(
            (cause) =>
              new ConnectorError({ message: "GitHub installation token request failed", cause }),
          ),
        );
      const body = yield* HttpClientResponse.matchStatus(response, {
        "2xx": (ok) =>
          HttpClientResponse.schemaBodyJson(TokenResponseSchema)(ok).pipe(
            Effect.mapError(
              (cause) =>
                new ConnectorError({
                  message: "Invalid GitHub installation token response",
                  cause,
                }),
            ),
          ),
        orElse: (failed) =>
          Effect.fail(
            new ConnectorError({
              message: `GitHub returned ${failed.status} for the installation token`,
            }),
          ),
      });
      const now = yield* Clock.currentTimeMillis;
      return {
        value: Redacted.make(body.token),
        expiresIn: Duration.millis(Math.max(body.expires_at.getTime() - now, 0)),
      };
    }).pipe(
      Effect.tapError((error) => Telemetry.annotateError("api_auth", error)),
      Effect.withSpan(Telemetry.SpanName.apiFetch, {
        kind: "client",
        attributes: { [Telemetry.Attr.apiPath]: path },
      }),
    ),
  });
});

export const layer = (
  config: GitHubConnectionConfig,
): Layer.Layer<GitHubAuth, never, HttpClient.HttpClient> => Layer.effect(GitHubAuth)(make(config));

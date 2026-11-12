import { Auth } from "@useairfoil/connector-kit";
import { Config, Context, Data, Duration, Effect, Layer, Redacted, Schema } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

import type { ShopifyConnectionConfig } from "../manifest";

export type ShopifyAuthErrorReason = "shop_not_permitted" | "invalid_client" | "exchange_failed";

export class ShopifyAuthError extends Data.TaggedError("ShopifyAuthError")<{
  readonly reason: ShopifyAuthErrorReason;
  readonly message: string;
}> {}

export type ShopifyAuthService = Auth.TokenCache<ShopifyAuthError>;

export class ShopifyAuth extends Context.Service<ShopifyAuth, ShopifyAuthService>()(
  "@useairfoil/producer-shopify/ShopifyAuth",
) {}

const TokenResponseSchema = Schema.Struct({
  access_token: Schema.String,
  expires_in: Schema.Number,
});

const ErrorResponseSchema = Schema.Struct({
  error: Schema.Literals(["shop_not_permitted", "invalid_client"]),
});

export const shopUrl = (shopDomain: string): string =>
  `https://${shopDomain.replace(/^https?:\/\//i, "").replace(/\/+$/g, "")}`;

const errorMessages: Record<ShopifyAuthErrorReason, string> = {
  shop_not_permitted: "The Shopify app and store must belong to the same Shopify organization",
  invalid_client: "The Shopify client ID or client secret is invalid",
  exchange_failed: "Shopify authentication failed",
};

const errorFor = (reason: ShopifyAuthErrorReason): ShopifyAuthError =>
  new ShopifyAuthError({ reason, message: errorMessages[reason] });

const decodeRejectedResponse = (
  response: HttpClientResponse.HttpClientResponse,
): Effect.Effect<ShopifyAuthErrorReason> =>
  HttpClientResponse.schemaBodyJson(ErrorResponseSchema)(response).pipe(
    Effect.map((body) => body.error),
    Effect.catch(() => Effect.succeed<ShopifyAuthErrorReason>("exchange_failed")),
  );

export const make = Effect.fnUntraced(function* (config: ShopifyConnectionConfig) {
  const client = yield* HttpClient.HttpClient;
  const endpoint = `${shopUrl(config.shopDomain)}/admin/oauth/access_token`;

  return yield* Auth.makeTokenCache({
    acquire: Effect.scoped(
      Effect.gen(function* () {
        const request = HttpClientRequest.post(endpoint).pipe(
          HttpClientRequest.bodyUrlParams({
            grant_type: "client_credentials",
            client_id: config.clientId,
            client_secret: Redacted.value(config.clientSecret),
          }),
        );
        const response = yield* client
          .execute(request)
          .pipe(Effect.mapError(() => errorFor("exchange_failed")));
        const successfulResponse = yield* HttpClientResponse.filterStatusOk(response).pipe(
          Effect.catchTag("HttpClientError", () =>
            decodeRejectedResponse(response).pipe(
              Effect.flatMap((reason) => Effect.fail(errorFor(reason))),
            ),
          ),
        );
        const body = yield* HttpClientResponse.schemaBodyJson(TokenResponseSchema)(
          successfulResponse,
        ).pipe(Effect.mapError(() => errorFor("exchange_failed")));

        return {
          value: Redacted.make(body.access_token),
          expiresIn: Duration.seconds(body.expires_in),
        };
      }),
    ),
  });
});

export const layer = (
  config: ShopifyConnectionConfig,
): Layer.Layer<ShopifyAuth, never, HttpClient.HttpClient> =>
  Layer.effect(ShopifyAuth)(make(config));

export const layerConfig = (
  config: Config.Wrap<ShopifyConnectionConfig>,
): Layer.Layer<ShopifyAuth, Config.ConfigError, HttpClient.HttpClient> =>
  Layer.unwrap(Config.unwrap(config).pipe(Effect.map(layer)));

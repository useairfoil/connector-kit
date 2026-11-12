import {
  Connector,
  ConnectorError,
  Cursor,
  Fetch,
  Resource,
  Webhook,
} from "@useairfoil/connector-kit";
import { Config, Context, Effect, Layer, Option, Redacted, Schema } from "effect";
import { HttpServerResponse } from "effect/http";
import { createHmac, timingSafeEqual } from "node:crypto";

import * as ShopifyAuth from "./api/auth";
import * as ShopifyApiClient from "./api/client";
import { manifest, type ShopifyConfig, type ShopifyWebhookConfig } from "./manifest";
import { CartSchema } from "./resources/carts/row";
import {
  CartWebhookEventSchema,
  CartWebhookPayloadSchema,
  fromCartWebhook,
} from "./resources/carts/webhook";
import { CustomerSchema } from "./resources/customers/row";
import {
  CustomerDeleteWebhookPayloadSchema,
  CustomerEmailConsentPayloadSchema,
  CustomerEventSchema,
  CustomerPurchaseSummaryPayloadSchema,
  CustomerSmsConsentPayloadSchema,
  CustomerTagsPayloadSchema,
  CustomerWebhookPayloadSchema,
} from "./resources/customers/webhook";
import { OrderSchema } from "./resources/orders/row";
import {
  fromOrderWebhook,
  OrderDeleteWebhookPayloadSchema,
  OrderEventSchema,
  OrderWebhookPayloadSchema,
} from "./resources/orders/webhook";
import { ProductSchema } from "./resources/products/row";
import {
  fromProductWebhook,
  ProductDeleteWebhookPayloadSchema,
  ProductEventSchema,
  ProductWebhookPayloadSchema,
} from "./resources/products/webhook";
import { RefundSchema } from "./resources/refunds/row";
import {
  fromRefundWebhook,
  RefundEventSchema,
  RefundWebhookPayloadSchema,
} from "./resources/refunds/webhook";
import { gid } from "./resources/shared";
import { webhookTopics } from "./webhook-events";
export { manifest, ShopifyConfigDef } from "./manifest";
export type { ShopifyConfig } from "./manifest";

const webhookPayloads = {
  [webhookTopics.products_create]: ProductWebhookPayloadSchema,
  [webhookTopics.products_update]: ProductWebhookPayloadSchema,
  [webhookTopics.products_delete]: ProductDeleteWebhookPayloadSchema,
  [webhookTopics.carts_create]: CartWebhookPayloadSchema,
  [webhookTopics.carts_update]: CartWebhookPayloadSchema,
  [webhookTopics.customers_create]: CustomerWebhookPayloadSchema,
  [webhookTopics.customers_disable]: CustomerWebhookPayloadSchema,
  [webhookTopics.customers_enable]: CustomerWebhookPayloadSchema,
  [webhookTopics.customers_update]: CustomerWebhookPayloadSchema,
  [webhookTopics.customers_purchasing_summary]: CustomerPurchaseSummaryPayloadSchema,
  [webhookTopics.customers_email_marketing_consent_update]: CustomerEmailConsentPayloadSchema,
  [webhookTopics.customers_marketing_consent_update]: CustomerSmsConsentPayloadSchema,
  [webhookTopics.customer_tags_added]: CustomerTagsPayloadSchema,
  [webhookTopics.customer_tags_removed]: CustomerTagsPayloadSchema,
  [webhookTopics.customers_delete]: CustomerDeleteWebhookPayloadSchema,
  [webhookTopics.orders_create]: OrderWebhookPayloadSchema,
  [webhookTopics.orders_updated]: OrderWebhookPayloadSchema,
  [webhookTopics.orders_delete]: OrderDeleteWebhookPayloadSchema,
  [webhookTopics.refunds_create]: RefundWebhookPayloadSchema,
};

const isWebhookTopic = (topic: string): topic is keyof typeof webhookPayloads =>
  Object.hasOwn(webhookPayloads, topic);

const isValidWebhookSignature = (
  rawBody: Uint8Array,
  signature: string | undefined,
  secret: string,
): boolean => {
  if (!signature) return false;
  const digest = createHmac("sha256", secret).update(Buffer.from(rawBody)).digest();
  const provided = Buffer.from(signature, "base64");
  return provided.length === digest.length && timingSafeEqual(digest, provided);
};

const decodeTriggeredAt = (value: string | undefined) =>
  Option.getOrNull(Schema.decodeUnknownOption(Schema.DateFromString)(value));

const backfillPages = <A extends object>(
  fetchPage: (options: {
    readonly first: number;
    readonly after?: string;
  }) => Effect.Effect<ShopifyApiClient.ShopifyPage<A>, ConnectorError>,
) =>
  Fetch.page({
    pageCursor: Cursor.string(),
    cutoff: Cursor.isoDateTime(),
    fetch: ({ pageCursor }) =>
      fetchPage({
        first: 50,
        after: typeof pageCursor === "string" ? pageCursor : undefined,
      }).pipe(
        Effect.map((page) => ({
          rows: page.items,
          nextPageCursor: page.endCursor ?? undefined,
          hasMore: page.hasMore,
        })),
      ),
  });

const build = Effect.gen(function* () {
  const api = yield* ShopifyApiClient.ShopifyApiClient;

  const Products = Resource.entity({
    name: "products",
    rowSchema: ProductSchema,
    version: "updatedAt",

    check: api.checkProductsAccess,
    backfill: backfillPages(api.fetchProducts),
    webhook: {
      schema: ProductEventSchema,
      handler: ({ payload }) => {
        if (payload._tag === "delete") {
          return Effect.succeed([
            {
              id: payload.id,
              updatedAt: payload.version,
              _deleted: true,
            },
          ]);
        }

        const product = payload.payload;
        if (product.variants.length === product.variant_gids.length) {
          return Effect.succeed([fromProductWebhook(product)]);
        }

        // Refetch when Shopify cuts off variants.
        const triggeredAt = payload.triggeredAt;
        return Effect.gen(function* () {
          const refetched = yield* api.fetchProductById(product.admin_graphql_api_id);
          if (Option.isSome(refetched)) {
            return [refetched.value];
          }
          // A deleted product has no updatedAt, so use the webhook time.
          return [{ id: product.admin_graphql_api_id, updatedAt: triggeredAt, _deleted: true }];
        });
      },
    },
  });

  const Customers = Resource.entity({
    name: "customers",
    rowSchema: CustomerSchema,
    version: "updatedAt",

    check: api.checkCustomersAccess,
    backfill: backfillPages(api.fetchCustomers),
    webhook: {
      schema: CustomerEventSchema,
      handler: ({ payload: { _tag, id, version } }) =>
        Effect.gen(function* () {
          // No customer means it was deleted. Its delete webhook can be missed.
          const customer = _tag === "refresh" ? yield* api.fetchCustomerById(id) : Option.none();
          return Option.isNone(customer)
            ? [{ id, updatedAt: version, _deleted: true }]
            : [customer.value];
        }),
    },
  });

  const Orders = Resource.entity({
    name: "orders",
    rowSchema: OrderSchema,
    version: "updatedAt",

    check: api.checkOrdersAccess,
    backfill: backfillPages(api.fetchOrders),
    webhook: {
      schema: OrderEventSchema,
      // Do not refetch. Shopify hides older orders without read_all_orders.
      handler: ({ payload }) =>
        Effect.succeed(
          payload._tag === "delete"
            ? [{ id: payload.id, updatedAt: payload.version, _deleted: true }]
            : [fromOrderWebhook(payload.payload)],
        ),
    },
  });

  const Refunds = Resource.entity({
    name: "refunds",
    rowSchema: RefundSchema,
    // Refund webhooks have no updated_at. A later settlement with the same
    // processedAt may not replace the first row.
    version: "processedAt",

    check: api.checkOrdersAccess,
    backfill: backfillPages(api.fetchRefunds),
    webhook: {
      schema: RefundEventSchema,
      handler: ({ payload }) => Effect.succeed([fromRefundWebhook(payload)]),
    },
  });

  const Carts = Resource.entity({
    name: "carts",
    rowSchema: CartSchema,
    version: "updatedAt",

    check: api.checkConnection,
    webhook: {
      schema: CartWebhookEventSchema,
      handler: ({ payload }) => Effect.succeed([fromCartWebhook(payload)]),
    },
  });

  const connector = Connector.define({
    name: "producer-shopify",
    title: "Shopify",
    resources: [Products, Carts, Customers, Orders, Refunds],
  });

  return {
    connector,
    webhooks: (config: ShopifyWebhookConfig) =>
      Effect.succeed([
        Webhook.route({
          path: manifest.webhook.path,
          ackMode: "after-ingest",
          verify: ({ request, rawBody, payload }) =>
            Effect.gen(function* () {
              if (
                !isValidWebhookSignature(
                  rawBody,
                  request.headers["x-shopify-hmac-sha256"],
                  Redacted.value(config.webhookSecret),
                )
              )
                return yield* new ConnectorError({ message: "Invalid Shopify webhook signature" });

              const topic = request.headers["x-shopify-topic"] ?? "";
              if (!isWebhookTopic(topic)) return false;
              if (decodeTriggeredAt(request.headers["x-shopify-triggered-at"]) === null)
                return yield* new ConnectorError({ message: "Invalid Shopify webhook timestamp" });

              yield* Schema.decodeUnknownEffect(webhookPayloads[topic])(payload).pipe(
                Effect.mapError(
                  () => new ConnectorError({ message: "Invalid Shopify webhook payload" }),
                ),
              );
              return true;
            }),
          schema: Schema.Unknown,
          handler: ({ request, rawBody, payload: json, to }) =>
            Effect.gen(function* () {
              const signature = request.headers["x-shopify-hmac-sha256"];
              if (
                !isValidWebhookSignature(rawBody, signature, Redacted.value(config.webhookSecret))
              ) {
                return HttpServerResponse.jsonUnsafe(
                  { ok: false, error: "Shopify webhook verification failed" },
                  { status: 401 },
                );
              }

              const topic = request.headers["x-shopify-topic"] ?? "";
              const decode = <A>(schema: Schema.Decoder<A>) =>
                Schema.decodeUnknownOption(schema)(json);
              const invalid = HttpServerResponse.jsonUnsafe(
                { ok: false, error: `Invalid Shopify webhook for ${topic}` },
                { status: 400 },
              );
              // Shopify sends it on every webhook.
              const triggeredAt = decodeTriggeredAt(request.headers["x-shopify-triggered-at"]);
              if (triggeredAt === null) return invalid;

              switch (topic) {
                case webhookTopics.products_create:
                case webhookTopics.products_update: {
                  const payload = decode(webhookPayloads[topic]);
                  if (Option.isNone(payload)) return invalid;
                  yield* to(Products, { _tag: "upsert", payload: payload.value, triggeredAt });
                  break;
                }
                case webhookTopics.products_delete: {
                  const payload = decode(webhookPayloads[topic]);
                  if (Option.isNone(payload)) return invalid;
                  yield* to(Products, {
                    _tag: "delete",
                    id: gid("Product", payload.value.id),
                    version: triggeredAt,
                  });
                  break;
                }
                case webhookTopics.carts_create:
                case webhookTopics.carts_update: {
                  const payload = decode(webhookPayloads[topic]);
                  if (Option.isNone(payload)) return invalid;
                  yield* to(Carts, { ...payload.value, topic });
                  break;
                }
                case webhookTopics.customers_create:
                case webhookTopics.customers_disable:
                case webhookTopics.customers_enable:
                case webhookTopics.customers_update: {
                  const payload = decode(webhookPayloads[topic]);
                  if (Option.isNone(payload)) return invalid;
                  yield* to(Customers, {
                    _tag: "refresh",
                    id: payload.value.admin_graphql_api_id,
                    version: payload.value.updated_at,
                  });
                  break;
                }
                case webhookTopics.customers_purchasing_summary: {
                  const payload = decode(webhookPayloads[topic]);
                  if (Option.isNone(payload)) return invalid;
                  yield* to(Customers, {
                    _tag: "refresh",
                    id: payload.value.customerId,
                    version: payload.value.occurredAt,
                  });
                  break;
                }
                case webhookTopics.customers_email_marketing_consent_update: {
                  const payload = decode(webhookPayloads[topic]);
                  if (Option.isNone(payload)) return invalid;
                  yield* to(Customers, {
                    _tag: "refresh",
                    id: gid("Customer", payload.value.customer_id),
                    version: triggeredAt,
                  });
                  break;
                }
                case webhookTopics.customers_marketing_consent_update: {
                  const payload = decode(webhookPayloads[topic]);
                  if (Option.isNone(payload)) return invalid;
                  yield* to(Customers, {
                    _tag: "refresh",
                    id: gid("Customer", payload.value.id),
                    version: triggeredAt,
                  });
                  break;
                }
                case webhookTopics.customer_tags_added:
                case webhookTopics.customer_tags_removed: {
                  const payload = decode(webhookPayloads[topic]);
                  if (Option.isNone(payload)) return invalid;
                  yield* to(Customers, {
                    _tag: "refresh",
                    id: payload.value.customerId,
                    version: payload.value.occurredAt,
                  });
                  break;
                }
                case webhookTopics.customers_delete: {
                  const payload = decode(webhookPayloads[topic]);
                  if (Option.isNone(payload)) return invalid;
                  yield* to(Customers, {
                    _tag: "delete",
                    id: gid("Customer", payload.value.id),
                    version: triggeredAt,
                  });
                  break;
                }
                case webhookTopics.orders_create:
                case webhookTopics.orders_updated: {
                  const payload = decode(webhookPayloads[topic]);
                  if (Option.isNone(payload)) return invalid;
                  yield* to(Orders, { _tag: "upsert", payload: payload.value });
                  break;
                }
                case webhookTopics.orders_delete: {
                  const payload = decode(webhookPayloads[topic]);
                  if (Option.isNone(payload)) return invalid;
                  yield* to(Orders, {
                    _tag: "delete",
                    id: gid("Order", payload.value.id),
                    version: triggeredAt,
                  });
                  break;
                }
                case webhookTopics.refunds_create: {
                  const payload = decode(webhookPayloads[topic]);
                  if (Option.isNone(payload)) return invalid;
                  yield* to(Refunds, payload.value);
                  break;
                }
                default:
                  yield* Effect.logWarning("Ignoring unknown Shopify webhook topic").pipe(
                    Effect.annotateLogs({ topic }),
                  );
              }

              return HttpServerResponse.jsonUnsafe({ ok: true });
            }),
        }),
      ]),
  };
});

export const resources = build.pipe(Effect.map(({ connector }) => connector.resources));

export const webhooks = (config: ShopifyWebhookConfig) =>
  build.pipe(Effect.flatMap((built) => built.webhooks(config)));

export const make = Effect.fnUntraced(function* (config: ShopifyConfig) {
  const built = yield* build;
  const webhooks = yield* built.webhooks(config);

  return Connector.define({ ...built.connector, webhooks });
});

export type ShopifyConnectorRuntime = Effect.Success<ReturnType<typeof make>>;

export class ShopifyConnector extends Context.Service<ShopifyConnector, ShopifyConnectorRuntime>()(
  "@useairfoil/producer-shopify/ShopifyConnector",
) {}

export const layer = (config: ShopifyConfig) => {
  const authLayer = ShopifyAuth.layer(config);
  const apiLayer = ShopifyApiClient.layer(config).pipe(Layer.provide(authLayer));

  return Layer.effect(ShopifyConnector)(
    make(config).pipe(Effect.annotateLogs({ component: "producer-shopify" })),
  ).pipe(Layer.provide(apiLayer));
};

export const layerConfig = (config: Config.Wrap<ShopifyConfig>) =>
  Layer.unwrap(Config.unwrap(config).pipe(Effect.map(layer)));

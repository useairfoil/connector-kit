import type { Headers } from "effect/http";

import {
  Connector,
  ConnectorError,
  Cursor,
  Fetch,
  Resource,
  type ResourceDefinition,
  Webhook,
} from "@useairfoil/connector-kit";
import { Config, Context, DateTime, Effect, Layer, Redacted, Result, Schema } from "effect";
import { Base64 } from "effect/encoding";
import { HttpServerResponse } from "effect/http";
import { Webhook as StandardWebhook } from "standardwebhooks";

import * as PolarApiClient from "./api";
import { manifest, type PolarConfig, type PolarWebhookConfig } from "./manifest";
import { CheckoutSchema } from "./resources/checkouts";
import { CustomerSchema } from "./resources/customers";
import { DiscountSchema } from "./resources/discounts";
import { OrderSchema } from "./resources/orders";
import { ProductSchema } from "./resources/products";
import { RefundSchema } from "./resources/refunds";
import { SubscriptionSchema } from "./resources/subscriptions";
import {
  CheckoutEventSchema,
  checkoutEventTypes,
  CustomerEventSchema,
  customerEventTypes,
  DiscountEventSchema,
  discountEventTypes,
  OrderEventSchema,
  orderEventTypes,
  ProductEventSchema,
  productEventTypes,
  RefundEventSchema,
  refundEventTypes,
  SubscriptionEventSchema,
  subscriptionEventTypes,
  WebhookPayloadSchema,
} from "./webhooks";
export { manifest, PolarConfigDef } from "./manifest";
export type { PolarConfig } from "./manifest";

const verifyWebhookSignature = (options: {
  readonly rawBody: Uint8Array;
  readonly headers: Headers.Headers;
  readonly secret: string;
}): Effect.Effect<void, ConnectorError> =>
  Effect.try({
    try: () => {
      const base64Secret = Base64.encode(options.secret);
      new StandardWebhook(base64Secret).verify(Buffer.from(options.rawBody), options.headers);
    },
    catch: (error) =>
      new ConnectorError({
        message: "Invalid Polar webhook signature",
        cause: error,
      }),
  });

const withEventVersion = <Row extends { readonly version: Date }>(
  row: Row,
  version: Date,
): Row => ({ ...row, version });

const pageResource = <Key extends string, Row extends { readonly [K in Key]: Date }>(options: {
  readonly api: PolarApiClient.PolarApiClientService;
  readonly schema: Schema.Decoder<Row>;
  readonly path: string;
  readonly cursorField: Key;
  readonly sorting?: string;
}) =>
  Fetch.page({
    pageCursor: Cursor.number(),
    cutoff: Cursor.isoDateTime(),
    fetch: ({ pageCursor, cutoff }) => {
      const page = typeof pageCursor === "number" ? pageCursor : 1;
      const sorting = options.sorting ?? `-${options.cursorField}`;
      const cutoffTime = DateTime.toEpochMillis(DateTime.makeUnsafe(String(cutoff)));

      return options.api
        .fetchList(options.schema, options.path, {
          page,
          limit: 100,
          sorting,
        })
        .pipe(
          Effect.map((response) => ({
            rows: response.items.filter((row) => row[options.cursorField].getTime() <= cutoffTime),
            nextPageCursor: page + 1,
            hasMore: page < response.pagination.max_page,
          })),
        );
    },
  });

const build = Effect.gen(function* () {
  const api = yield* PolarApiClient.PolarApiClient;

  const Customers = Resource.entity({
    name: "customers",
    rowSchema: CustomerSchema,
    version: "version",

    check: api
      .fetchList(CustomerSchema, "customers/", { page: 1, limit: 1, sorting: "-created_at" })
      .pipe(Effect.asVoid),
    backfill: pageResource({
      api,
      schema: CustomerSchema,
      path: "customers/",
      cursorField: "created_at",
    }),
    webhook: {
      schema: CustomerEventSchema,
      handler: ({ payload }) => Effect.succeed([withEventVersion(payload.data, payload.timestamp)]),
    },
  });

  const Checkouts = Resource.entity({
    name: "checkouts",
    rowSchema: CheckoutSchema,
    version: "version",

    check: api
      .fetchList(CheckoutSchema, "checkouts/", { page: 1, limit: 1, sorting: "-created_at" })
      .pipe(Effect.asVoid),
    backfill: pageResource({
      api,
      schema: CheckoutSchema,
      path: "checkouts/",
      cursorField: "created_at",
    }),
    webhook: {
      schema: CheckoutEventSchema,
      handler: ({ payload }) => Effect.succeed([withEventVersion(payload.data, payload.timestamp)]),
    },
  });

  const Orders = Resource.entity({
    name: "orders",
    rowSchema: OrderSchema,
    version: "version",

    check: api
      .fetchList(OrderSchema, "orders/", { page: 1, limit: 1, sorting: "-created_at" })
      .pipe(Effect.asVoid),
    backfill: pageResource({
      api,
      schema: OrderSchema,
      path: "orders/",
      cursorField: "created_at",
    }),
    webhook: {
      schema: OrderEventSchema,
      handler: ({ payload }) => Effect.succeed([withEventVersion(payload.data, payload.timestamp)]),
    },
  });

  const Subscriptions = Resource.entity({
    name: "subscriptions",
    rowSchema: SubscriptionSchema,
    version: "version",

    check: api
      .fetchList(SubscriptionSchema, "subscriptions/", {
        page: 1,
        limit: 1,
        sorting: "-started_at",
      })
      .pipe(Effect.asVoid),
    backfill: pageResource({
      api,
      schema: SubscriptionSchema,
      path: "subscriptions/",
      cursorField: "created_at",
      // Polar does not sort subscriptions by created_at.
      sorting: "-started_at",
    }),
    webhook: {
      schema: SubscriptionEventSchema,
      handler: ({ payload }) => Effect.succeed([withEventVersion(payload.data, payload.timestamp)]),
    },
  });

  const Refunds = Resource.entity({
    name: "refunds",
    rowSchema: RefundSchema,
    version: "version",

    check: api
      .fetchList(RefundSchema, "refunds/", { page: 1, limit: 1, sorting: "-created_at" })
      .pipe(Effect.asVoid),
    backfill: pageResource({
      api,
      schema: RefundSchema,
      path: "refunds/",
      cursorField: "created_at",
    }),
    webhook: {
      schema: RefundEventSchema,
      handler: ({ payload }) => Effect.succeed([withEventVersion(payload.data, payload.timestamp)]),
    },
  });

  const Products = Resource.entity({
    name: "products",
    rowSchema: ProductSchema,
    version: "version",

    check: api
      .fetchList(ProductSchema, "products/", { page: 1, limit: 1, sorting: "-created_at" })
      .pipe(Effect.asVoid),
    backfill: pageResource({
      api,
      schema: ProductSchema,
      path: "products/",
      cursorField: "created_at",
    }),
    webhook: {
      schema: ProductEventSchema,
      handler: ({ payload }) => Effect.succeed([withEventVersion(payload.data, payload.timestamp)]),
    },
  });

  const Discounts = Resource.entity({
    name: "discounts",
    rowSchema: DiscountSchema,
    version: "version",

    check: api
      .fetchList(DiscountSchema, "discounts/", { page: 1, limit: 1, sorting: "-created_at" })
      .pipe(Effect.asVoid),
    backfill: pageResource({
      api,
      schema: DiscountSchema,
      path: "discounts/",
      cursorField: "created_at",
    }),
    webhook: {
      schema: DiscountEventSchema,
      handler: ({ payload }) =>
        Effect.succeed([
          payload.type === "discount.deleted"
            ? { id: payload.data.id, version: payload.timestamp, _deleted: true }
            : withEventVersion(payload.data, payload.timestamp),
        ]),
    },
  });

  const byType = new Map<string, ResourceDefinition>(
    [
      { resource: Customers, eventTypes: customerEventTypes },
      { resource: Checkouts, eventTypes: checkoutEventTypes },
      { resource: Orders, eventTypes: orderEventTypes },
      { resource: Subscriptions, eventTypes: subscriptionEventTypes },
      { resource: Refunds, eventTypes: refundEventTypes },
      { resource: Products, eventTypes: productEventTypes },
      { resource: Discounts, eventTypes: discountEventTypes },
    ].flatMap(({ resource, eventTypes }) => eventTypes.map((type) => [type, resource])),
  );

  const connector = Connector.define({
    name: "producer-polar",
    title: "Polar",
    resources: [Customers, Checkouts, Orders, Subscriptions, Refunds, Products, Discounts],
  });

  return {
    connector,
    webhooks: (config: PolarWebhookConfig) =>
      Effect.succeed([
        Webhook.route({
          path: manifest.webhook.path,
          ackMode: "after-ingest",
          verify: ({ request, rawBody, payload }) =>
            verifyWebhookSignature({
              rawBody,
              headers: request.headers,
              secret: Redacted.value(config.webhookSecret),
            }).pipe(Effect.as(byType.has(payload.type))),
          schema: WebhookPayloadSchema,
          handler: ({ request, rawBody, payload, to }) =>
            Effect.gen(function* () {
              const verified = yield* verifyWebhookSignature({
                rawBody,
                headers: request.headers,
                secret: Redacted.value(config.webhookSecret),
              }).pipe(Effect.result);
              if (Result.isFailure(verified)) {
                return HttpServerResponse.jsonUnsafe(
                  { ok: false, error: verified.failure.message },
                  { status: 401 },
                );
              }

              const resource = byType.get(payload.type);
              if (resource !== undefined && "data" in payload) {
                yield* to(resource, payload);
              }

              return HttpServerResponse.jsonUnsafe({ ok: true });
            }),
        }),
      ]),
  };
});

export const resources = build.pipe(Effect.map(({ connector }) => connector.resources));

export const webhooks = (config: PolarWebhookConfig) =>
  build.pipe(Effect.flatMap((built) => built.webhooks(config)));

export const make = Effect.fnUntraced(function* (config: PolarConfig) {
  const built = yield* build;
  const webhooks = yield* built.webhooks(config);

  return Connector.define({ ...built.connector, webhooks });
});

export type PolarConnectorRuntime = Effect.Success<ReturnType<typeof make>>;

export class PolarConnector extends Context.Service<PolarConnector, PolarConnectorRuntime>()(
  "@useairfoil/producer-polar/PolarConnector",
) {}

export const layer = (config: PolarConfig) =>
  Layer.effect(PolarConnector)(make(config).pipe(Effect.annotateLogs({ component: "polar" }))).pipe(
    Layer.provide(PolarApiClient.layer(config)),
  );

export const layerConfig = (config: Config.Wrap<PolarConfig>) =>
  Layer.unwrap(Config.unwrap(config).pipe(Effect.map(layer)));

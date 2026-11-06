import { NodeHttpServer } from "@effect/platform-node";
import { describe, expect, it } from "@effect/vitest";
import { ConnectorError, Ingestion, StateStore } from "@useairfoil/connector-kit";
import {
  ConfigProvider,
  DateTime,
  Deferred,
  Effect,
  Layer,
  Option,
  Ref,
  Result,
  Schema,
} from "effect";
import { HttpClient, HttpClientRequest, HttpServerRequest } from "effect/http";
import { createHmac } from "node:crypto";

import type { ShopifyApiClientService } from "../src/api/client";

import {
  type Product,
  ProductSchema,
  ProductWebhookPayloadSchema,
  ShopifyApiClient,
  ShopifyConnector,
  ShopifyNormalize,
} from "../src/index";
import { customer, customerCreated } from "./customer-fixtures";
import { makeTestIngestor } from "./helpers";
import { orderUpdatedWithCustomer } from "./order-fixtures";
import { refundToStoreCredit } from "./refund-fixtures";

const webhookSecret = "test-shopify-webhook-secret";

const productWebhookPayload = {
  id: 1072481062,
  admin_graphql_api_id: "gid://shopify/Product/1072481062",
  body_html: "<strong>Good snowboard!</strong>",
  created_at: "2026-01-09T19:39:49-05:00",
  handle: "burton-custom-freestyle-151",
  image: {
    src: "https://cdn.shopify.com/product.png",
    alt: "Product image",
  },
  images: [],
  options: [
    {
      id: 1064576516,
      name: "Title",
      position: 1,
      values: ["Default Title"],
    },
  ],
  product_type: "Snowboard",
  published_at: null,
  published_scope: "web",
  status: "draft",
  tags: "",
  template_suffix: "",
  title: "Burton Custom Freestyle 151",
  updated_at: "2026-01-09T19:39:49-05:00",
  variants: [
    {
      id: 1070325053,
      title: "Default Title",
      price: "0.00",
      inventory_policy: "deny",
      compare_at_price: null,
      created_at: "2026-01-09T19:39:49-05:00",
      updated_at: "2026-01-09T19:39:49-05:00",
      taxable: true,
      barcode: null,
      sku: null,
      admin_graphql_api_id: "gid://shopify/ProductVariant/1070325053",
    },
  ],
  variant_gids: [
    {
      admin_graphql_api_id: "gid://shopify/ProductVariant/1070325053",
      updated_at: "2026-01-09T19:39:49-05:00",
    },
  ],
  vendor: "Burton",
} as const;

const truncatedProductWebhookPayload = {
  ...productWebhookPayload,
  variant_gids: [
    ...productWebhookPayload.variant_gids,
    {
      admin_graphql_api_id: "gid://shopify/ProductVariant/1070325054",
      updated_at: "2026-01-09T19:39:49-05:00",
    },
  ],
} as const;

const productDeleteWebhookRawBody = '{"id":9169918886100}';

const cartWebhookPayload = {
  id: "exampleCartId",
  token: "exampleCartId",
  line_items: [
    {
      id: 1,
      properties: null,
      quantity: 1,
      variant_id: 1,
      key: "1:3abdf474dce81d0025dd15b9a02ef6bf",
      discounted_price: "19.99",
      discounts: [],
      gift_card: false,
      grams: 200,
      line_price: "19.99",
      original_line_price: "19.99",
      original_price: "19.99",
      price: "19.99",
      product_id: 2,
      sku: "example-shirt-s",
      taxable: true,
      title: "Example T-Shirt - Small",
      total_discount: "0.00",
      vendor: "Acme",
      discounted_price_set: {
        shop_money: { amount: "19.99", currency_code: "USD" },
        presentment_money: { amount: "19.99", currency_code: "USD" },
      },
      line_price_set: {
        shop_money: { amount: "19.99", currency_code: "USD" },
        presentment_money: { amount: "19.99", currency_code: "USD" },
      },
      original_line_price_set: {
        shop_money: { amount: "19.99", currency_code: "USD" },
        presentment_money: { amount: "19.99", currency_code: "USD" },
      },
      price_set: {
        shop_money: { amount: "19.99", currency_code: "USD" },
        presentment_money: { amount: "19.99", currency_code: "USD" },
      },
      total_discount_set: {
        shop_money: { amount: "0.00", currency_code: "USD" },
        presentment_money: { amount: "0.00", currency_code: "USD" },
      },
      parent_relationship: null,
    },
  ],
  note: null,
  updated_at: "2022-01-01T00:00:00.000Z",
  created_at: "2022-01-01T00:00:00.000Z",
} as const;

const canonicalProduct: Product = ShopifyNormalize.productWebhook(
  Schema.decodeUnknownSync(ProductWebhookPayloadSchema)(productWebhookPayload),
);
const refetchedProduct: Product = {
  ...canonicalProduct,
  title: "Refetched product",
};

const makeApiStub = (): ShopifyApiClientService => ({
  checkConnection: Effect.void,
  checkProductsAccess: Effect.void,
  fetchGraphQL: (_options) =>
    Effect.fail(new ConnectorError({ message: "Unexpected fetchGraphQL" })),
  fetchProducts: (_options) => Effect.succeed({ items: [], endCursor: null, hasMore: false }),
  fetchProductById: (id) =>
    Effect.fail(new ConnectorError({ message: `Unexpected fetchProductById(${id})` })),
  checkOrdersAccess: Effect.void,
  checkCustomersAccess: Effect.void,
  fetchOrders: (_options) => Effect.succeed({ items: [], endCursor: null, hasMore: false }),
  fetchRefunds: (_options) => Effect.succeed({ items: [], endCursor: null, hasMore: false }),
  fetchCustomers: (_options) => Effect.succeed({ items: [], endCursor: null, hasMore: false }),
  fetchCustomerById: (id) =>
    Effect.fail(new ConnectorError({ message: `Unexpected fetchCustomerById(${id})` })),
});

const makeConnectorTestLayer = (api: ShopifyApiClientService) =>
  Layer.effect(ShopifyConnector.ShopifyConnector)(
    ShopifyConnector.ShopifyConfigDef.config.pipe(Effect.flatMap(ShopifyConnector.make)),
  ).pipe(
    Layer.provide(Layer.succeed(ShopifyApiClient.ShopifyApiClient)(api)),
    Layer.provide(
      ConfigProvider.layer(
        ConfigProvider.fromUnknown({
          SHOPIFY_SHOP_DOMAIN: "your-development-store.myshopify.com",
          SHOPIFY_CLIENT_ID: "test-client-id",
          SHOPIFY_CLIENT_SECRET: "test-client-secret",
          SHOPIFY_WEBHOOK_SECRET: webhookSecret,
        }),
      ),
    ),
  );

const connectorTestLayer = makeConnectorTestLayer(makeApiStub());

const signPayload = (rawBody: string): string =>
  createHmac("sha256", webhookSecret).update(rawBody).digest("base64");

/** Sends signed webhooks and returns the response codes and the rows each resource got. */
const sendWebhooks = (
  api: ShopifyApiClientService,
  requests: ReadonlyArray<{
    readonly topic: string;
    readonly body: string;
    readonly triggeredAt?: string;
  }>,
) =>
  Effect.gen(function* () {
    const { ingestedRef, layer } = yield* makeTestIngestor(Number.POSITIVE_INFINITY);
    const connector = yield* ShopifyConnector.ShopifyConnector;
    const now = yield* DateTime.now.pipe(Effect.map(DateTime.formatIso));

    return yield* Effect.gen(function* () {
      yield* Effect.forkScoped(
        Ingestion.run(connector, {
          initialCutoff: now,
          webhook: { routes: connector.webhooks ?? [] },
        }),
      );
      const client = yield* HttpClient.HttpClient;
      const statuses = yield* Effect.forEach(requests, (request) =>
        client
          .execute(
            HttpClientRequest.post("/webhooks/shopify").pipe(
              HttpClientRequest.setHeader("x-shopify-topic", request.topic),
              HttpClientRequest.setHeader("x-shopify-hmac-sha256", signPayload(request.body)),
              HttpClientRequest.setHeader(
                "x-shopify-triggered-at",
                request.triggeredAt ?? "2026-07-23T10:00:00.000Z",
              ),
              HttpClientRequest.bodyText(request.body, "application/json"),
            ),
          )
          .pipe(Effect.map((response) => response.status)),
      );
      const ingested = yield* Ref.get(ingestedRef);
      const rowsOf = (resource: string) =>
        ingested
          .filter((item) => item.source === "webhook" && item.resource === resource)
          .flatMap((item) => item.batch.rows);
      return { statuses, rowsOf };
    }).pipe(
      Effect.provide(Layer.mergeAll(StateStore.layerMemory, layer, NodeHttpServer.layerTest)),
    );
  }).pipe(Effect.provide(makeConnectorTestLayer(api)), Effect.scoped);

const refetchTriggeredAt = "2026-07-23T10:30:00.000Z";

const expectProductWebhookRefetch = (
  payload: Schema.Codec.Encoded<typeof ProductWebhookPayloadSchema>,
  refetched: Option.Option<Product> = Option.some(refetchedProduct),
  expectedRow: object = refetchedProduct,
) =>
  Effect.gen(function* () {
    const fetchCount = yield* Ref.make(0);

    yield* Effect.gen(function* () {
      const { ingestedRef, done, layer } = yield* makeTestIngestor(2);
      const connector = yield* ShopifyConnector.ShopifyConnector;
      const now = yield* DateTime.now.pipe(Effect.map(DateTime.formatIso));

      yield* Effect.gen(function* () {
        yield* Effect.forkScoped(
          Ingestion.run(connector, {
            initialCutoff: now,
            webhook: {
              routes: connector.webhooks ?? [],
            },
          }),
        );

        const rawBody = JSON.stringify(payload);
        const signature = signPayload(rawBody);

        const client = yield* HttpClient.HttpClient;
        const request = HttpClientRequest.post("/webhooks/shopify").pipe(
          HttpClientRequest.setHeader("x-shopify-topic", "products/update"),
          HttpClientRequest.setHeader("x-shopify-triggered-at", refetchTriggeredAt),
          HttpClientRequest.setHeader("x-shopify-hmac-sha256", signature),
          HttpClientRequest.bodyText(rawBody, "application/json"),
        );
        const response = yield* client.execute(request);

        expect(response.status).toBe(200);

        yield* Deferred.await(done);
        const ingested = yield* Ref.get(ingestedRef);
        const webhookIngest = ingested.find(
          (item) => item.source === "webhook" && item.resource === "products",
        );
        expect(webhookIngest?.batch.rows[0]).toEqual(expectedRow);
      }).pipe(
        Effect.provide(Layer.mergeAll(StateStore.layerMemory, layer, NodeHttpServer.layerTest)),
      );
    }).pipe(
      Effect.provide(
        makeConnectorTestLayer({
          ...makeApiStub(),
          fetchProductById: (id) =>
            id === canonicalProduct.id
              ? Ref.update(fetchCount, (count) => count + 1).pipe(Effect.as(refetched))
              : Effect.fail(new ConnectorError({ message: `Unexpected fetchProductById(${id})` })),
        }),
      ),
      Effect.scoped,
    );

    expect(yield* Ref.get(fetchCount)).toBe(1);
  });

describe("producer-shopify webhook", () => {
  it.effect("requires the topic payload and timestamp before confirming verification", () =>
    Effect.gen(function* () {
      const connector = yield* ShopifyConnector.ShopifyConnector;
      const verify = connector.webhooks?.[0]?.verify;
      if (verify === undefined) throw new Error("Webhook verification is missing");

      const accepts = (payload: unknown, timestamp?: string, topic = "products/create") => {
        const body = JSON.stringify(payload);
        return verify({
          request: HttpServerRequest.fromWeb(
            new Request("https://hooks.example.test/webhooks/shopify", {
              method: "POST",
              headers: {
                "x-shopify-topic": topic,
                "x-shopify-hmac-sha256": signPayload(body),
                ...(timestamp === undefined ? {} : { "x-shopify-triggered-at": timestamp }),
              },
            }),
          ),
          rawBody: new TextEncoder().encode(body),
          payload,
        });
      };

      expect(Result.isFailure(yield* accepts({}, refetchTriggeredAt).pipe(Effect.result))).toBe(
        true,
      );
      expect(Result.isFailure(yield* accepts(productWebhookPayload).pipe(Effect.result))).toBe(
        true,
      );
      expect(yield* accepts(productWebhookPayload, refetchTriggeredAt)).toBe(true);
      expect(yield* accepts({}, refetchTriggeredAt, "unknown/topic")).toBe(false);
    }).pipe(Effect.provide(connectorTestLayer)),
  );

  it.effect("ingests live product webhook batches", () =>
    Effect.gen(function* () {
      const { ingestedRef, done, layer } = yield* makeTestIngestor(2);
      const connector = yield* ShopifyConnector.ShopifyConnector;
      const now = yield* DateTime.now.pipe(Effect.map(DateTime.formatIso));

      yield* Effect.gen(function* () {
        yield* Effect.forkScoped(
          Ingestion.run(connector, {
            initialCutoff: now,
            webhook: {
              routes: connector.webhooks ?? [],
            },
          }),
        );

        const rawBody = JSON.stringify(productWebhookPayload);
        const signature = signPayload(rawBody);

        const client = yield* HttpClient.HttpClient;
        const request = HttpClientRequest.post("/webhooks/shopify").pipe(
          HttpClientRequest.setHeader("x-shopify-topic", "products/create"),
          HttpClientRequest.setHeader("x-shopify-hmac-sha256", signature),
          HttpClientRequest.setHeader("x-shopify-triggered-at", "2026-07-23T10:00:00.000Z"),
          HttpClientRequest.bodyText(rawBody, "application/json"),
        );
        const response = yield* client.execute(request);

        expect(response.status).toBe(200);

        yield* Deferred.await(done);
        const ingested = yield* Ref.get(ingestedRef);
        const webhookIngest = ingested.find(
          (item) => item.source === "webhook" && item.resource === "products",
        );
        const row = webhookIngest?.batch.rows[0];
        const product = yield* Schema.decodeUnknownEffect(ProductSchema)(row);

        expect({
          resource: webhookIngest?.resource,
          product: {
            id: product.id,
            legacyResourceId: product.legacyResourceId,
            featuredMedia: product.featuredMedia,
            updatedAt: product.updatedAt,
            productType: product.productType,
            status: product.status,
            firstOption: {
              id: product.options[0]?.id,
              name: product.options[0]?.name,
            },
            firstVariant: {
              id: product.variants[0]?.id,
              legacyResourceId: product.variants[0]?.legacyResourceId,
              inventoryPolicy: product.variants[0]?.inventoryPolicy,
            },
          },
        }).toMatchInlineSnapshot(`
          {
            "product": {
              "featuredMedia": {
                "image": {
                  "altText": "Product image",
                  "url": "https://cdn.shopify.com/product.png",
                },
              },
              "firstOption": {
                "id": "gid://shopify/ProductOption/1064576516",
                "name": "Title",
              },
              "firstVariant": {
                "id": "gid://shopify/ProductVariant/1070325053",
                "inventoryPolicy": "DENY",
                "legacyResourceId": "1070325053",
              },
              "id": "gid://shopify/Product/1072481062",
              "legacyResourceId": "1072481062",
              "productType": "Snowboard",
              "status": "DRAFT",
              "updatedAt": 2026-01-10T00:39:49.000Z,
            },
            "resource": "products",
          }
        `);
      }).pipe(
        Effect.provide(Layer.mergeAll(StateStore.layerMemory, layer, NodeHttpServer.layerTest)),
      );
    }).pipe(Effect.provide(connectorTestLayer), Effect.scoped),
  );

  it.effect("refetches products with truncated webhook variants", () =>
    expectProductWebhookRefetch(truncatedProductWebhookPayload),
  );

  it.effect("soft deletes products that are gone when refetched", () =>
    expectProductWebhookRefetch(truncatedProductWebhookPayload, Option.none(), {
      id: canonicalProduct.id,
      updatedAt: new Date(refetchTriggeredAt),
      _deleted: true,
    }),
  );

  it.effect("ingests signed product delete webhooks as soft deletes", () =>
    Effect.gen(function* () {
      const triggeredAt = "2026-07-23T10:30:00.000Z";
      const { statuses, rowsOf } = yield* sendWebhooks(makeApiStub(), [
        { topic: "products/delete", body: productDeleteWebhookRawBody, triggeredAt },
        {
          topic: "products/delete",
          body: productDeleteWebhookRawBody,
          triggeredAt: "not-a-date",
        },
      ]);

      expect(statuses).toEqual([200, 400]);
      expect(rowsOf("products")).toEqual([
        {
          id: "gid://shopify/Product/9169918886100",
          updatedAt: new Date(triggeredAt),
          _deleted: true,
        },
      ]);
    }),
  );

  it.effect("routes order and refund webhooks", () =>
    Effect.gen(function* () {
      const { statuses, rowsOf } = yield* sendWebhooks(makeApiStub(), [
        { topic: "orders/updated", body: JSON.stringify(orderUpdatedWithCustomer) },
        { topic: "refunds/create", body: JSON.stringify(refundToStoreCredit) },
      ]);
      const ids = (rows: ReadonlyArray<object>) =>
        rows.map((row) => ("id" in row ? row.id : undefined));

      expect(statuses).toEqual([200, 200]);
      expect(ids(rowsOf("orders"))).toEqual([orderUpdatedWithCustomer.admin_graphql_api_id]);
      expect(ids(rowsOf("refunds"))).toEqual([refundToStoreCredit.admin_graphql_api_id]);
    }),
  );

  it.effect("reads the customer again for every customer topic", () =>
    Effect.gen(function* () {
      const version = "2026-09-28T00:00:00.000Z";
      const { statuses, rowsOf } = yield* sendWebhooks(
        {
          ...makeApiStub(),
          fetchCustomerById: (id) =>
            Effect.succeed(id === customer.id ? Option.some(customer) : Option.none()),
        },
        [
          { topic: "customers/create", body: JSON.stringify(customerCreated.payload) },
          {
            topic: "customers/purchasing_summary",
            body: JSON.stringify({
              customerId: customer.id,
              numberOfOrders: 2,
              amountSpent: { amount: "600.00", currencyCode: "INR" },
              lastOrderId: "gid://shopify/Order/1006",
              occurredAt: "2026-09-27T21:49:06Z",
            }),
          },
          {
            topic: "customers_email_marketing_consent/update",
            body: JSON.stringify({
              customer_id: customerCreated.payload.id,
              email_address: "",
              email_marketing_consent: {
                state: "not_subscribed",
                opt_in_level: null,
                consent_updated_at: null,
              },
            }),
            triggeredAt: version,
          },
          {
            topic: "customer.tags_added",
            body: JSON.stringify({
              customerId: customer.id,
              tags: ["repeat"],
              occurredAt: "2026-09-28T00:01:00Z",
            }),
          },
          // Gone by the time we read it.
          {
            topic: "customer.tags_added",
            body: JSON.stringify({
              customerId: "gid://shopify/Customer/404",
              tags: ["repeat"],
              occurredAt: "2026-09-28T00:02:00Z",
            }),
          },
          { topic: "customers/delete", body: '{"id":405}', triggeredAt: version },
        ],
      );

      expect(statuses).toEqual([200, 200, 200, 200, 200, 200]);
      expect(
        rowsOf("customers").map((row) => ({
          ...Object.fromEntries(
            Object.entries(row).filter(([key]) => ["id", "updatedAt", "_deleted"].includes(key)),
          ),
          keys: Object.keys(row).length,
        })),
      ).toMatchInlineSnapshot(`
        [
          {
            "id": "gid://shopify/Customer/9641389523115",
            "keys": 30,
            "updatedAt": 2026-09-27T21:49:06.000Z,
          },
          {
            "id": "gid://shopify/Customer/9641389523115",
            "keys": 30,
            "updatedAt": 2026-09-27T21:49:06.000Z,
          },
          {
            "id": "gid://shopify/Customer/9641389523115",
            "keys": 30,
            "updatedAt": 2026-09-27T21:49:06.000Z,
          },
          {
            "id": "gid://shopify/Customer/9641389523115",
            "keys": 30,
            "updatedAt": 2026-09-27T21:49:06.000Z,
          },
          {
            "_deleted": true,
            "id": "gid://shopify/Customer/404",
            "keys": 3,
            "updatedAt": 2026-09-28T00:02:00.000Z,
          },
          {
            "_deleted": true,
            "id": "gid://shopify/Customer/405",
            "keys": 3,
            "updatedAt": 2026-09-28T00:00:00.000Z,
          },
        ]
      `);
    }),
  );

  it.effect("ingests cart webhook events", () =>
    Effect.gen(function* () {
      const { statuses, rowsOf } = yield* sendWebhooks(makeApiStub(), [
        { topic: "carts/create", body: JSON.stringify(cartWebhookPayload) },
      ]);

      expect(statuses).toEqual([200]);
      expect(rowsOf("carts")).toMatchInlineSnapshot(`
        [
          {
            "createdAt": 2022-01-01T00:00:00.000Z,
            "id": "exampleCartId",
            "lineItems": [
              {
                "discountedPrice": "19.99",
                "discountedPriceSet": {
                  "presentmentMoney": {
                    "amount": "19.99",
                    "currencyCode": "USD",
                  },
                  "shopMoney": {
                    "amount": "19.99",
                    "currencyCode": "USD",
                  },
                },
                "discounts": "[]",
                "giftCard": false,
                "grams": 200,
                "id": "1",
                "key": "1:3abdf474dce81d0025dd15b9a02ef6bf",
                "linePrice": "19.99",
                "linePriceSet": {
                  "presentmentMoney": {
                    "amount": "19.99",
                    "currencyCode": "USD",
                  },
                  "shopMoney": {
                    "amount": "19.99",
                    "currencyCode": "USD",
                  },
                },
                "originalLinePrice": "19.99",
                "originalLinePriceSet": {
                  "presentmentMoney": {
                    "amount": "19.99",
                    "currencyCode": "USD",
                  },
                  "shopMoney": {
                    "amount": "19.99",
                    "currencyCode": "USD",
                  },
                },
                "originalPrice": "19.99",
                "parentRelationship": null,
                "price": "19.99",
                "priceSet": {
                  "presentmentMoney": {
                    "amount": "19.99",
                    "currencyCode": "USD",
                  },
                  "shopMoney": {
                    "amount": "19.99",
                    "currencyCode": "USD",
                  },
                },
                "productId": "gid://shopify/Product/2",
                "properties": null,
                "quantity": 1,
                "sku": "example-shirt-s",
                "taxable": true,
                "title": "Example T-Shirt - Small",
                "totalDiscount": "0",
                "totalDiscountSet": {
                  "presentmentMoney": {
                    "amount": "0",
                    "currencyCode": "USD",
                  },
                  "shopMoney": {
                    "amount": "0",
                    "currencyCode": "USD",
                  },
                },
                "variantId": "gid://shopify/ProductVariant/1",
                "vendor": "Acme",
              },
            ],
            "note": "",
            "token": "exampleCartId",
            "topic": "carts/create",
            "updatedAt": 2022-01-01T00:00:00.000Z,
          },
        ]
      `);
    }),
  );

  it.effect("rejects invalid webhook signatures", () =>
    Effect.gen(function* () {
      const { ingestedRef, layer } = yield* makeTestIngestor(1);
      const connector = yield* ShopifyConnector.ShopifyConnector;
      const now = yield* DateTime.now.pipe(Effect.map(DateTime.formatIso));

      yield* Effect.gen(function* () {
        yield* Effect.forkScoped(
          Ingestion.run(connector, {
            initialCutoff: now,
            webhook: {
              routes: connector.webhooks ?? [],
            },
          }),
        );

        const rawBody = JSON.stringify(productWebhookPayload);
        const invalidSignature = signPayload(`${rawBody}-invalid`);

        const client = yield* HttpClient.HttpClient;
        const request = HttpClientRequest.post("/webhooks/shopify").pipe(
          HttpClientRequest.setHeader("x-shopify-topic", "products/create"),
          HttpClientRequest.setHeader("x-shopify-hmac-sha256", invalidSignature),
          HttpClientRequest.bodyText(rawBody, "application/json"),
        );
        const response = yield* client.execute(request);

        expect(response.status).toBe(401);
        const ingested = yield* Ref.get(ingestedRef);
        expect(ingested.some((item) => item.source === "webhook")).toBe(false);
      }).pipe(
        Effect.provide(Layer.mergeAll(StateStore.layerMemory, layer, NodeHttpServer.layerTest)),
      );
    }).pipe(Effect.provide(connectorTestLayer), Effect.scoped),
  );
});

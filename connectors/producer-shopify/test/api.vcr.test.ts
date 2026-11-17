import { NodeServices } from "@effect/platform-node";
import { describe, expect, it } from "@effect/vitest";
import { FileSystemCassetteStore, VcrHttpClient } from "@useairfoil/effect-vcr";
import { ConfigProvider, Effect, Layer, Option, Redacted, Ref, Schema } from "effect";
import { FetchHttpClient, HttpClient, HttpClientResponse } from "effect/http";

import * as ShopifyAuth from "../src/api/auth";
import {
  fromOrderWebhook,
  fromRefundWebhook,
  OrderWebhookPayloadSchema,
  RefundWebhookPayloadSchema,
  ShopifyApiClient,
  ShopifyConnector,
} from "../src/index";
import { orderUpdatedWithoutCustomer } from "./order-fixtures";
import {
  refundThroughGateway,
  refundToStoreCredit,
  refundWithDamageAdjustment,
  refundWithShipping,
} from "./refund-fixtures";

const shopDomain = "your-development-store.myshopify.com";
const clientId = "test-client-id";
const clientSecret = "test-client-secret";
const apiToken = "test-token";
const webhookSecret = "test-webhook-secret";

const productVariant = (id: number) => ({
  inventoryItem: { id: `gid://shopify/InventoryItem/${id}` },
  id: `gid://shopify/ProductVariant/${id}`,
  legacyResourceId: String(id),
  title: `Variant ${id}`,
  sku: null,
  barcode: null,
  price: "10.00",
  compareAtPrice: null,
  inventoryPolicy: "DENY",
  taxable: true,
  createdAt: "2026-07-01T00:00:00Z",
  updatedAt: "2026-07-01T00:00:00Z",
});

const productNode = {
  id: "gid://shopify/Product/1",
  legacyResourceId: "1",
  title: "Product 1",
  handle: "product-1",
  descriptionHtml: "",
  productType: "Test",
  vendor: "Airfoil",
  status: "ACTIVE",
  tags: [],
  createdAt: "2026-07-01T00:00:00Z",
  updatedAt: "2026-07-01T00:00:00Z",
  publishedAt: null,
  templateSuffix: null,
  featuredMedia: null,
  options: [],
  variants: {
    nodes: [productVariant(1)],
    pageInfo: { hasNextPage: true, endCursor: "variant-cursor-1" },
  },
};

const money = (amount: string) => ({
  shopMoney: { amount, currencyCode: "USD" },
  presentmentMoney: { amount, currencyCode: "USD" },
});

const page = <A>(nodes: ReadonlyArray<A>, endCursor: string | null) => ({
  nodes,
  pageInfo: { hasNextPage: endCursor !== null, endCursor },
});

const lineItem = (id: number) => ({
  id: `gid://shopify/LineItem/${id}`,
  name: `Line ${id}`,
  title: `Line ${id}`,
  variantTitle: null,
  sku: null,
  vendor: null,
  product: null,
  variant: null,
  quantity: 1,
  currentQuantity: 1,
  taxable: true,
  requiresShipping: true,
  isGiftCard: false,
  originalUnitPriceSet: money("1.00"),
  totalDiscountSet: money("0.00"),
  taxLines: [],
  discountAllocations: [],
  customAttributes: [],
});

const shippingLine = (id: number) => ({
  id: `gid://shopify/ShippingLine/${id}`,
  title: `Shipping ${id}`,
  code: null,
  source: null,
  carrierIdentifier: null,
  phone: null,
  isRemoved: false,
  originalPriceSet: money("1.00"),
  discountedPriceSet: money("1.00"),
  currentDiscountedPriceSet: money("1.00"),
  taxLines: [],
  discountAllocations: [],
});

const discountApplication = (index: number, allocationMethod = "ACROSS") => ({
  __typename: "ManualDiscountApplication",
  index,
  title: `Discount ${index}`,
  description: null,
  allocationMethod,
  targetSelection: "ALL",
  targetType: "LINE_ITEM",
  value: { __typename: "PricingPercentageValue", percentage: 10 },
});

const orderNode = {
  id: "gid://shopify/Order/1",
  legacyResourceId: "1",
  name: "#1001",
  email: null,
  phone: null,
  customer: null,
  customerLocale: null,
  customerAcceptsMarketing: false,
  billingAddress: null,
  shippingAddress: null,
  note: null,
  customAttributes: [],
  tags: [],
  confirmationNumber: null,
  poNumber: null,
  sourceName: null,
  sourceIdentifier: null,
  app: null,
  paymentGatewayNames: [],
  test: false,
  taxesIncluded: false,
  taxExempt: false,
  dutiesIncluded: false,
  estimatedTaxes: false,
  totalWeight: "0",
  displayFinancialStatus: "PAID",
  cancelReason: null,
  cancelledAt: null,
  closedAt: null,
  processedAt: "2026-07-01T00:00:00Z",
  createdAt: "2026-07-01T00:00:00Z",
  updatedAt: "2026-07-01T00:00:00Z",
  currencyCode: "USD",
  presentmentCurrencyCode: "USD",
  discountCodes: [],
  discountApplications: page([discountApplication(0)], "discount-cursor"),
  subtotalPriceSet: money("1.00"),
  currentSubtotalPriceSet: money("1.00"),
  totalDiscountsSet: money("0.00"),
  currentTotalDiscountsSet: money("0.00"),
  totalShippingPriceSet: money("0.00"),
  currentShippingPriceSet: money("0.00"),
  totalTaxSet: money("0.00"),
  currentTotalTaxSet: money("0.00"),
  originalTotalDutiesSet: null,
  currentTotalDutiesSet: null,
  totalPriceSet: money("1.00"),
  currentTotalPriceSet: money("1.00"),
  taxLines: [],
  shippingLines: page([shippingLine(1)], "shipping-cursor"),
  lineItems: page([lineItem(1)], "line-cursor"),
};

const transaction = (id: number) => ({
  id: `gid://shopify/OrderTransaction/${id}`,
  kind: "REFUND",
  status: "SUCCESS",
  gateway: "manual",
  test: false,
  errorCode: null,
  parentTransaction: null,
  createdAt: "2026-07-01T00:00:00Z",
  processedAt: "2026-07-01T00:00:00Z",
  amountSet: money("1.00"),
});

const refundLine = (id: number) => ({
  id: `gid://shopify/RefundLineItem/${id}`,
  lineItem: { id: "gid://shopify/LineItem/1" },
  quantity: 1,
  restockType: "NO_RESTOCK",
  location: null,
  subtotalSet: money("1.00"),
  totalTaxSet: money("0.00"),
});

const refundShippingLine = (id: number) => ({
  id: `gid://shopify/RefundShippingLine/${id}`,
  shippingLine: null,
  subtotalAmountSet: money("1.00"),
});

const orderAdjustment = (id: number) => ({
  id: `gid://shopify/OrderAdjustment/${id}`,
  reason: "REFUND_DISCREPANCY",
  amountSet: money("-1.00"),
  taxAmountSet: money("0.00"),
});

const refundNode = {
  id: "gid://shopify/Refund/1",
  legacyResourceId: "1",
  note: null,
  createdAt: "2026-07-01T00:00:00Z",
  processedAt: "2026-07-01T00:00:00Z",
  duties: [],
  transactions: page([transaction(1)], "transaction-cursor"),
  refundLineItems: page([refundLine(1)], "refund-line-cursor"),
  refundShippingLines: page([refundShippingLine(1)], "refund-shipping-cursor"),
  orderAdjustments: page([orderAdjustment(1)], "adjustment-cursor"),
};

const address = (id: number) => ({
  id: `gid://shopify/MailingAddress/${id}`,
  firstName: null,
  lastName: null,
  name: null,
  company: null,
  address1: null,
  address2: null,
  city: null,
  province: null,
  provinceCode: null,
  country: null,
  countryCodeV2: null,
  zip: null,
  phone: null,
  latitude: null,
  longitude: null,
});

const customerNode = {
  id: "gid://shopify/Customer/1",
  legacyResourceId: "1",
  firstName: null,
  lastName: null,
  displayName: "Customer",
  note: null,
  state: "DISABLED",
  verifiedEmail: false,
  taxExempt: false,
  taxExemptions: [],
  tags: [],
  locale: "en",
  numberOfOrders: "0",
  amountSpent: { amount: "0.0", currencyCode: "USD" },
  lastOrder: null,
  productSubscriberStatus: "NEVER_SUBSCRIBED",
  dataSaleOptOut: false,
  defaultEmailAddress: null,
  defaultPhoneNumber: null,
  smsMarketingConsent: null,
  defaultAddress: null,
  addressesV2: page([address(1)], "address-cursor"),
  createdAt: "2026-07-01T00:00:00Z",
  updatedAt: "2026-07-01T00:00:00Z",
};

/** Answers GraphQL requests in order and records each query name and cursor. */
const makeScriptedClient = (responses: ReadonlyArray<unknown>) =>
  Effect.gen(function* () {
    const remaining = yield* Ref.make(responses);
    const requests = yield* Ref.make<ReadonlyArray<string>>([]);
    const client = HttpClient.make((request) =>
      Effect.gen(function* () {
        if (request.body._tag !== "Uint8Array") {
          return yield* Effect.die(new Error("Expected a JSON request body"));
        }
        const json: unknown = JSON.parse(new TextDecoder().decode(request.body.body));
        const body = Schema.decodeUnknownSync(
          Schema.Struct({
            query: Schema.String,
            variables: Schema.Struct({ after: Schema.optional(Schema.NullOr(Schema.String)) }),
          }),
        )(json);
        const name = /query (\w+)/.exec(body.query)?.[1] ?? "unknown";
        yield* Ref.update(requests, (all) => [...all, `${name} ${body.variables.after ?? "-"}`]);
        const response = yield* Ref.modify(remaining, (all) => [all[0], all.slice(1)]);
        return HttpClientResponse.fromWeb(
          request,
          new Response(JSON.stringify({ data: response }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        );
      }),
    );
    const api = yield* ShopifyApiClient.make(config).pipe(
      Effect.provideService(ShopifyAuth.ShopifyAuth, {
        get: Effect.succeed(Redacted.make(apiToken)),
        invalidate: Effect.void,
      }),
      Effect.provideService(HttpClient.HttpClient, client),
    );
    return { api, requests: Ref.get(requests) };
  });

const nested = <A>(nodes: ReadonlyArray<A>) => ({ node: { connection: page(nodes, null) } });

const makeJsonClient = (body: unknown, status = 200) =>
  HttpClient.make((request) =>
    Effect.succeed(
      HttpClientResponse.fromWeb(
        request,
        new Response(JSON.stringify(body), {
          status,
          headers: { "content-type": "application/json" },
        }),
      ),
    ),
  );

const configLayer = ConfigProvider.layer(
  ConfigProvider.orElse(
    ConfigProvider.fromEnv(),
    ConfigProvider.fromUnknown({
      SHOPIFY_SHOP_DOMAIN: shopDomain,
      SHOPIFY_CLIENT_ID: clientId,
      SHOPIFY_CLIENT_SECRET: clientSecret,
      SHOPIFY_WEBHOOK_SECRET: webhookSecret,
    }),
  ),
);

const config = {
  shopDomain,
  clientId,
  clientSecret: Redacted.make(clientSecret),
  webhookSecret: Redacted.make(webhookSecret),
};

const staticAuthLayer = Layer.succeed(ShopifyAuth.ShopifyAuth)({
  get: Effect.succeed(Redacted.make(apiToken)),
  invalidate: Effect.void,
});

const decodeGraphQLBody = Schema.decodeUnknownOption(
  Schema.fromJsonString(
    Schema.Struct({
      query: Schema.optional(Schema.Unknown),
      variables: Schema.optional(
        Schema.Struct({
          id: Schema.optional(Schema.Unknown),
          first: Schema.optional(Schema.Unknown),
          after: Schema.optional(Schema.Unknown),
        }),
      ),
    }),
  ),
);

const parseGraphQLBody = (body: string | undefined) => {
  if (!body) return undefined;
  const parsed = Option.getOrUndefined(decodeGraphQLBody(body));
  if (parsed === undefined) return undefined;
  return {
    query: parsed.query,
    id: parsed.variables?.id ?? null,
    first: parsed.variables?.first,
    after: parsed.variables?.after ?? null,
  };
};

const tokenGrantType = (body: string | undefined): string | null =>
  body ? new URLSearchParams(body).get("grant_type") : null;

const vcrLayer = VcrHttpClient.layer({
  vcrName: "producer-shopify",
  redact: {
    requestHeaders: ["x-shopify-access-token"],
    requestBodyReplacements: {
      client_id: "shopify-client-id-placeholder",
      client_secret: "shopify-client-secret-placeholder",
    },
    responseBodyReplacements: {
      access_token: "shopify-access-token-placeholder",
    },
    responseHeaders: [
      "content-security-policy",
      "report-to",
      "reporting-endpoints",
      "server-timing",
      "set-cookie",
      "x-request-id",
      "x-stats-apiclientid",
      "x-stats-apipermissionid",
      "x-stats-userid",
    ],
  },
  matchIgnore: {
    requestHeaders: ["x-shopify-access-token"],
  },
  match: (request, entry) => {
    const requestUrl = new URL(request.url);
    const entryUrl = new URL(entry.request.url);
    const isTokenRequest = requestUrl.pathname === "/admin/oauth/access_token";
    if (isTokenRequest || entryUrl.pathname === "/admin/oauth/access_token") {
      return (
        isTokenRequest &&
        entryUrl.pathname === "/admin/oauth/access_token" &&
        request.method === "POST" &&
        entry.request.method === "POST" &&
        tokenGrantType(request.body) === "client_credentials" &&
        tokenGrantType(entry.request.body) === "client_credentials"
      );
    }
    const requestBody = parseGraphQLBody(request.body);
    const entryBody = parseGraphQLBody(entry.request.body);
    return (
      request.method === entry.request.method &&
      requestUrl.pathname === entryUrl.pathname &&
      requestBody?.query === entryBody?.query &&
      requestBody?.id === entryBody?.id &&
      requestBody?.first === entryBody?.first &&
      requestBody?.after === entryBody?.after
    );
  },
}).pipe(
  Layer.provide(FileSystemCassetteStore.layer()),
  Layer.provide(Layer.merge(NodeServices.layer, FetchHttpClient.layer)),
);

describe("producer-shopify api (vcr)", () => {
  it.effect("replays GraphQL products page with VCR", () =>
    Effect.gen(function* () {
      const api = yield* ShopifyApiClient.ShopifyApiClient;
      const result = yield* api.fetchProducts({ first: 50 });

      expect({
        itemCount: result.items.length,
        firstItem: {
          idPrefix: result.items[0]?.id.split("/").slice(0, -1).join("/"),
          legacyResourceIdIsNumeric: /^\d+$/.test(result.items[0]?.legacyResourceId ?? ""),
          updatedAtIsDate: result.items[0]?.updatedAt instanceof Date,
          templateSuffix: result.items[0]?.templateSuffix,
        },
        hasMore: result.hasMore,
      }).toMatchInlineSnapshot(`
        {
          "firstItem": {
            "idPrefix": "gid://shopify/Product",
            "legacyResourceIdIsNumeric": true,
            "templateSuffix": "",
            "updatedAtIsDate": true,
          },
          "hasMore": false,
          "itemCount": 18,
        }
      `);
    }).pipe(
      Effect.provide(
        ShopifyApiClient.layerConfig(ShopifyConnector.ShopifyConfigDef.config).pipe(
          Layer.provide(ShopifyAuth.layerConfig(ShopifyConnector.ShopifyConfigDef.config)),
          Layer.provide(vcrLayer),
          Layer.provide(configLayer),
        ),
      ),
      Effect.scoped,
    ),
  );

  it.effect("builds the same order row from GraphQL and from the webhook", () =>
    Effect.gen(function* () {
      const api = yield* ShopifyApiClient.ShopifyApiClient;
      const { items } = yield* api.fetchOrders({ first: 50 });
      const fromWebhook = fromOrderWebhook(
        Schema.decodeUnknownSync(OrderWebhookPayloadSchema)(orderUpdatedWithoutCustomer),
      );

      expect(items.find((item) => item.id === fromWebhook.id)).toEqual({
        ...fromWebhook,
      });
    }).pipe(
      Effect.provide(
        ShopifyApiClient.layerConfig(ShopifyConnector.ShopifyConfigDef.config).pipe(
          Layer.provide(ShopifyAuth.layerConfig(ShopifyConnector.ShopifyConfigDef.config)),
          Layer.provide(vcrLayer),
          Layer.provide(configLayer),
        ),
      ),
      Effect.scoped,
    ),
  );

  it.effect("builds the same refund rows from GraphQL and from webhooks", () =>
    Effect.gen(function* () {
      const api = yield* ShopifyApiClient.ShopifyApiClient;
      const { items } = yield* api.fetchRefunds({ first: 50 });
      const fromWebhooks = [
        refundWithShipping,
        refundToStoreCredit,
        refundThroughGateway,
        refundWithDamageAdjustment,
      ].map((payload) =>
        fromRefundWebhook(Schema.decodeUnknownSync(RefundWebhookPayloadSchema)(payload)),
      );

      for (const refund of fromWebhooks) {
        expect(items.find((item) => item.id === refund.id)).toEqual(refund);
      }
      expect(fromWebhooks.at(-1)?.orderAdjustments.map((item) => item.reason)).toEqual(["DAMAGE"]);
    }).pipe(
      Effect.provide(
        ShopifyApiClient.layerConfig(ShopifyConnector.ShopifyConfigDef.config).pipe(
          Layer.provide(ShopifyAuth.layerConfig(ShopifyConnector.ShopifyConfigDef.config)),
          Layer.provide(vcrLayer),
          Layer.provide(configLayer),
        ),
      ),
      Effect.scoped,
    ),
  );

  it.effect("reads customers with protected fields", () =>
    Effect.gen(function* () {
      const api = yield* ShopifyApiClient.ShopifyApiClient;
      const { items } = yield* api.fetchCustomers({ first: 50 });

      const backfilled = items.find((item) => item.email === "ada.testcustomer@example.com");
      if (backfilled === undefined) throw new Error("Missing test customer");
      expect(yield* api.fetchCustomerById(backfilled.id)).toEqual(Option.some(backfilled));
      expect(backfilled).toMatchInlineSnapshot(`
        {
          "addresses": [
            {
              "address1": "1 Airfoil Test Street",
              "address2": "Unit 7",
              "city": "Ottawa",
              "company": "Airfoil Test Co",
              "country": "Canada",
              "countryCode": "CA",
              "firstName": "Ada",
              "id": "gid://shopify/MailingAddress/10527345115307",
              "lastName": "Testcustomer",
              "latitude": 45.3648932,
              "longitude": -75.62901959999999,
              "name": "Ada Testcustomer",
              "phone": "+16135550143",
              "province": "Ontario",
              "provinceCode": "ON",
              "zip": "K1A 0B1",
            },
          ],
          "amountSpent": {
            "amount": "1929.4",
            "currencyCode": "INR",
          },
          "createdAt": 2026-09-27T21:12:11.000Z,
          "dataSaleOptOut": false,
          "defaultAddressId": "gid://shopify/MailingAddress/10527345115307",
          "displayName": "Ada Testcustomer",
          "email": "ada.testcustomer@example.com",
          "emailMarketingOptInLevel": "SINGLE_OPT_IN",
          "emailMarketingState": "SUBSCRIBED",
          "emailMarketingUpdatedAt": 2026-10-13T20:26:46.000Z,
          "firstName": "Ada",
          "id": "gid://shopify/Customer/9641389523115",
          "lastName": "Testcustomer",
          "lastOrderId": "gid://shopify/Order/7097286787243",
          "legacyResourceId": "9641389523115",
          "locale": "en",
          "note": "Airfoil test customer note (live check)",
          "numberOfOrders": 2,
          "phone": "+16135550177",
          "productSubscriberStatus": "NEVER_SUBSCRIBED",
          "smsMarketingCollectedFrom": "SHOPIFY",
          "smsMarketingOptInLevel": "SINGLE_OPT_IN",
          "smsMarketingState": "SUBSCRIBED",
          "smsMarketingUpdatedAt": 2026-10-13T20:26:45.000Z,
          "state": "DISABLED",
          "tags": [
            "airfoil-test",
            "VIP",
          ],
          "taxExempt": false,
          "taxExemptions": [],
          "updatedAt": 2026-10-13T20:26:46.000Z,
          "verifiedEmail": true,
        }
      `);
    }).pipe(
      Effect.provide(
        ShopifyApiClient.layerConfig(ShopifyConnector.ShopifyConfigDef.config).pipe(
          Layer.provide(ShopifyAuth.layerConfig(ShopifyConnector.ShopifyConfigDef.config)),
          Layer.provide(vcrLayer),
          Layer.provide(configLayer),
        ),
      ),
      Effect.scoped,
    ),
  );

  it.effect("follows every nested product, order, refund, and customer page", () =>
    Effect.gen(function* () {
      const { api, requests } = yield* makeScriptedClient([
        { products: page([productNode], null) },
        { node: { connection: page([productVariant(2)], "variant-cursor-2") } },
        nested([productVariant(3)]),
        { orders: page([orderNode], null) },
        nested([discountApplication(1, "ONE")]),
        nested([shippingLine(2)]),
        nested([lineItem(2)]),
        { orders: page([{ id: orderNode.id, refunds: [refundNode] }], null) },
        nested([transaction(2)]),
        nested([refundLine(2)]),
        nested([refundShippingLine(2)]),
        nested([orderAdjustment(2)]),
        { customers: page([customerNode], null) },
        nested([address(2)]),
      ]);

      const [product] = (yield* api.fetchProducts({ first: 1 })).items;
      const [order] = (yield* api.fetchOrders({ first: 1 })).items;
      const [refund] = (yield* api.fetchRefunds({ first: 1 })).items;
      const [customer] = (yield* api.fetchCustomers({ first: 1 })).items;

      expect({
        variants: product?.variants.map((item) => item.id),
        discountApplications: order?.discountApplications.map((item) => [
          item.index,
          item.allocationMethod,
        ]),
        shippingLines: order?.shippingLines.map((item) => item.id),
        lineItems: order?.lineItems.map((item) => item.id),
        transactions: refund?.transactions.map((item) => item.id),
        refundLineItems: refund?.refundLineItems.map((item) => item.id),
        refundShippingLines: refund?.refundShippingLines.map((item) => item.id),
        orderAdjustments: refund?.orderAdjustments.map((item) => item.id),
        addresses: customer?.addresses.map((item) => item.id),
        requests: yield* requests,
      }).toMatchInlineSnapshot(`
        {
          "addresses": [
            "gid://shopify/MailingAddress/1",
            "gid://shopify/MailingAddress/2",
          ],
          "discountApplications": [
            [
              0,
              "ACROSS",
            ],
            [
              1,
              "ONE",
            ],
          ],
          "lineItems": [
            "gid://shopify/LineItem/1",
            "gid://shopify/LineItem/2",
          ],
          "orderAdjustments": [
            "gid://shopify/OrderAdjustment/1",
            "gid://shopify/OrderAdjustment/2",
          ],
          "refundLineItems": [
            "gid://shopify/RefundLineItem/1",
            "gid://shopify/RefundLineItem/2",
          ],
          "refundShippingLines": [
            "gid://shopify/RefundShippingLine/1",
            "gid://shopify/RefundShippingLine/2",
          ],
          "requests": [
            "AirfoilProducts -",
            "AirfoilProductVariants variant-cursor-1",
            "AirfoilProductVariants variant-cursor-2",
            "AirfoilOrders -",
            "AirfoilOrderDiscountApplications discount-cursor",
            "AirfoilOrderShippingLines shipping-cursor",
            "AirfoilOrderLineItems line-cursor",
            "AirfoilOrderRefunds -",
            "AirfoilRefundTransactions transaction-cursor",
            "AirfoilRefundLineItems refund-line-cursor",
            "AirfoilRefundShippingLines refund-shipping-cursor",
            "AirfoilRefundOrderAdjustments adjustment-cursor",
            "AirfoilCustomers -",
            "AirfoilCustomerAddresses address-cursor",
          ],
          "shippingLines": [
            "gid://shopify/ShippingLine/1",
            "gid://shopify/ShippingLine/2",
          ],
          "transactions": [
            "gid://shopify/OrderTransaction/1",
            "gid://shopify/OrderTransaction/2",
          ],
          "variants": [
            "gid://shopify/ProductVariant/1",
            "gid://shopify/ProductVariant/2",
            "gid://shopify/ProductVariant/3",
          ],
        }
      `);
    }),
  );

  it.effect("accepts featured media that is not an image", () =>
    Effect.gen(function* () {
      const response = {
        data: {
          products: {
            nodes: [
              {
                ...productNode,
                featuredMedia: {},
                variants: {
                  ...productNode.variants,
                  pageInfo: { hasNextPage: false, endCursor: null },
                },
              },
              {
                ...productNode,
                id: "gid://shopify/Product/2",
                featuredMedia: {
                  image: { url: "https://example.com/image.png", altText: null },
                },
                variants: {
                  ...productNode.variants,
                  pageInfo: { hasNextPage: false, endCursor: null },
                },
              },
            ],
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        },
      };
      const api = yield* ShopifyApiClient.make(config).pipe(
        Effect.provide(staticAuthLayer),
        Effect.provideService(HttpClient.HttpClient, makeJsonClient(response)),
      );

      const result = yield* api.fetchProducts({ first: 2 });

      expect(result.items.map((item) => item.featuredMedia)).toMatchInlineSnapshot(`
        [
          null,
          {
            "image": {
              "altText": null,
              "url": "https://example.com/image.png",
            },
          },
        ]
      `);
    }),
  );
});

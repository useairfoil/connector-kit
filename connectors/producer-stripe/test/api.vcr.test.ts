import { NodeServices } from "@effect/platform-node";
import { describe, expect, it } from "@effect/vitest";
import { FileSystemCassetteStore, VcrHttpClient } from "@useairfoil/effect-vcr";
import { ConfigProvider, Effect, Layer, Option } from "effect";
import { FetchHttpClient } from "effect/http";
import { TestClock } from "effect/testing";
import { existsSync } from "node:fs";

import type { StripeResourceSpec } from "../src/resources/shared";

import { StripeClient, StripeConnector, StripeEventSchema } from "../src/index";
import { chargeSpec } from "../src/resources/charges";
import { customerSpec } from "../src/resources/customers";
import { invoicePaymentSpec } from "../src/resources/invoice-payments";
import { makeInvoiceSpec } from "../src/resources/invoices";
import { priceSpec } from "../src/resources/prices";
import { productSpec } from "../src/resources/products";
import { refundSpec } from "../src/resources/refunds";
import { makeSubscriptionSpec } from "../src/resources/subscriptions";

// Recording needs a sandbox key. Skip until there is a cassette or a key.
const canRun =
  existsSync(new URL("./__cassettes__/api.vcr.test.cassette", import.meta.url)) ||
  process.env.STRIPE_API_KEY !== undefined;

const makeConfigLayer = (overrides: Record<string, unknown> = {}) =>
  ConfigProvider.layer(
    ConfigProvider.fromUnknown(overrides).pipe(
      ConfigProvider.orElse(ConfigProvider.fromEnv()),
      ConfigProvider.orElse(
        ConfigProvider.fromUnknown({
          STRIPE_API_KEY: "rk_test_replay",
          STRIPE_WEBHOOK_SECRET: "whsec_replay",
        }),
      ),
    ),
  );

const makeClientLayer = (configLayer: ReturnType<typeof makeConfigLayer>) =>
  StripeClient.layerConfig(StripeConnector.StripeConfigDef.config).pipe(
    Layer.provide(
      VcrHttpClient.layer({
        vcrName: "producer-stripe",
        redact: {
          responseBodyReplacements: {
            email: "customer@example.com",
            customer_email: "customer@example.com",
            receipt_email: "customer@example.com",
            name: "Test Customer",
            customer_name: "Test Customer",
            phone: null,
            customer_phone: null,
            line1: "Teststrasse 1",
            line2: null,
            city: "Berlin",
            postal_code: "10115",
            last4: "4242",
            exp_month: 12,
            exp_year: 2030,
            fingerprint: "fp_test",
            comment: null,
          },
          responseBodyKeys: ["client_secret", "hosted_invoice_url", "invoice_pdf", "receipt_url"],
        },
      }).pipe(
        Layer.provide(FileSystemCassetteStore.layer()),
        Layer.provide(Layer.merge(NodeServices.layer, FetchHttpClient.layer)),
      ),
    ),
    Layer.provide(configLayer),
  );

const clientLayer = makeClientLayer(makeConfigLayer());

// The test clock is fixed, so the rate limiter never refills. A high limit keeps it out of the way.
const fixedClockConfigLayer = makeConfigLayer({ STRIPE_RATE_LIMIT_PER_SECOND: 10_000 });
const fixedClockClientLayer = makeClientLayer(fixedClockConfigLayer);

// Lists one object, then fetches it again by ID.
const readOne = <Item extends { readonly id: string }, Row extends { readonly id: string }>(
  client: StripeClient.StripeClientService,
  spec: StripeResourceSpec<Item, Row>,
) =>
  Effect.gen(function* () {
    const page = yield* client.list(spec.objectSchema, spec.path, [
      ["limit", "1"],
      ...(spec.listParams ?? []),
    ]);
    const first = yield* Effect.fromOption(Option.fromNullishOr(page.items[0]));
    const fetched = yield* client.retrieve(spec.objectSchema, `${spec.path}/${first.id}`);
    const row = yield* spec.toRow(first);
    // IDs change when the sandbox is seeded again, so only check that they agree.
    return {
      path: spec.path,
      fetchedSameObject: Option.exists(fetched, ({ item }) => item.id === first.id),
      rowSameObject: row.id === first.id,
    };
  });

describe.skipIf(!canRun)("Stripe API (vcr)", () => {
  it.effect("decodes one real object of every resource", () =>
    Effect.gen(function* () {
      const client = yield* StripeClient.StripeClient;

      const results = [
        yield* readOne(client, customerSpec),
        yield* readOne(client, productSpec),
        yield* readOne(client, priceSpec),
        yield* readOne(client, makeSubscriptionSpec(client)),
        yield* readOne(client, makeInvoiceSpec(client)),
        yield* readOne(client, chargeSpec),
        yield* readOne(client, invoicePaymentSpec),
        yield* readOne(client, refundSpec),
      ];
      const missing = yield* client.retrieve(customerSpec.objectSchema, "customers/cus_missing");
      const events = yield* client.list(StripeEventSchema, "events", [
        ["limit", "3"],
        ...customerSpec.eventTypes.map((type) => ["types[]", type] as const),
      ]);

      expect({
        results,
        missing: Option.isNone(missing),
        hasEvents: events.items.length > 0,
      }).toMatchInlineSnapshot(`
        {
          "hasEvents": true,
          "missing": true,
          "results": [
            {
              "fetchedSameObject": true,
              "path": "customers",
              "rowSameObject": true,
            },
            {
              "fetchedSameObject": true,
              "path": "products",
              "rowSameObject": true,
            },
            {
              "fetchedSameObject": true,
              "path": "prices",
              "rowSameObject": true,
            },
            {
              "fetchedSameObject": true,
              "path": "subscriptions",
              "rowSameObject": true,
            },
            {
              "fetchedSameObject": true,
              "path": "invoices",
              "rowSameObject": true,
            },
            {
              "fetchedSameObject": true,
              "path": "charges",
              "rowSameObject": true,
            },
            {
              "fetchedSameObject": true,
              "path": "invoice_payments",
              "rowSameObject": true,
            },
            {
              "fetchedSameObject": true,
              "path": "refunds",
              "rowSameObject": true,
            },
          ],
        }
      `);
    }).pipe(Effect.provide(clientLayer)),
  );

  it.effect("reads a window of real events for every resource", () =>
    Effect.gen(function* () {
      // A fixed clock keeps the event window, and so the recorded requests, the same.
      yield* TestClock.setTime(Date.parse("2026-10-03T16:05:00.000Z"));
      const connector = yield* StripeConnector.StripeConfigDef.config.pipe(
        Effect.flatMap(StripeConnector.make),
      );
      const feed = yield* Effect.fromOption(Option.fromNullishOr(connector.changes));

      const result = yield* feed.fetch({
        cursor: "2026-10-03T15:00:00.000Z",
        selected: new Set(feed.resources.map((resource) => resource.name)),
      });

      expect({
        cursor: result.cursor,
        hasMore: result.hasMore,
        rows: Object.fromEntries(
          Object.entries(result.rows).map(([name, rows]) => [
            name,
            {
              rows: rows?.length ?? 0,
              deleted: rows?.filter((row) => row._deleted === true).length ?? 0,
            },
          ]),
        ),
      }).toMatchInlineSnapshot(`
        {
          "cursor": "{"from":"2026-10-03T16:04:30.000Z"}",
          "hasMore": false,
          "rows": {
            "charges": {
              "deleted": 0,
              "rows": 6,
            },
            "customers": {
              "deleted": 1,
              "rows": 9,
            },
            "invoice_payments": {
              "deleted": 0,
              "rows": 3,
            },
            "invoices": {
              "deleted": 0,
              "rows": 5,
            },
            "prices": {
              "deleted": 0,
              "rows": 24,
            },
            "products": {
              "deleted": 1,
              "rows": 27,
            },
            "refunds": {
              "deleted": 0,
              "rows": 2,
            },
            "subscriptions": {
              "deleted": 0,
              "rows": 3,
            },
          },
        }
      `);
    }).pipe(Effect.provide(Layer.merge(fixedClockClientLayer, fixedClockConfigLayer))),
  );
});

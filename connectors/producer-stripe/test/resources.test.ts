import { describe, expect, it } from "@effect/vitest";
import { ConnectorApp } from "@useairfoil/connector-kit";
import { Effect, Option, Ref } from "effect";
import { TestClock } from "effect/testing";

import { demo } from "../src/demo";
import { StripeConnector, manifest } from "../src/index";
import { tableSchemas } from "../src/tables";
import { event } from "./fixtures/events";
import {
  canceledSubscription,
  charge,
  draftInvoice,
  invoice,
  refund,
  sepaCharge,
  subscription,
  subscriptionItem,
} from "./fixtures/objects";
import { type FakeStripe, connectorLayer, makeFakeClient } from "./helpers";

const now = Date.parse("2026-10-03T12:00:00.000Z");
const cursor = "2026-10-03T11:00:00.000Z";

type ResourceName = (typeof manifest.resources)[number]["name"];

const getResource = (name: ResourceName, fake: FakeStripe) =>
  Effect.gen(function* () {
    yield* TestClock.setTime(now);
    const { client, requests } = yield* makeFakeClient(fake);
    const connector = yield* StripeConnector.StripeConnector.pipe(
      Effect.provide(connectorLayer(client)),
    );
    const resource = yield* Effect.fromOption(
      Option.fromNullishOr(connector.resources.find((item) => item.name === name)),
    );
    const backfill = yield* Effect.fromOption(Option.fromNullishOr(resource.backfill));
    const feed = yield* Effect.fromOption(Option.fromNullishOr(connector.changes));
    // Only this resource runs, so the feed returns only its rows.
    const changes = {
      fetch: (input: { readonly cursor: string }) =>
        feed
          .fetch({ ...input, selected: new Set([name]) })
          .pipe(Effect.map((result) => ({ ...result, rows: result.rows[name] ?? [] }))),
    };
    return { backfill, changes, requests };
  });

const backfillRows = (name: ResourceName, path: string, data: ReadonlyArray<unknown>) =>
  Effect.gen(function* () {
    const { backfill } = yield* getResource(name, {
      list: (listPath) =>
        listPath === path ? { data, has_more: false } : { data: [], has_more: false },
    });
    const page = yield* backfill.fetch({ cutoff: cursor });
    return page.rows;
  });

describe("resources", () => {
  it.effect("matches the table schemas", () =>
    Effect.gen(function* () {
      const { client } = yield* makeFakeClient({});
      const connector = yield* StripeConnector.StripeConnector.pipe(
        Effect.provide(connectorLayer(client)),
      );

      expect(connector.resources.map((item) => item.name)).toMatchInlineSnapshot(`
        [
          "customers",
          "products",
          "prices",
          "subscriptions",
          "invoices",
          "charges",
          "invoice_payments",
          "refunds",
        ]
      `);
      expect(Object.keys(tableSchemas)).toEqual(connector.resources.map((item) => item.name));
      for (const resource of connector.resources) {
        expect(tableSchemas[resource.name]).toBe(resource.rowSchema);
      }
    }),
  );

  it.effect("matches the demo tables", () =>
    Effect.gen(function* () {
      const { client } = yield* makeFakeClient({});
      const connector = yield* StripeConnector.StripeConnector.pipe(
        Effect.provide(connectorLayer(client)),
      );
      const demoTables = [...demo.setup.tables, ...demo.group.tables];

      expect(demoTables.map((table) => table.name).toSorted()).toEqual(
        connector.resources.map((resource) => resource.name).toSorted(),
      );
      for (const table of demoTables) {
        const resource = connector.resources.find((item) => item.name === table.name);
        expect(table.rowSchema).toBe(resource?.rowSchema);
        expect(table.version).toBe(resource?.version);
      }
    }),
  );

  it.effect("checks every resource with read-only calls", () =>
    Effect.gen(function* () {
      const { client, requests } = yield* makeFakeClient({});

      const result = yield* ConnectorApp.check(
        StripeConnector.StripeConnector,
        connectorLayer(client),
        {
          resources: manifest.resources.map((resource) => resource.name),
        },
      );

      expect({ result, requests: yield* Ref.get(requests) }).toMatchInlineSnapshot(`
        {
          "requests": [
            "customers?limit=1",
            "events?limit=1&types[]=customer.created",
            "products?limit=1",
            "events?limit=1&types[]=product.created",
            "prices?limit=1",
            "events?limit=1&types[]=price.created",
            "subscriptions?limit=1&status=all",
            "events?limit=1&types[]=customer.subscription.created",
            "invoices?limit=1",
            "events?limit=1&types[]=invoice.created",
            "charges?limit=1",
            "events?limit=1&types[]=charge.succeeded",
            "invoice_payments?limit=1&status=paid",
            "events?limit=1&types[]=invoice_payment.paid",
            "refunds?limit=1",
            "events?limit=1&types[]=refund.created",
          ],
          "result": {
            "charges": {
              "_tag": "ok",
            },
            "customers": {
              "_tag": "ok",
            },
            "invoice_payments": {
              "_tag": "ok",
            },
            "invoices": {
              "_tag": "ok",
            },
            "prices": {
              "_tag": "ok",
            },
            "products": {
              "_tag": "ok",
            },
            "refunds": {
              "_tag": "ok",
            },
            "subscriptions": {
              "_tag": "ok",
            },
          },
        }
      `);
    }),
  );

  it.effect("replaces partial embedded invoice lines with every page", () =>
    Effect.gen(function* () {
      const line = {
        id: "il_1",
        amount: 2500,
        subtotal: 2500,
        currency: "usd",
        description: null,
        quantity: 1,
        quantity_decimal: "1.5",
        period: { start: 1791021600, end: 1791025200 },
        pricing: {
          type: "price_details",
          price_details: { price: "price_1", product: "prod_1" },
          unit_amount_decimal: "1666.6667",
        },
        discount_amounts: [{ amount: 500, discount: "di_1" }],
        taxes: [],
      };
      const { backfill, requests } = yield* getResource("invoices", {
        list: (path, params) => {
          if (path === "invoices") {
            return {
              data: [{ ...invoice, lines: { data: [line], has_more: true } }],
              has_more: false,
            };
          }
          const next = params.some(([key, value]) => key === "starting_after" && value === line.id);
          return next
            ? { data: [{ ...line, id: "il_2" }], has_more: false }
            : { data: [line], has_more: true };
        },
      });

      const page = yield* backfill.fetch({ cutoff: cursor });
      expect(page.rows).toMatchObject([
        {
          id: invoice.id,
          lines: [
            {
              id: "il_1",
              amount: 2500n,
              quantity_decimal: "1.5",
              discount_amounts: [{ amount: 500n, discount: "di_1" }],
            },
            { id: "il_2" },
          ],
        },
      ]);
      expect(yield* Ref.get(requests)).toEqual([
        "invoices?limit=100&created[lte]=1791025200",
        "invoices/in_1/lines?limit=100",
        "invoices/in_1/lines?limit=100&starting_after=il_1",
      ]);
    }),
  );

  it.effect("decodes invoices, including drafts without a parent", () =>
    Effect.gen(function* () {
      expect(yield* backfillRows("invoices", "invoices", [invoice, draftInvoice]))
        .toMatchInlineSnapshot(`
          [
            {
              "amount_due": 4000n,
              "amount_overpaid": 0n,
              "amount_paid": 4000n,
              "amount_remaining": 0n,
              "attempt_count": 1n,
              "billing_reason": "subscription_create",
              "collection_method": "charge_automatically",
              "created": 2026-01-01T00:00:00.000Z,
              "currency": "eur",
              "customer": "cus_1",
              "customer_account": null,
              "customer_address": {
                "city": "Berlin",
                "country": "DE",
                "line1": "Teststrasse 1",
                "line2": null,
                "postal_code": "10115",
                "state": null,
              },
              "customer_email": "customer@example.com",
              "customer_name": "Test Customer",
              "customer_phone": null,
              "customer_shipping": null,
              "due_date": null,
              "effective_at": 2026-01-01T00:01:00.000Z,
              "id": "in_1",
              "lines": [],
              "livemode": false,
              "metadata": Map {},
              "number": "ABC123-0001",
              "parent": {
                "subscription_details": {
                  "subscription": "sub_1",
                },
                "type": "subscription_details",
              },
              "period_end": 2026-01-01T00:00:00.000Z,
              "period_start": 2026-01-01T00:00:00.000Z,
              "status": "paid",
              "status_transitions": {
                "finalized_at": 2026-01-01T00:01:00.000Z,
                "marked_uncollectible_at": null,
                "paid_at": 2026-01-01T00:01:10.000Z,
                "voided_at": null,
              },
              "subtotal": 4000n,
              "test_clock": null,
              "total": 4000n,
              "total_excluding_tax": 4000n,
              "version": 2026-10-03T12:00:00.000Z,
            },
            {
              "amount_due": 4000n,
              "amount_overpaid": 0n,
              "amount_paid": 0n,
              "amount_remaining": 4000n,
              "attempt_count": 0n,
              "billing_reason": "manual",
              "collection_method": "charge_automatically",
              "created": 2026-01-01T00:00:00.000Z,
              "currency": "eur",
              "customer": "cus_1",
              "customer_account": null,
              "customer_address": null,
              "customer_email": null,
              "customer_name": null,
              "customer_phone": null,
              "customer_shipping": null,
              "due_date": null,
              "effective_at": null,
              "id": "in_2",
              "lines": [],
              "livemode": false,
              "metadata": Map {},
              "number": null,
              "parent": null,
              "period_end": 2026-01-01T00:00:00.000Z,
              "period_start": 2026-01-01T00:00:00.000Z,
              "status": "draft",
              "status_transitions": {
                "finalized_at": null,
                "marked_uncollectible_at": null,
                "paid_at": null,
                "voided_at": null,
              },
              "subtotal": 4000n,
              "test_clock": null,
              "total": 4000n,
              "total_excluding_tax": 4000n,
              "version": 2026-10-03T12:00:00.000Z,
            },
          ]
        `);
    }),
  );

  it.effect("decodes card and non-card charges", () =>
    Effect.gen(function* () {
      expect(yield* backfillRows("charges", "charges", [charge, sepaCharge]))
        .toMatchInlineSnapshot(`
        [
          {
            "amount": 4000n,
            "amount_captured": 4000n,
            "amount_refunded": 1000n,
            "balance_transaction": "txn_1",
            "billing_details": {
              "address": {
                "city": "Berlin",
                "country": "DE",
                "line1": "Teststrasse 1",
                "line2": null,
                "postal_code": "10115",
                "state": null,
              },
              "email": "customer@example.com",
              "name": "Test Customer",
              "phone": null,
            },
            "captured": true,
            "created": 2026-01-01T00:01:10.000Z,
            "currency": "eur",
            "customer": "cus_1",
            "description": null,
            "disputed": false,
            "failure_code": null,
            "failure_message": null,
            "id": "ch_1",
            "livemode": false,
            "metadata": Map {},
            "outcome": {
              "network_status": "approved_by_network",
              "reason": null,
              "risk_level": "normal",
              "seller_message": "Payment complete.",
              "type": "authorized",
            },
            "paid": true,
            "payment_intent": "pi_1",
            "payment_method": "pm_1",
            "payment_method_details": {
              "card": {
                "brand": "visa",
                "country": "US",
                "exp_month": 12n,
                "exp_year": 2030n,
                "fingerprint": "fp_1",
                "funding": "credit",
                "last4": "4242",
              },
              "type": "card",
            },
            "receipt_email": "customer@example.com",
            "refunded": false,
            "status": "succeeded",
            "version": 2026-10-03T12:00:00.000Z,
          },
          {
            "amount": 4000n,
            "amount_captured": 4000n,
            "amount_refunded": 1000n,
            "balance_transaction": "txn_1",
            "billing_details": {
              "address": null,
              "email": null,
              "name": "Test Customer",
              "phone": null,
            },
            "captured": true,
            "created": 2026-01-01T00:01:10.000Z,
            "currency": "eur",
            "customer": "cus_1",
            "description": null,
            "disputed": false,
            "failure_code": null,
            "failure_message": null,
            "id": "ch_2",
            "livemode": false,
            "metadata": Map {},
            "outcome": null,
            "paid": true,
            "payment_intent": "pi_1",
            "payment_method": "pm_1",
            "payment_method_details": {
              "type": "sepa_debit",
            },
            "receipt_email": null,
            "refunded": false,
            "status": "succeeded",
            "version": 2026-10-03T12:00:00.000Z,
          },
        ]
      `);
    }),
  );

  it.effect("decodes refunds with missing nullable fields", () =>
    Effect.gen(function* () {
      expect(yield* backfillRows("refunds", "refunds", [refund])).toMatchInlineSnapshot(`
        [
          {
            "amount": 1000n,
            "balance_transaction": "txn_2",
            "charge": "ch_1",
            "created": 2026-01-01T00:01:20.000Z,
            "currency": "eur",
            "id": "re_1",
            "metadata": Map {},
            "payment_intent": "pi_1",
            "reason": "requested_by_customer",
            "status": "succeeded",
            "version": 2026-10-03T12:00:00.000Z,
          },
        ]
      `);
    }),
  );

  it.effect("backfills canceled subscriptions and pages the remaining items", () =>
    Effect.gen(function* () {
      const { backfill, requests } = yield* getResource("subscriptions", {
        list: (path) =>
          path === "subscription_items"
            ? { data: [subscriptionItem("si_1"), subscriptionItem("si_2")], has_more: false }
            : { data: [subscription, canceledSubscription], has_more: false },
      });

      const page = yield* backfill.fetch({ cutoff: cursor });

      expect({
        requests: yield* Ref.get(requests),
        items: page.rows.map((row) => ({ id: row.id, items: "items" in row ? row.items : [] })),
      }).toMatchInlineSnapshot(`
        {
          "items": [
            {
              "id": "sub_1",
              "items": [
                {
                  "created": 2026-01-01T00:00:01.000Z,
                  "current_period_end": 2026-02-01T00:00:00.000Z,
                  "current_period_start": 2026-01-01T00:00:00.000Z,
                  "id": "si_1",
                  "price": {
                    "id": "price_1",
                    "product": "prod_1",
                  },
                  "quantity": 2n,
                },
                {
                  "created": 2026-01-01T00:00:01.000Z,
                  "current_period_end": 2026-02-01T00:00:00.000Z,
                  "current_period_start": 2026-01-01T00:00:00.000Z,
                  "id": "si_2",
                  "price": {
                    "id": "price_1",
                    "product": "prod_1",
                  },
                  "quantity": 2n,
                },
              ],
            },
            {
              "id": "sub_2",
              "items": [
                {
                  "created": 2026-01-01T00:00:01.000Z,
                  "current_period_end": 2026-02-01T00:00:00.000Z,
                  "current_period_start": 2026-01-01T00:00:00.000Z,
                  "id": "si_1",
                  "price": {
                    "id": "price_1",
                    "product": "prod_1",
                  },
                  "quantity": 2n,
                },
              ],
            },
          ],
          "requests": [
            "subscriptions?limit=100&created[lte]=1791025200&status=all",
            "subscription_items?limit=100&subscription=sub_1",
          ],
        }
      `);
      expect(page.rows[1]).toMatchInlineSnapshot(`
        {
          "billing_cycle_anchor": 2026-01-01T00:00:00.000Z,
          "cancel_at": null,
          "cancel_at_period_end": false,
          "canceled_at": 2026-02-01T00:00:00.000Z,
          "cancellation_details": {
            "comment": "Too expensive",
            "feedback": "too_expensive",
            "reason": "cancellation_requested",
          },
          "collection_method": "charge_automatically",
          "created": 2026-01-01T00:00:00.000Z,
          "currency": "eur",
          "customer": "cus_1",
          "customer_account": null,
          "days_until_due": null,
          "default_payment_method": "pm_1",
          "description": null,
          "ended_at": 2026-02-01T00:00:00.000Z,
          "id": "sub_2",
          "items": [
            {
              "created": 2026-01-01T00:00:01.000Z,
              "current_period_end": 2026-02-01T00:00:00.000Z,
              "current_period_start": 2026-01-01T00:00:00.000Z,
              "id": "si_1",
              "price": {
                "id": "price_1",
                "product": "prod_1",
              },
              "quantity": 2n,
            },
          ],
          "latest_invoice": "in_1",
          "livemode": false,
          "metadata": Map {},
          "pause_collection": null,
          "schedule": null,
          "start_date": 2026-01-01T00:00:00.000Z,
          "status": "canceled",
          "test_clock": null,
          "trial_end": null,
          "trial_start": null,
          "version": 2026-10-03T12:00:00.000Z,
        }
      `);
    }),
  );

  it.effect("writes hard deletes as delete rows without fetching", () =>
    Effect.gen(function* () {
      const cases = [
        { name: "products", type: "product.deleted", id: "prod_1" },
        { name: "prices", type: "price.deleted", id: "price_1" },
        { name: "invoices", type: "invoice.deleted", id: "in_2" },
      ] as const;

      const results: Record<string, unknown> = {};
      for (const { name, type, id } of cases) {
        const { changes, requests } = yield* getResource(name, {
          list: () => ({ data: [event({ id: "evt_1", type, objectId: id })], has_more: false }),
        });
        const result = yield* changes.fetch({ cursor });
        results[type] = {
          rows: result.rows,
          fetched: (yield* Ref.get(requests)).filter((request) => !request.includes("?")),
        };
      }

      expect(results).toMatchInlineSnapshot(`
        {
          "invoice.deleted": {
            "fetched": [],
            "rows": [
              {
                "_deleted": true,
                "id": "in_2",
                "version": 2026-10-03T12:00:00.000Z,
              },
            ],
          },
          "price.deleted": {
            "fetched": [],
            "rows": [
              {
                "_deleted": true,
                "id": "price_1",
                "version": 2026-10-03T12:00:00.000Z,
              },
            ],
          },
          "product.deleted": {
            "fetched": [],
            "rows": [
              {
                "_deleted": true,
                "id": "prod_1",
                "version": 2026-10-03T12:00:00.000Z,
              },
            ],
          },
        }
      `);
    }),
  );
});

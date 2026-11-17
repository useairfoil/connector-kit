import { describe, expect, it } from "@effect/vitest";
import { Demo, Ingestor } from "@useairfoil/connector-kit";
import { Effect, Layer, Ref, Schema } from "effect";

import { demo } from "../src/demo";
import { BalanceTransactionSchema } from "../src/schemas/balance-transactions";
import { ChargeSchema } from "../src/schemas/charges";
import { CustomerSchema } from "../src/schemas/customers";
import { InvoiceSchema } from "../src/schemas/invoices";
import { PaymentIntentSchema } from "../src/schemas/payment-intents";
import { PayoutSchema } from "../src/schemas/payouts";
import { PriceSchema } from "../src/schemas/prices";
import { RefundSchema } from "../src/schemas/refunds";
import { SubscriptionScheduleSchema } from "../src/schemas/subscription-schedules";
import { SubscriptionSchema } from "../src/schemas/subscriptions";

const now = new Date("2026-10-01T00:00:00.000Z");

// Only group rows count toward the size, so 1 byte writes the setup tables and one chunk.
const groupTables = new Set<string>(demo.group.tables.map((table) => table.name));

const generate = Effect.gen(function* () {
  const written = yield* Ref.make<ReadonlyArray<Ingestor.IngestOptions>>([]);

  const layer = Layer.succeed(Ingestor.Ingestor)({
    ingest: (options) =>
      Ref.update(written, (all) => [...all, options]).pipe(
        Effect.as({
          rows: options.batch.rows.length,
          bytes: groupTables.has(options.resource) ? options.batch.rows.length : 0,
        }),
      ),
  });

  yield* Demo.run(demo, { bytes: 1, seed: 42, now, groupsPerChunk: 30 }).pipe(
    Effect.provide(layer),
  );

  return yield* Ref.get(written);
});

const rowsOf = <S extends Schema.Top>(
  written: ReadonlyArray<Ingestor.IngestOptions>,
  resource: string,
  schema: S,
) =>
  Schema.decodeUnknownSync(Schema.Array(Schema.toType(schema)))(
    written.filter((item) => item.resource === resource).flatMap((item) => item.batch.rows),
  );

const countBy = <A>(rows: ReadonlyArray<A>, key: (row: A) => string) =>
  Object.fromEntries(
    Object.entries(Object.groupBy(rows, key)).map(([name, group]) => [name, group?.length ?? 0]),
  );

describe("Stripe demo", () => {
  it.effect("writes every table with unique keys and links that resolve", () =>
    Effect.gen(function* () {
      const written = yield* generate;
      const prices = new Map(rowsOf(written, "prices", PriceSchema).map((row) => [row.id, row]));
      const customers = rowsOf(written, "customers", CustomerSchema);
      const subscriptions = rowsOf(written, "subscriptions", SubscriptionSchema);
      const invoices = rowsOf(written, "invoices", InvoiceSchema);
      const charges = rowsOf(written, "charges", ChargeSchema);
      const refunds = rowsOf(written, "refunds", RefundSchema);
      const ledger = new Map(
        rowsOf(written, "balance_transactions", BalanceTransactionSchema).map((row) => [
          row.id,
          row,
        ]),
      );
      const intents = new Map(
        rowsOf(written, "payment_intents", PaymentIntentSchema).map((row) => [row.id, row]),
      );
      const schedules = new Map(
        rowsOf(written, "subscription_schedules", SubscriptionScheduleSchema).map((row) => [
          row.id,
          row,
        ]),
      );
      const payouts = rowsOf(written, "payouts", PayoutSchema);
      expect([...ledger.values()]).not.toHaveLength(0);
      expect(payouts).not.toHaveLength(0);
      for (const payout of payouts) {
        const amount = payout.balance_transaction_ids?.reduce((sum, transactionId) => {
          const transaction = ledger.get(transactionId);
          expect(transaction?.currency).toBe(payout.currency);
          return sum + (transaction?.net ?? 0n);
        }, 0n);
        expect(amount).toBe(payout.amount);
      }

      const customerById = new Map(customers.map((row) => [row.id, row]));
      const subscriptionById = new Map(subscriptions.map((row) => [row.id, row]));
      const invoiceIds = new Set(invoices.map((row) => row.id));
      const chargeById = new Map(charges.map((row) => [row.id, row]));

      for (const rows of [customers, subscriptions, invoices, charges, refunds]) {
        expect(rows.length).toBeGreaterThan(0);
        expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
      }

      for (const subscription of subscriptions) {
        const customer = customerById.get(subscription.customer ?? "");
        expect(customer?.currency).toBe(subscription.currency);
        expect(customer && customer.created <= subscription.created).toBe(true);

        for (const item of subscription.items) {
          const price = prices.get(item.price.id);
          expect(price?.product).toBe(item.price.product);
          expect(price?.currency).toBe(subscription.currency);
        }

        if (subscription.latest_invoice !== null) {
          expect(invoiceIds.has(subscription.latest_invoice)).toBe(true);
        }

        expect(subscription.default_payment_method).toBeNull();
        if (subscription.schedule !== null) {
          expect(schedules.get(subscription.schedule)?.subscription).toBe(subscription.id);
        }
      }

      for (const invoice of invoices) {
        const subscription = subscriptionById.get(
          invoice.parent?.subscription_details?.subscription ?? "",
        );

        const total = (subscription?.items ?? []).reduce(
          (sum, item) =>
            sum + (prices.get(item.price.id)?.unit_amount ?? 0n) * (item.quantity ?? 0n),
          0n,
        );

        expect(invoice.customer).toBe(subscription?.customer);
        expect(invoice.currency).toBe(subscription?.currency);
        expect(invoice.total).toBe(total);
        expect(subscription && subscription.created <= invoice.created).toBe(true);
        expect(invoice.created <= now).toBe(true);

        expect(
          invoice.status === "paid"
            ? [invoice.amount_paid, invoice.amount_remaining]
            : [0n, invoice.total],
        ).toEqual([invoice.amount_paid, invoice.amount_remaining]);

        expect(["paid", "open"]).toContain(invoice.status);
      }

      for (const charge of charges) {
        const refunded = refunds
          .filter((refund) => refund.charge === charge.id)
          .reduce((sum, refund) => sum + refund.amount, 0n);

        expect(customerById.has(charge.customer ?? "")).toBe(true);
        expect(charge.amount_refunded).toBe(refunded);
        expect(charge.refunded).toBe(refunded === charge.amount);
        expect(charge.amount_captured).toBe(charge.status === "succeeded" ? charge.amount : 0n);
        expect(charge.created <= now).toBe(true);
        expect(charge.payment_method).toBeNull();
        expect(intents.get(charge.payment_intent ?? "")?.latest_charge).toBe(charge.id);
        if (charge.balance_transaction !== null) {
          const transaction = ledger.get(charge.balance_transaction);
          expect(transaction?.source).toBe(charge.id);
          expect(transaction && transaction.amount - transaction.fee).toBe(transaction?.net);
        }
      }

      for (const refund of refunds) {
        const charge = chargeById.get(refund.charge ?? "");
        expect(charge?.status).toBe("succeeded");
        expect(refund.currency).toBe(charge?.currency);
        expect(refund.payment_intent).toBe(charge?.payment_intent);
        expect(charge && charge.created <= refund.created && refund.created <= now).toBe(true);
      }

      expect({
        subscriptions: countBy(subscriptions, (row) => row.status),
        invoices: countBy(invoices, (row) => row.status ?? "none"),
        charges: countBy(charges, (row) => row.status),
        refunds: refunds.length,
      }).toMatchInlineSnapshot(`
        {
          "charges": {
            "failed": 4,
            "succeeded": 259,
          },
          "invoices": {
            "open": 4,
            "paid": 259,
          },
          "refunds": 18,
          "subscriptions": {
            "active": 17,
            "canceled": 5,
            "past_due": 4,
            "trialing": 2,
          },
        }
      `);

      expect(customers[0]).toMatchInlineSnapshot(`
        {
          "address": {
            "city": "Fort Enamouth",
            "country": "US",
            "line1": "61099 Front Street",
            "line2": "Suite 414",
            "postal_code": "97985",
            "state": "NV",
          },
          "balance": 0n,
          "created": 2025-12-25T06:32:38.000Z,
          "currency": "usd",
          "delinquent": false,
          "description": null,
          "email": "kevin_beer70@example.org",
          "id": "cus_demo_0",
          "invoice_prefix": "5ADGS7IL",
          "invoice_settings": {
            "default_payment_method": null,
          },
          "livemode": false,
          "metadata": Map {},
          "name": "Kevin Beer",
          "phone": "+19823135426",
          "shipping": null,
          "tax_exempt": "none",
          "test_clock": null,
          "version": 2026-10-01T00:00:00.000Z,
        }
      `);
    }),
  );
});

import { describe, expect, it } from "@effect/vitest";
import { Iceberg } from "@useairfoil/connector-kit";
import { Effect } from "effect";

import { tableSchemas } from "../src/tables";

type CreateRequest = Effect.Success<ReturnType<typeof Iceberg.makeCreateTableRequest>>;
type TableSchema = CreateRequest["schema"];
type IcebergType = TableSchema["fields"][number]["type"];

const tableSchema = (request: CreateRequest): TableSchema => request.schema;

const undocumented = (type: IcebergType): ReadonlyArray<string> => {
  if (typeof type === "string") return [];
  switch (type.type) {
    case "struct":
      return type.fields.flatMap((field) => [
        ...(field.doc ? [] : [field.name]),
        ...undocumented(field.type),
      ]);
    case "list":
      return undocumented(type.element);
    case "map":
      return [...undocumented(type.key), ...undocumented(type.value)];
  }
};

const describeType = (type: IcebergType): string => {
  if (typeof type === "string") return type;
  switch (type.type) {
    case "struct":
      return `struct<${type.fields.map((field) => `${field.name}${field.required ? "" : "?"}: ${describeType(field.type)}`).join(", ")}>`;
    case "list":
      return `list<${describeType(type.element)}>`;
    case "map":
      return `map<${describeType(type.key)}, ${describeType(type.value)}>`;
  }
};

describe("Iceberg schemas", () => {
  it.effect("compiles every table with documented fields", () =>
    Effect.gen(function* () {
      const comments: Record<string, string | undefined> = {};
      const missingDocs: Array<string> = [];
      const tables: Record<string, ReadonlyArray<string>> = {};
      for (const [name, schema] of Object.entries(tableSchemas)) {
        const request = yield* Iceberg.makeCreateTableRequest(schema, {
          name: "rows",
          location: `s3://warehouse/stripe-${name}`,
        });
        comments[name] = request.properties?.comment;

        const fields = tableSchema(request);
        missingDocs.push(...undocumented(fields).map((field) => `${name}.${field}`));
        tables[name] = [
          `identifier: ${fields.fields
            .filter((field) => fields["identifier-field-ids"]?.includes(field.id))
            .map((field) => field.name)
            .join(", ")}`,
          ...fields.fields.map(
            (field) => `${field.name}${field.required ? "" : "?"}: ${describeType(field.type)}`,
          ),
        ];
      }

      expect({ comments, missingDocs }).toMatchInlineSnapshot(`
        {
          "comments": {
            "charges": "Charges in a Stripe account.",
            "customers": "Customers in a Stripe account.",
            "invoices": "Invoices in a Stripe account. Deleted drafts are marked deleted.",
            "prices": "Prices in a Stripe account, including inactive ones.",
            "products": "Products in a Stripe account, including archived ones.",
            "refunds": "Refunds in a Stripe account.",
            "subscriptions": "Subscriptions in a Stripe account, including canceled ones.",
          },
          "missingDocs": [],
        }
      `);
      expect(tables).toMatchInlineSnapshot(`
        {
          "charges": [
            "identifier: id",
            "id: string",
            "version?: timestamptz",
            "created?: timestamptz",
            "livemode?: boolean",
            "amount?: long",
            "amount_captured?: long",
            "amount_refunded?: long",
            "currency?: string",
            "status?: string",
            "paid?: boolean",
            "captured?: boolean",
            "refunded?: boolean",
            "disputed?: boolean",
            "customer?: string",
            "payment_intent?: string",
            "payment_method?: string",
            "balance_transaction?: string",
            "description?: string",
            "failure_code?: string",
            "failure_message?: string",
            "payment_method_details?: struct<type: string, card?: struct<brand?: string, country?: string, funding?: string, last4?: string, exp_month: long, exp_year: long, fingerprint?: string>>",
            "outcome?: struct<type: string, network_status?: string, reason?: string, risk_level?: string, seller_message?: string>",
            "metadata?: map<string, string>",
            "billing_details?: struct<name?: string, email?: string, phone?: string, address?: struct<line1?: string, line2?: string, city?: string, state?: string, postal_code?: string, country?: string>>",
            "receipt_email?: string",
          ],
          "customers": [
            "identifier: id",
            "id: string",
            "version?: timestamptz",
            "created?: timestamptz",
            "livemode?: boolean",
            "email?: string",
            "name?: string",
            "phone?: string",
            "description?: string",
            "currency?: string",
            "balance?: long",
            "delinquent?: boolean",
            "tax_exempt?: string",
            "invoice_prefix?: string",
            "invoice_settings?: struct<default_payment_method?: string>",
            "address?: struct<line1?: string, line2?: string, city?: string, state?: string, postal_code?: string, country?: string>",
            "metadata?: map<string, string>",
            "_deleted?: boolean",
            "test_clock?: string",
            "shipping?: struct<name: string, phone?: string, address: struct<line1?: string, line2?: string, city?: string, state?: string, postal_code?: string, country?: string>>",
          ],
          "invoices": [
            "identifier: id",
            "id: string",
            "version?: timestamptz",
            "created?: timestamptz",
            "livemode?: boolean",
            "customer?: string",
            "customer_account?: string",
            "parent?: struct<type: string, subscription_details?: struct<subscription: string>>",
            "status?: string",
            "number?: string",
            "currency?: string",
            "subtotal?: long",
            "total?: long",
            "total_excluding_tax?: long",
            "amount_due?: long",
            "amount_paid?: long",
            "amount_remaining?: long",
            "amount_overpaid?: long",
            "attempt_count?: long",
            "billing_reason?: string",
            "collection_method?: string",
            "due_date?: timestamptz",
            "period_start?: timestamptz",
            "period_end?: timestamptz",
            "effective_at?: timestamptz",
            "status_transitions?: struct<finalized_at?: timestamptz, paid_at?: timestamptz, voided_at?: timestamptz, marked_uncollectible_at?: timestamptz>",
            "metadata?: map<string, string>",
            "_deleted?: boolean",
            "test_clock?: string",
            "customer_email?: string",
            "customer_name?: string",
            "customer_phone?: string",
            "customer_address?: struct<line1?: string, line2?: string, city?: string, state?: string, postal_code?: string, country?: string>",
            "customer_shipping?: struct<name: string, phone?: string, address: struct<line1?: string, line2?: string, city?: string, state?: string, postal_code?: string, country?: string>>",
          ],
          "prices": [
            "identifier: id",
            "id: string",
            "version?: timestamptz",
            "created?: timestamptz",
            "livemode?: boolean",
            "active?: boolean",
            "product?: string",
            "currency?: string",
            "type?: string",
            "billing_scheme?: string",
            "unit_amount?: long",
            "unit_amount_decimal?: string",
            "tiers_mode?: string",
            "lookup_key?: string",
            "nickname?: string",
            "tax_behavior?: string",
            "recurring?: struct<interval: string, interval_count: long, usage_type: string, meter?: string, trial_period_days?: long>",
            "metadata?: map<string, string>",
            "_deleted?: boolean",
          ],
          "products": [
            "identifier: id",
            "id: string",
            "version?: timestamptz",
            "created?: timestamptz",
            "updated?: timestamptz",
            "livemode?: boolean",
            "active?: boolean",
            "name?: string",
            "description?: string",
            "default_price?: string",
            "tax_code?: string",
            "unit_label?: string",
            "url?: string",
            "shippable?: boolean",
            "statement_descriptor?: string",
            "metadata?: map<string, string>",
            "_deleted?: boolean",
          ],
          "refunds": [
            "identifier: id",
            "id: string",
            "version?: timestamptz",
            "created?: timestamptz",
            "amount?: long",
            "currency?: string",
            "status?: string",
            "pending_reason?: string",
            "reason?: string",
            "failure_reason?: string",
            "charge?: string",
            "payment_intent?: string",
            "customer?: string",
            "customer_account?: string",
            "balance_transaction?: string",
            "metadata?: map<string, string>",
          ],
          "subscriptions": [
            "identifier: id",
            "id: string",
            "version?: timestamptz",
            "created?: timestamptz",
            "livemode?: boolean",
            "customer?: string",
            "customer_account?: string",
            "status?: string",
            "currency?: string",
            "collection_method?: string",
            "start_date?: timestamptz",
            "billing_cycle_anchor?: timestamptz",
            "cancel_at?: timestamptz",
            "cancel_at_period_end?: boolean",
            "canceled_at?: timestamptz",
            "ended_at?: timestamptz",
            "trial_start?: timestamptz",
            "trial_end?: timestamptz",
            "days_until_due?: long",
            "default_payment_method?: string",
            "latest_invoice?: string",
            "schedule?: string",
            "description?: string",
            "cancellation_details?: struct<reason?: string, feedback?: string, comment?: string>",
            "pause_collection?: struct<behavior: string, resumes_at?: timestamptz>",
            "items?: list<struct<id: string, created: timestamptz, price: struct<id: string, product: string>, quantity?: long, current_period_start: timestamptz, current_period_end: timestamptz>>",
            "metadata?: map<string, string>",
            "test_clock?: string",
          ],
        }
      `);
    }),
  );
});

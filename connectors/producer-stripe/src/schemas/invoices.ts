import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { Long, Metadata, UnixTime, address, deleted, shipping, version } from "./shared";

export const InvoiceSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Unique invoice identifier." })),
  version,
  created: UnixTime.pipe(Schema.annotateKey({ description: "Time when the invoice was created." })),
  livemode: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the invoice exists in live mode." }),
  ),
  // Stripe documents this as required, but accounts can use customer_account instead.
  customer: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Customer who is billed." }),
  ),
  customer_account: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Account that represents the customer, for Accounts v2." }),
  ),
  parent: Schema.NullOr(
    Schema.Struct({
      type: Schema.String.pipe(
        Schema.annotateKey({
          description: "What created the invoice, such as subscription_details.",
        }),
      ),
      subscription_details: Schema.NullOr(
        Schema.Struct({
          subscription: Schema.String.pipe(
            Schema.annotateKey({ description: "Subscription that created the invoice." }),
          ),
        }),
      ).pipe(Schema.annotateKey({ description: "Set when a subscription created the invoice." })),
    }),
  ).pipe(Schema.annotateKey({ description: "Object that created the invoice." })),
  status: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Status: draft, open, paid, uncollectible, or void." }),
  ),
  number: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Invoice number shown to the customer." }),
  ),
  currency: Schema.String.pipe(
    Schema.annotateKey({ description: "Three-letter currency code, in lowercase." }),
  ),
  subtotal: Long.pipe(
    Schema.annotateKey({ description: "Total before invoice-level discounts and exclusive tax." }),
  ),
  total: Long.pipe(Schema.annotateKey({ description: "Total after discounts and taxes." })),
  total_excluding_tax: Schema.NullOr(Long).pipe(
    Schema.annotateKey({ description: "Total after discounts, without tax." }),
  ),
  amount_due: Long.pipe(Schema.annotateKey({ description: "Amount due now." })),
  amount_paid: Long.pipe(Schema.annotateKey({ description: "Amount paid." })),
  amount_remaining: Long.pipe(Schema.annotateKey({ description: "Amount due minus amount paid." })),
  amount_overpaid: Long.pipe(
    Schema.annotateKey({ description: "Overpaid amount, credited to the customer balance." }),
  ),
  attempt_count: Long.pipe(
    Schema.annotateKey({ description: "Payment attempts made by the retry schedule." }),
  ),
  billing_reason: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Why the invoice was created." }),
  ),
  collection_method: Schema.String.pipe(
    Schema.annotateKey({
      description: "How the invoice is paid: charge_automatically or send_invoice.",
    }),
  ),
  due_date: Schema.NullOr(UnixTime).pipe(
    Schema.annotateKey({ description: "Due date. Only set for send_invoice." }),
  ),
  period_start: UnixTime.pipe(
    Schema.annotateKey({ description: "Earliest time items can belong to the invoice." }),
  ),
  period_end: UnixTime.pipe(
    Schema.annotateKey({ description: "Latest time items can belong to the invoice." }),
  ),
  effective_at: Schema.NullOr(UnixTime).pipe(Schema.annotateKey({ description: "Date of issue." })),
  status_transitions: Schema.Struct({
    finalized_at: Schema.NullOr(UnixTime).pipe(
      Schema.annotateKey({ description: "Time when the invoice was finalized." }),
    ),
    paid_at: Schema.NullOr(UnixTime).pipe(
      Schema.annotateKey({ description: "Time when the invoice was paid." }),
    ),
    voided_at: Schema.NullOr(UnixTime).pipe(
      Schema.annotateKey({ description: "Time when the invoice was voided." }),
    ),
    marked_uncollectible_at: Schema.NullOr(UnixTime).pipe(
      Schema.annotateKey({ description: "Time when the invoice was marked uncollectible." }),
    ),
  }).pipe(Schema.annotateKey({ description: "Times of status changes." })),
  metadata: Metadata.pipe(
    Schema.annotateKey({ description: "Key-value pairs set on the invoice." }),
  ),
  _deleted: deleted,
  test_clock: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Test clock the invoice belongs to. Sandbox only." }),
  ),
  customer_email: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Customer email. Fixed when the invoice is finalized." }),
  ),
  customer_name: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Customer name. Fixed when the invoice is finalized." }),
  ),
  customer_phone: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({
      description: "Customer phone number. Fixed when the invoice is finalized.",
    }),
  ),
  customer_address: Schema.NullOr(address).pipe(
    Schema.annotateKey({ description: "Customer address. Fixed when the invoice is finalized." }),
  ),
  customer_shipping: Schema.NullOr(shipping).pipe(
    Schema.annotateKey({
      description: "Customer shipping details. Fixed when the invoice is finalized.",
    }),
  ),
})
  .annotate({
    description: "Invoices in a Stripe account. Deleted drafts are marked deleted.",
  })
  .pipe(Iceberg.identifier("id"));

export type Invoice = Schema.Schema.Type<typeof InvoiceSchema>;

export const InvoiceObjectSchema = InvoiceSchema.mapFields(Struct.omit(["version", "_deleted"]));

export type InvoiceObject = Schema.Schema.Type<typeof InvoiceObjectSchema>;

import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { Long, Metadata, UnixTime, address, deleted, shipping, version } from "./shared";

const discountAmount = Schema.Struct({
  amount: Long.pipe(Schema.annotateKey({ description: "Discount in the smallest currency unit." })),
  discount: Schema.String.pipe(Schema.annotateKey({ description: "Discount applied." })),
});

const tax = Schema.Struct({
  amount: Long.pipe(Schema.annotateKey({ description: "Tax in the smallest currency unit." })),
  tax_behavior: Schema.String.pipe(Schema.annotateKey({ description: "Inclusive or exclusive." })),
  taxability_reason: Schema.String.pipe(
    Schema.annotateKey({ description: "Why this tax applies." }),
  ),
  taxable_amount: Schema.NullOr(Long).pipe(
    Schema.annotateKey({ description: "Amount used to calculate tax, if known." }),
  ),
  tax_rate_details: Schema.NullOr(
    Schema.Struct({
      tax_rate: Schema.String.pipe(Schema.annotateKey({ description: "Stripe tax rate ID." })),
    }),
  ).pipe(Schema.annotateKey({ description: "Tax rate details, if present." })),
  type: Schema.String.pipe(Schema.annotateKey({ description: "Type of tax information." })),
});

export const InvoiceLineSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Invoice line ID." })),
  amount: Long.pipe(
    Schema.annotateKey({ description: "Line amount in the smallest currency unit." }),
  ),
  subtotal: Long.pipe(
    Schema.annotateKey({ description: "Line amount before discounts and taxes." }),
  ),
  currency: Schema.String.pipe(Schema.annotateKey({ description: "Three-letter currency code." })),
  description: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Description shown on the invoice." }),
  ),
  quantity: Schema.NullOr(Long).pipe(Schema.annotateKey({ description: "Whole units billed." })),
  quantity_decimal: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Exact quantity billed, stored as decimal text." }),
  ),
  period: Schema.Struct({
    start: UnixTime.pipe(
      Schema.annotateKey({ description: "Start of the line's billing period." }),
    ),
    end: UnixTime.pipe(Schema.annotateKey({ description: "End of the line's billing period." })),
  }).pipe(Schema.annotateKey({ description: "Billing period covered by this line." })),
  pricing: Schema.NullOr(
    Schema.Struct({
      type: Schema.String.pipe(Schema.annotateKey({ description: "Type of pricing details." })),
      price_details: Schema.optionalKey(
        Schema.Struct({
          price: Schema.String.pipe(Schema.annotateKey({ description: "Stripe price ID." })),
          product: Schema.String.pipe(Schema.annotateKey({ description: "Stripe product ID." })),
        }),
      ).pipe(Schema.annotateKey({ description: "Price and product billed on the line." })),
      unit_amount_decimal: Schema.NullOr(Schema.String).pipe(
        Schema.annotateKey({ description: "Exact unit price, stored as decimal text." }),
      ),
    }),
  ).pipe(Schema.annotateKey({ description: "Pricing information for this line." })),
  discount_amounts: Schema.NullOr(Schema.Array(discountAmount)).pipe(
    Schema.annotateKey({ description: "Discounts applied to this line." }),
  ),
  taxes: Schema.NullOr(Schema.Array(tax)).pipe(
    Schema.annotateKey({ description: "Taxes applied to this line." }),
  ),
});

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
  total_discount_amounts: Schema.optionalKey(Schema.NullOr(Schema.Array(discountAmount))).pipe(
    Schema.annotateKey({ description: "Discount totals across the invoice, by discount." }),
  ),
  total_taxes: Schema.optionalKey(Schema.NullOr(Schema.Array(tax))).pipe(
    Schema.annotateKey({ description: "Tax totals across the invoice, by tax rate." }),
  ),
  lines: Schema.optionalKey(Schema.Array(InvoiceLineSchema)).pipe(
    Schema.annotateKey({
      description: "All invoice lines, including lines beyond the first page.",
    }),
  ),
})
  .annotate({
    description: "Invoices in a Stripe account. Deleted drafts are marked deleted.",
  })
  .pipe(Iceberg.identifier("id"));

export type Invoice = Schema.Schema.Type<typeof InvoiceSchema>;

export const InvoiceObjectSchema = InvoiceSchema.mapFields((fields) => ({
  ...Struct.omit(fields, ["version", "_deleted", "lines"]),
  lines: Schema.Struct({ data: Schema.Array(InvoiceLineSchema), has_more: Schema.Boolean }),
}));

export type InvoiceObject = Schema.Schema.Type<typeof InvoiceObjectSchema>;

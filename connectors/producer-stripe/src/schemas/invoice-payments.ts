import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { Long, UnixTime, version } from "./shared";

export const InvoicePaymentSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Stripe invoice payment ID." })),
  version,
  created: UnixTime.pipe(Schema.annotateKey({ description: "When the payment was created." })),
  invoice: Schema.String.pipe(
    Schema.annotateKey({ description: "Invoice the payment applies to." }),
  ),
  currency: Schema.String.pipe(Schema.annotateKey({ description: "Three-letter currency code." })),
  amount_requested: Long.pipe(
    Schema.annotateKey({ description: "Amount requested, in the smallest currency unit." }),
  ),
  amount_paid: Schema.NullOr(Long).pipe(
    Schema.annotateKey({
      description: "Amount credited to the invoice, in the smallest currency unit.",
    }),
  ),
  is_default: Schema.Boolean.pipe(
    Schema.annotateKey({
      description: "Whether Stripe created this as the default invoice payment.",
    }),
  ),
  livemode: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether this is a live payment." }),
  ),
  payment: Schema.Struct({
    type: Schema.String.pipe(Schema.annotateKey({ description: "Type of payment object." })),
    charge: Schema.optionalKey(Schema.NullOr(Schema.String)).pipe(
      Schema.annotateKey({
        description: "Charge ID, when the payment links directly to a charge.",
      }),
    ),
    payment_intent: Schema.optionalKey(Schema.NullOr(Schema.String)).pipe(
      Schema.annotateKey({ description: "Payment intent ID, also present on linked charges." }),
    ),
    payment_record: Schema.optionalKey(Schema.NullOr(Schema.String)).pipe(
      Schema.annotateKey({ description: "Payment record ID, when the payment links to a record." }),
    ),
  }).pipe(Schema.annotateKey({ description: "Stripe payment object linked to the invoice." })),
  status: Schema.String.pipe(Schema.annotateKey({ description: "Status of the invoice payment." })),
  status_transitions: Schema.Struct({
    paid_at: Schema.NullOr(UnixTime).pipe(Schema.annotateKey({ description: "When it was paid." })),
    canceled_at: Schema.NullOr(UnixTime).pipe(
      Schema.annotateKey({ description: "When it was canceled." }),
    ),
  }).pipe(Schema.annotateKey({ description: "When the payment changed status." })),
})
  .annotate({ description: "Paid invoice payments and their links to Stripe payment objects." })
  .pipe(Iceberg.identifier("id"));

export const InvoicePaymentObjectSchema = InvoicePaymentSchema.mapFields(Struct.omit(["version"]));

export type InvoicePayment = typeof InvoicePaymentSchema.Type;
export type InvoicePaymentObject = typeof InvoicePaymentObjectSchema.Type;

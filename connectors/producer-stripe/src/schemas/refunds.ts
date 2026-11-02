import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { Long, Metadata, UnixTime, version } from "./shared";

export const RefundSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Unique refund identifier." })),
  version,
  created: UnixTime.pipe(Schema.annotateKey({ description: "Time when the refund was created." })),
  amount: Long.pipe(
    Schema.annotateKey({ description: "Refunded amount, in the smallest currency unit." }),
  ),
  currency: Schema.String.pipe(
    Schema.annotateKey({ description: "Three-letter currency code, in lowercase." }),
  ),
  status: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({
      description: "Status: pending, requires_action, succeeded, failed, or canceled.",
    }),
  ),
  pending_reason: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Why the refund is pending." }),
  ),
  reason: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Why the refund was made." }),
  ),
  failure_reason: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Why the refund failed." }),
  ),
  charge: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Charge that was refunded." }),
  ),
  payment_intent: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Payment intent that was refunded." }),
  ),
  customer: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Customer of the refund." }),
  ),
  customer_account: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Account that represents the customer, for Accounts v2." }),
  ),
  balance_transaction: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Balance transaction for the refund." }),
  ),
  metadata: Metadata.pipe(
    Schema.annotateKey({ description: "Key-value pairs set on the refund." }),
  ),
})
  .annotate({
    description: "Refunds in a Stripe account.",
  })
  .pipe(Iceberg.identifier("id"));

export type Refund = Schema.Schema.Type<typeof RefundSchema>;

export const RefundObjectSchema = RefundSchema.mapFields(Struct.omit(["version"]));

export type RefundObject = Schema.Schema.Type<typeof RefundObjectSchema>;

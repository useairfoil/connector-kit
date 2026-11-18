import * as Iceberg from "@useairfoil/connector-kit/iceberg";
import { Schema, Struct } from "effect";

import { Long, UnixTime, version } from "./shared";

export const PaymentIntentSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Payment intent ID." })),
  version,
  created: UnixTime.pipe(
    Schema.annotateKey({ description: "Time when the payment intent was created." }),
  ),
  status: Schema.String.pipe(Schema.annotateKey({ description: "Payment intent status." })),
  amount: Schema.optional(Long).pipe(
    Schema.annotateKey({ description: "Amount to collect, in the smallest currency unit." }),
  ),
  amount_received: Schema.optional(Long).pipe(
    Schema.annotateKey({ description: "Amount received, in the smallest currency unit." }),
  ),
  currency: Schema.optional(Schema.String).pipe(
    Schema.annotateKey({ description: "Three-letter currency code." }),
  ),
  customer: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Customer of the payment intent." }),
  ),
  latest_charge: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Latest charge created by this payment intent." }),
  ),
  payment_method: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Payment method used for this payment intent." }),
  ),
  cancellation_reason: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Why the payment intent was canceled." }),
  ),
  canceled_at: Schema.optional(Schema.NullOr(UnixTime)).pipe(
    Schema.annotateKey({ description: "Time when the payment intent was canceled." }),
  ),
  livemode: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the object is in live mode." }),
  ),
})
  .annotate({ description: "Payment attempts and their status." })
  .pipe(Iceberg.identifier("id"));

export type PaymentIntent = Schema.Schema.Type<typeof PaymentIntentSchema>;

export const PaymentIntentObjectSchema = PaymentIntentSchema.mapFields(Struct.omit(["version"]));

export type PaymentIntentObject = Schema.Schema.Type<typeof PaymentIntentObjectSchema>;

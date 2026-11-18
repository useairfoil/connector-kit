import * as Iceberg from "@useairfoil/connector-kit/iceberg";
import { Option, Schema } from "effect";

import { JsonSchema, date, nullableDate } from "./shared";

const PaymentInputSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Unique payment identifier." })),
  created_at: date("Time when the payment was created."),
  modified_at: nullableDate("Time when the payment was last changed."),
  status: Schema.String.pipe(Schema.annotateKey({ description: "Current payment status." })),
  amount: Schema.Int.pipe(
    Schema.annotateKey({ description: "Payment amount in the smallest currency unit." }),
  ),
  currency: Schema.String.pipe(Schema.annotateKey({ description: "Three-letter currency code." })),
  processor: Schema.String.pipe(Schema.annotateKey({ description: "Payment processor." })),
  method: Schema.String.pipe(Schema.annotateKey({ description: "Type of payment method." })),
  trigger: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "What started the payment, such as a subscription cycle." }),
  ),
  decline_reason: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Reason code if the payment was declined." }),
  ),
  decline_message: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Message if the payment was declined." }),
  ),
  organization_id: Schema.String.pipe(
    Schema.annotateKey({ description: "Organization that owns the payment." }),
  ),
  checkout_id: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Checkout that started the payment." }),
  ),
  order_id: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Order paid by this payment." }),
  ),
  processor_metadata: Schema.optional(JsonSchema).pipe(
    Schema.annotateKey({ description: "Processor details stored as JSON." }),
  ),
  method_metadata: Schema.optional(JsonSchema).pipe(
    Schema.annotateKey({ description: "Payment method details, such as card brand, as JSON." }),
  ),
});

export const PaymentSchema = PaymentInputSchema.pipe(
  Schema.extendTo(
    {
      version: Schema.Date.pipe(
        Schema.annotateKey({ description: "Time used to order payment changes." }),
      ),
    },
    { version: (row) => Option.some(row.modified_at ?? row.created_at) },
  ),
)
  .annotate({ description: "Payment attempts in a Polar organization." })
  .pipe(Iceberg.identifier("id"));

export type Payment = Schema.Schema.Type<typeof PaymentSchema>;

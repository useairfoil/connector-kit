import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { Long, UnixTime, version } from "./shared";

export const DisputeSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Dispute ID." })),
  version,
  created: UnixTime.pipe(Schema.annotateKey({ description: "Time when the dispute was opened." })),
  amount: Long.pipe(
    Schema.annotateKey({ description: "Disputed amount, in the smallest currency unit." }),
  ),
  currency: Schema.String.pipe(Schema.annotateKey({ description: "Three-letter currency code." })),
  charge: Schema.String.pipe(Schema.annotateKey({ description: "Disputed charge." })),
  payment_intent: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Payment intent of the disputed charge." }),
  ),
  reason: Schema.String.pipe(
    Schema.annotateKey({ description: "Reason given by the cardholder." }),
  ),
  status: Schema.String.pipe(Schema.annotateKey({ description: "Dispute status." })),
  is_charge_refundable: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the charge can still be refunded." }),
  ),
})
  .annotate({ description: "Payment disputes and their current status." })
  .pipe(Iceberg.identifier("id"));

export type Dispute = Schema.Schema.Type<typeof DisputeSchema>;

export const DisputeObjectSchema = DisputeSchema.mapFields(Struct.omit(["version"]));

export type DisputeObject = Schema.Schema.Type<typeof DisputeObjectSchema>;

import { Iceberg } from "@useairfoil/connector-kit";
import { Option, Schema } from "effect";

import { date, nullableDate } from "./shared";

const DisputeInputSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Unique dispute identifier." })),
  created_at: date("Time when the dispute was opened."),
  modified_at: nullableDate("Time when the dispute was last changed."),
  status: Schema.String.pipe(Schema.annotateKey({ description: "Current dispute status." })),
  resolved: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the dispute is resolved." }),
  ),
  closed: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the dispute is closed." }),
  ),
  amount: Schema.Int.pipe(
    Schema.annotateKey({ description: "Disputed amount in the smallest currency unit." }),
  ),
  tax_amount: Schema.Int.pipe(
    Schema.annotateKey({ description: "Disputed tax in the smallest currency unit." }),
  ),
  currency: Schema.String.pipe(Schema.annotateKey({ description: "Three-letter currency code." })),
  reason: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Reason for the dispute." }),
  ),
  evidence_due_by: nullableDate("Deadline to send evidence."),
  past_due: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the evidence deadline has passed." }),
  ),
  order_id: Schema.String.pipe(Schema.annotateKey({ description: "Disputed order." })),
  payment_id: Schema.String.pipe(Schema.annotateKey({ description: "Disputed payment." })),
  case_id: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Support case linked to the dispute." }),
  ),
});

export const DisputeSchema = DisputeInputSchema.pipe(
  Schema.extendTo(
    {
      version: Schema.Date.pipe(
        Schema.annotateKey({ description: "Time used to order dispute changes." }),
      ),
    },
    { version: (row) => Option.some(row.modified_at ?? row.created_at) },
  ),
)
  .annotate({ description: "Payment disputes in a Polar organization." })
  .pipe(Iceberg.identifier("id"));

export type Dispute = Schema.Schema.Type<typeof DisputeSchema>;

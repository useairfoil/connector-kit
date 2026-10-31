import { Iceberg } from "@useairfoil/connector-kit";
import { Option, Schema } from "effect";

import { MetadataJsonSchema, date, nullableDate } from "./shared";

const RefundInputSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Unique refund identifier." })),
  created_at: date("Time when the refund was created."),
  modified_at: nullableDate("Time when the refund was last changed."),
  status: Schema.Literals(["pending", "succeeded", "failed", "canceled"]).pipe(
    Schema.annotateKey({ description: "Current refund status." }),
  ),
  reason: Schema.Literals([
    "duplicate",
    "fraudulent",
    "customer_request",
    "service_disruption",
    "satisfaction_guarantee",
    "dispute_prevention",
    "other",
  ]).pipe(Schema.annotateKey({ description: "Reason for the refund." })),
  amount: Schema.Int.pipe(
    Schema.annotateKey({ description: "Refunded amount in the smallest currency unit." }),
  ),
  tax_amount: Schema.Int.pipe(
    Schema.annotateKey({ description: "Refunded tax in the smallest currency unit." }),
  ),
  currency: Schema.String.pipe(Schema.annotateKey({ description: "Three-letter currency code." })),
  organization_id: Schema.String.pipe(
    Schema.annotateKey({ description: "Organization that owns the refund." }),
  ),
  order_id: Schema.String.pipe(Schema.annotateKey({ description: "Order that was refunded." })),
  subscription_id: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Subscription linked to the refunded order." }),
  ),
  customer_id: Schema.String.pipe(
    Schema.annotateKey({ description: "Customer who received the refund." }),
  ),
  revoke_benefits: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the refund revoked benefits." }),
  ),
  metadata: MetadataJsonSchema.pipe(
    Schema.annotateKey({ description: "Refund metadata stored as JSON." }),
  ),
});

export const RefundSchema = RefundInputSchema.pipe(
  Schema.extendTo(
    {
      version: Schema.Date.pipe(
        Schema.annotateKey({ description: "Time used to order refund changes." }),
      ),
    },
    { version: (row) => Option.some(row.modified_at ?? row.created_at) },
  ),
)
  .annotate({
    description: "Refunds in a Polar organization.",
  })
  .pipe(Iceberg.identifier("id"));

export type Refund = Schema.Schema.Type<typeof RefundSchema>;

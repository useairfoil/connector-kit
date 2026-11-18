import * as Iceberg from "@useairfoil/connector-kit/iceberg";
import { Option, Schema } from "effect";

import { date, nullableDate } from "./shared";

const BenefitGrantInputSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Unique identifier." })),
  created_at: date("Time when the record was created."),
  modified_at: nullableDate("Time when the record was last changed."),
  benefit_id: Schema.String.pipe(Schema.annotateKey({ description: "Granted benefit." })),
  customer_id: Schema.String.pipe(
    Schema.annotateKey({ description: "Customer who has the grant." }),
  ),
  member_id: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Customer member who has the grant." }),
  ),
  order_id: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Order that gave the grant." }),
  ),
  subscription_id: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Subscription that gave the grant." }),
  ),
  is_granted: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the benefit is granted." }),
  ),
  is_revoked: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the benefit is revoked." }),
  ),
  granted_at: Schema.optional(Schema.NullOr(Schema.DateFromString)).pipe(
    Schema.annotateKey({ description: "Time when the benefit was granted." }),
  ),
  revoked_at: Schema.optional(Schema.NullOr(Schema.DateFromString)).pipe(
    Schema.annotateKey({ description: "Time when the benefit was revoked." }),
  ),
});

export const BenefitGrantSchema = BenefitGrantInputSchema.pipe(
  Schema.extendTo(
    {
      version: Schema.Date.pipe(Schema.annotateKey({ description: "Time used to order changes." })),
    },
    { version: (row) => Option.some(row.modified_at ?? row.created_at) },
  ),
)
  .annotate({ description: "Benefits granted to customers." })
  .pipe(Iceberg.identifier("id"));

export type BenefitGrant = Schema.Schema.Type<typeof BenefitGrantSchema>;

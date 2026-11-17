import { Iceberg } from "@useairfoil/connector-kit";
import { Option, Schema } from "effect";

import { MetadataJsonSchema, date, nullableDate } from "./shared";

const CheckoutLinkInputSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Unique identifier." })),
  created_at: date("Time when the record was created."),
  modified_at: nullableDate("Time when the record was last changed."),
  organization_id: Schema.String.pipe(
    Schema.annotateKey({ description: "Organization that owns the link." }),
  ),
  label: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Internal label for the link." }),
  ),
  payment_processor: Schema.String.pipe(Schema.annotateKey({ description: "Payment processor." })),
  success_url: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Where customers go after paying." }),
  ),
  return_url: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Where customers go when they leave the checkout." }),
  ),
  trial_interval: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Trial interval unit." }),
  ),
  trial_interval_count: Schema.NullOr(Schema.Int).pipe(
    Schema.annotateKey({ description: "Number of trial intervals." }),
  ),
  allow_discount_codes: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether customers can enter discount codes." }),
  ),
  require_billing_address: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether a billing address is required." }),
  ),
  discount_id: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Discount applied by the link." }),
  ),
  seats: Schema.optional(Schema.NullOr(Schema.Int)).pipe(
    Schema.annotateKey({ description: "Preset seat count." }),
  ),
  units: Schema.optional(Schema.NullOr(Schema.Int)).pipe(
    Schema.annotateKey({ description: "Preset unit count." }),
  ),
  products: Schema.Array(
    Schema.Struct({ id: Schema.String.pipe(Schema.annotateKey({ description: "Product ID." })) }),
  ).pipe(Schema.annotateKey({ description: "Products offered by the link." })),
  metadata: MetadataJsonSchema.pipe(
    Schema.annotateKey({ description: "Link metadata stored as JSON." }),
  ),
});

export const CheckoutLinkSchema = CheckoutLinkInputSchema.pipe(
  Schema.extendTo(
    {
      version: Schema.Date.pipe(Schema.annotateKey({ description: "Time used to order changes." })),
    },
    { version: (row) => Option.some(row.modified_at ?? row.created_at) },
  ),
)
  .annotate({ description: "Reusable checkout links." })
  .pipe(Iceberg.identifier("id"));

export type CheckoutLink = Schema.Schema.Type<typeof CheckoutLinkSchema>;

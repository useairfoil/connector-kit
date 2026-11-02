import { Iceberg } from "@useairfoil/connector-kit";
import { Option, Schema } from "effect";

import { DiscountAmountsJsonSchema, MetadataJsonSchema, date, nullableDate } from "./shared";

const DiscountProductSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Product the discount applies to." })),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Product name." })),
});

const DiscountInputSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Unique discount identifier." })),
  created_at: date("Time when the discount was created."),
  modified_at: nullableDate("Time when the discount was last changed."),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Discount name." })),
  code: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Code customers enter at checkout." }),
  ),
  type: Schema.Literals(["fixed", "percentage"]).pipe(
    Schema.annotateKey({ description: "Discount type." }),
  ),
  duration: Schema.Literals(["once", "forever", "repeating"]).pipe(
    Schema.annotateKey({ description: "How long the discount applies." }),
  ),
  duration_in_months: Schema.optional(Schema.NullOr(Schema.Int)).pipe(
    Schema.annotateKey({ description: "Months a repeating discount applies." }),
  ),
  amount: Schema.optional(Schema.NullOr(Schema.Int)).pipe(
    Schema.annotateKey({ description: "Fixed discount in the smallest currency unit." }),
  ),
  currency: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Currency of a fixed discount." }),
  ),
  amounts: Schema.optional(DiscountAmountsJsonSchema).pipe(
    Schema.annotateKey({ description: "Fixed discount amounts by currency stored as JSON." }),
  ),
  basis_points: Schema.optional(Schema.NullOr(Schema.Int)).pipe(
    Schema.annotateKey({ description: "Percentage discount in basis points." }),
  ),
  starts_at: nullableDate("Time when the discount starts."),
  ends_at: nullableDate("Time when the discount ends."),
  max_redemptions: Schema.NullOr(Schema.Int).pipe(
    Schema.annotateKey({ description: "Maximum number of redemptions." }),
  ),
  max_redemptions_per_customer: Schema.optional(Schema.NullOr(Schema.Int)).pipe(
    Schema.annotateKey({ description: "Maximum redemptions for each customer." }),
  ),
  redemptions_count: Schema.Int.pipe(
    Schema.annotateKey({ description: "Number of times the discount was redeemed." }),
  ),
  organization_id: Schema.String.pipe(
    Schema.annotateKey({ description: "Organization that owns the discount." }),
  ),
  metadata: MetadataJsonSchema.pipe(
    Schema.annotateKey({ description: "Discount metadata stored as JSON." }),
  ),
  products: Schema.Array(DiscountProductSchema).pipe(
    Schema.annotateKey({ description: "Products the discount is limited to." }),
  ),
});

export const DiscountSchema = DiscountInputSchema.pipe(
  Schema.extendTo(
    {
      version: Schema.Date.pipe(
        Schema.annotateKey({ description: "Time used to order discount changes." }),
      ),
      _deleted: Schema.optional(Schema.Boolean).pipe(
        Schema.annotateKey({ description: "Whether the discount was deleted." }),
      ),
    },
    {
      version: (row) => Option.some(row.modified_at ?? row.created_at),
      // Only `discount.deleted` sets this. A deleted discount can't come back.
      _deleted: () => Option.none(),
    },
  ),
)
  .annotate({
    description: "Discounts in a Polar organization.",
  })
  .pipe(Iceberg.identifier("id"));

export type Discount = Schema.Schema.Type<typeof DiscountSchema>;

import { Iceberg } from "@useairfoil/connector-kit";
import { Option, Schema } from "effect";

import { MetadataJsonSchema, date, nullableDate } from "./shared";

const intervalLiterals = ["day", "week", "month", "year"] as const;

const tierTypeLiterals = ["volume", "graduated"] as const;

const PriceTiersJsonSchema = Schema.flip(
  Schema.fromJsonString(
    Schema.Struct({
      type: Schema.Literals(tierTypeLiterals),
      tiers: Schema.Array(
        Schema.Struct({
          bound: Schema.optional(Schema.NullOr(Schema.Int)),
          unit_amount: Schema.String,
        }),
      ),
    }),
  ),
);

const SeatTiersJsonSchema = Schema.flip(
  Schema.fromJsonString(
    Schema.Struct({
      seat_tier_type: Schema.optional(Schema.Literals(tierTypeLiterals)),
      tiers: Schema.Array(
        Schema.Struct({
          min_seats: Schema.Int,
          max_seats: Schema.optional(Schema.NullOr(Schema.Int)),
          price_per_seat: Schema.Int,
        }),
      ),
      minimum_seats: Schema.Int,
      maximum_seats: Schema.NullOr(Schema.Int),
    }),
  ),
);

export const ProductPriceSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Unique price identifier." })),
  created_at: date("Time when the price was created."),
  modified_at: nullableDate("Time when the price was last changed."),
  amount_type: Schema.Literals([
    "fixed",
    "custom",
    "seat_based",
    "unit_based",
    "metered_unit",
    "metered_tiers",
  ]).pipe(Schema.annotateKey({ description: "How the price amount is set." })),
  price_currency: Schema.String.pipe(
    Schema.annotateKey({ description: "Three-letter currency code." }),
  ),
  is_archived: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the price is archived." }),
  ),
  tax_behavior: Schema.NullOr(Schema.Literals(["location", "inclusive", "exclusive"])).pipe(
    Schema.annotateKey({ description: "How tax is applied." }),
  ),
  source: Schema.Literals(["catalog", "ad_hoc"]).pipe(
    Schema.annotateKey({ description: "Where the price came from." }),
  ),
  price_amount: Schema.optional(Schema.NullOr(Schema.Int)).pipe(
    Schema.annotateKey({ description: "Fixed price in the smallest currency unit." }),
  ),
  minimum_amount: Schema.optional(Schema.NullOr(Schema.Int)).pipe(
    Schema.annotateKey({ description: "Minimum amount for a custom price." }),
  ),
  maximum_amount: Schema.optional(Schema.NullOr(Schema.Int)).pipe(
    Schema.annotateKey({ description: "Maximum amount for a custom price." }),
  ),
  preset_amount: Schema.optional(Schema.NullOr(Schema.Int)).pipe(
    Schema.annotateKey({ description: "Suggested amount for a custom price." }),
  ),
  unit_amount: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Metered price per unit as a decimal string." }),
  ),
  cap_amount: Schema.optional(Schema.NullOr(Schema.Int)).pipe(
    Schema.annotateKey({ description: "Maximum metered charge per period." }),
  ),
  meter_id: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Meter used by a metered price." }),
  ),
  tiers: Schema.optional(PriceTiersJsonSchema).pipe(
    Schema.annotateKey({ description: "Unit or metered price tiers stored as JSON." }),
  ),
  seat_tiers: Schema.optional(SeatTiersJsonSchema).pipe(
    Schema.annotateKey({ description: "Seat price tiers stored as JSON." }),
  ),
  minimum_units: Schema.optional(Schema.NullOr(Schema.Int)).pipe(
    Schema.annotateKey({ description: "Minimum units that can be bought." }),
  ),
  maximum_units: Schema.optional(Schema.NullOr(Schema.Int)).pipe(
    Schema.annotateKey({ description: "Maximum units that can be bought." }),
  ),
});

const ProductInputSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Unique product identifier." })),
  created_at: date("Time when the product was created."),
  modified_at: nullableDate("Time when the product was last changed."),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Product name." })),
  description: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Product description." }),
  ),
  visibility: Schema.Literals(["draft", "private", "public"]).pipe(
    Schema.annotateKey({ description: "Where the product is shown." }),
  ),
  is_recurring: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the product is a subscription." }),
  ),
  is_archived: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the product is archived." }),
  ),
  recurring_interval: Schema.NullOr(Schema.Literals(intervalLiterals)).pipe(
    Schema.annotateKey({ description: "Unit used for recurring billing." }),
  ),
  recurring_interval_count: Schema.NullOr(Schema.Int).pipe(
    Schema.annotateKey({ description: "Number of recurring billing intervals." }),
  ),
  trial_interval: Schema.NullOr(Schema.Literals(intervalLiterals)).pipe(
    Schema.annotateKey({ description: "Unit for the trial." }),
  ),
  trial_interval_count: Schema.NullOr(Schema.Int).pipe(
    Schema.annotateKey({ description: "Number of trial intervals." }),
  ),
  meter_interval: Schema.optional(Schema.NullOr(Schema.Literals(intervalLiterals))).pipe(
    Schema.annotateKey({ description: "Unit used for metered billing." }),
  ),
  meter_interval_count: Schema.optional(Schema.NullOr(Schema.Int)).pipe(
    Schema.annotateKey({ description: "Number of metered billing intervals." }),
  ),
  organization_id: Schema.String.pipe(
    Schema.annotateKey({ description: "Organization that owns the product." }),
  ),
  metadata: MetadataJsonSchema.pipe(
    Schema.annotateKey({ description: "Product metadata stored as JSON." }),
  ),
  prices: Schema.Array(ProductPriceSchema).pipe(
    Schema.annotateKey({ description: "Prices for the product." }),
  ),
});

export const ProductSchema = ProductInputSchema.pipe(
  Schema.extendTo(
    {
      version: Schema.Date.pipe(
        Schema.annotateKey({ description: "Time used to order product changes." }),
      ),
    },
    { version: (row) => Option.some(row.modified_at ?? row.created_at) },
  ),
)
  .annotate({
    description: "Products in a Polar organization.",
  })
  .pipe(Iceberg.identifier("id"));

export type ProductPrice = Schema.Schema.Type<typeof ProductPriceSchema>;

export type Product = Schema.Schema.Type<typeof ProductSchema>;

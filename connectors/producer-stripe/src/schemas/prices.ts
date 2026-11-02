import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { Long, Metadata, UnixTime, deleted, version } from "./shared";

export const PriceSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Unique price identifier." })),
  version,
  created: UnixTime.pipe(Schema.annotateKey({ description: "Time when the price was created." })),
  livemode: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the price exists in live mode." }),
  ),
  active: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the price can be used for new purchases." }),
  ),
  product: Schema.String.pipe(Schema.annotateKey({ description: "Product the price belongs to." })),
  currency: Schema.String.pipe(
    Schema.annotateKey({ description: "Three-letter currency code, in lowercase." }),
  ),
  type: Schema.String.pipe(
    Schema.annotateKey({ description: "Price type: one_time or recurring." }),
  ),
  billing_scheme: Schema.String.pipe(
    Schema.annotateKey({ description: "How the amount is computed: per_unit or tiered." }),
  ),
  unit_amount: Schema.NullOr(Long).pipe(
    Schema.annotateKey({
      description: "Unit amount in the smallest currency unit. Null for tiered prices.",
    }),
  ),
  unit_amount_decimal: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Unit amount as a decimal string, for sub-cent amounts." }),
  ),
  tiers_mode: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Tier mode: graduated or volume." }),
  ),
  lookup_key: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Key used to look up the price." }),
  ),
  nickname: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Internal name of the price." }),
  ),
  tax_behavior: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Whether tax is inclusive, exclusive, or unspecified." }),
  ),
  recurring: Schema.NullOr(
    Schema.Struct({
      interval: Schema.String.pipe(
        Schema.annotateKey({ description: "Billing interval: day, week, month, or year." }),
      ),
      interval_count: Long.pipe(
        Schema.annotateKey({ description: "Number of intervals between bills." }),
      ),
      usage_type: Schema.String.pipe(
        Schema.annotateKey({ description: "Usage type: licensed or metered." }),
      ),
      meter: Schema.optional(Schema.NullOr(Schema.String)).pipe(
        Schema.annotateKey({ description: "Meter that tracks usage for metered prices." }),
      ),
      trial_period_days: Schema.optional(Schema.NullOr(Long)).pipe(
        Schema.annotateKey({ description: "Default trial length in days." }),
      ),
    }),
  ).pipe(Schema.annotateKey({ description: "Billing period of recurring prices." })),
  metadata: Metadata.pipe(Schema.annotateKey({ description: "Key-value pairs set on the price." })),
  _deleted: deleted,
})
  .annotate({
    description: "Prices in a Stripe account, including inactive ones.",
  })
  .pipe(Iceberg.identifier("id"));

export type Price = Schema.Schema.Type<typeof PriceSchema>;

export const PriceObjectSchema = PriceSchema.mapFields(Struct.omit(["version", "_deleted"]));

export type PriceObject = Schema.Schema.Type<typeof PriceObjectSchema>;

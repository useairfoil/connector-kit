import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { Long, UnixTime, deleted, version } from "./shared";

export const CouponSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Coupon ID." })),
  version,
  created: UnixTime.pipe(Schema.annotateKey({ description: "Time when the coupon was created." })),
  name: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Name shown to customers." }),
  ),
  duration: Schema.String.pipe(
    Schema.annotateKey({
      description: "How long the discount lasts: once, repeating, or forever.",
    }),
  ),
  duration_in_months: Schema.optional(Schema.NullOr(Long)).pipe(
    Schema.annotateKey({ description: "Months the discount lasts, for repeating coupons." }),
  ),
  amount_off: Schema.optional(Schema.NullOr(Long)).pipe(
    Schema.annotateKey({ description: "Fixed discount in the smallest currency unit." }),
  ),
  percent_off: Schema.optional(Schema.NullOr(Schema.Finite)).pipe(
    Schema.annotateKey({ description: "Percentage discount." }),
  ),
  currency: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Currency of amount_off." }),
  ),
  max_redemptions: Schema.optional(Schema.NullOr(Long)).pipe(
    Schema.annotateKey({ description: "Maximum number of redemptions." }),
  ),
  times_redeemed: Long.pipe(Schema.annotateKey({ description: "Number of redemptions so far." })),
  redeem_by: Schema.optional(Schema.NullOr(UnixTime)).pipe(
    Schema.annotateKey({ description: "Last time the coupon can be redeemed." }),
  ),
  valid: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the coupon can still be applied." }),
  ),
  _deleted: deleted,
})
  .annotate({ description: "Discount definitions." })
  .pipe(Iceberg.identifier("id"));

export type Coupon = Schema.Schema.Type<typeof CouponSchema>;

export const CouponObjectSchema = CouponSchema.mapFields(Struct.omit(["version", "_deleted"]));

export type CouponObject = Schema.Schema.Type<typeof CouponObjectSchema>;

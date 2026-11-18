import * as Iceberg from "@useairfoil/connector-kit/iceberg";
import { Schema, Struct } from "effect";

import { Long, UnixTime, version } from "./shared";

export const PromotionCodeSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Promotion code ID." })),
  version,
  created: UnixTime.pipe(
    Schema.annotateKey({ description: "Time when the promotion code was created." }),
  ),
  code: Schema.String.pipe(Schema.annotateKey({ description: "Code entered at checkout." })),
  active: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the code can be redeemed." }),
  ),
  customer: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Only customer who can redeem the code." }),
  ),
  expires_at: Schema.optional(Schema.NullOr(UnixTime)).pipe(
    Schema.annotateKey({ description: "Time when the code expires." }),
  ),
  max_redemptions: Schema.optional(Schema.NullOr(Long)).pipe(
    Schema.annotateKey({ description: "Maximum number of redemptions." }),
  ),
  times_redeemed: Long.pipe(Schema.annotateKey({ description: "Number of redemptions so far." })),
  promotion: Schema.Struct({
    type: Schema.String.pipe(Schema.annotateKey({ description: "Promotion type." })),
    coupon: Schema.optional(Schema.NullOr(Schema.String)).pipe(
      Schema.annotateKey({ description: "Coupon applied by the code." }),
    ),
  }).pipe(Schema.annotateKey({ description: "Promotion to which the code applies." })),
})
  .annotate({ description: "Customer-facing codes for promotions." })
  .pipe(Iceberg.identifier("id"));

export type PromotionCode = Schema.Schema.Type<typeof PromotionCodeSchema>;

export const PromotionCodeObjectSchema = PromotionCodeSchema.mapFields(Struct.omit(["version"]));

export type PromotionCodeObject = Schema.Schema.Type<typeof PromotionCodeObjectSchema>;

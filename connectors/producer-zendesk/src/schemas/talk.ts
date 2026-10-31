import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { Long, Timestamp } from "./shared";

export const TalkLineSchema = Schema.Struct({
  id: Long.pipe(Schema.annotateKey({ description: "Line ID." })),
  version: Schema.Date.pipe(
    Schema.annotateKey({ description: "Time the line was read. Lines have no update time." }),
  ),
  created_at: Timestamp.pipe(Schema.annotateKey({ description: "Time the line was added." })),
  line_type: Schema.String.pipe(Schema.annotateKey({ description: "phone or digital." })),
  nickname: Schema.NullOr(Schema.String).pipe(Schema.annotateKey({ description: "Line name." })),
  number: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Phone number. Empty for digital lines." }),
  ),
  display_number: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Phone number as shown." }),
  ),
  country_code: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Country of the number." }),
  ),
  toll_free: Schema.NullOr(Schema.Boolean).pipe(
    Schema.annotateKey({ description: "Whether the number is toll free." }),
  ),
  brand_id: Schema.NullOr(Long).pipe(Schema.annotateKey({ description: "Brand of the line." })),
  default_group_id: Schema.NullOr(Long).pipe(
    Schema.annotateKey({ description: "Group calls go to first." }),
  ),
  group_ids: Schema.Array(Long).pipe(
    Schema.annotateKey({ description: "Groups that take calls." }),
  ),
  priority: Long.pipe(Schema.annotateKey({ description: "Priority of calls on the line." })),
  recorded: Schema.Boolean.pipe(Schema.annotateKey({ description: "Whether calls are recorded." })),
  transcription: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether voicemails are transcribed." }),
  ),
})
  .annotate({ description: "Zendesk Talk lines: phone numbers and digital lines." })
  .pipe(Iceberg.identifier("id"));

export type TalkLine = Schema.Schema.Type<typeof TalkLineSchema>;

// Digital lines leave out the phone number fields, and phone lines the brand.
export const TalkLineObjectSchema = TalkLineSchema.mapFields((fields) => ({
  ...Struct.omit(fields, [
    "version",
    "number",
    "display_number",
    "country_code",
    "toll_free",
    "brand_id",
  ]),
  brand_id: Schema.optional(fields.brand_id),
  number: Schema.optional(fields.number),
  display_number: Schema.optional(fields.display_number),
  country_code: Schema.optional(fields.country_code),
  toll_free: Schema.optional(fields.toll_free),
}));

export type TalkLineObject = Schema.Schema.Type<typeof TalkLineObjectSchema>;

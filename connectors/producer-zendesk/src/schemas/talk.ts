import * as Iceberg from "@useairfoil/connector-kit/iceberg";
import { Schema, Struct } from "effect";

import { Long, Timestamp, version } from "./shared";

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

const callTimes = (object: string) => ({
  completion_status: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "How the call ended, such as completed or abandoned." }),
  ),
  duration: Schema.optional(Schema.NullOr(Long)).pipe(
    Schema.annotateKey({ description: `Length of the ${object} in seconds.` }),
  ),
  created_at: Timestamp.pipe(Schema.annotateKey({ description: `Time the ${object} started.` })),
  updated_at: Timestamp.pipe(
    Schema.annotateKey({ description: `Time the ${object} was last updated.` }),
  ),
});

export const TalkCallSchema = Schema.Struct({
  id: Long.pipe(Schema.annotateKey({ description: "Call ID." })),
  version: version("call"),
  ticket_id: Schema.optional(Schema.NullOr(Long)).pipe(
    Schema.annotateKey({ description: "Ticket made for the call." }),
  ),
  agent_id: Schema.optional(Schema.NullOr(Long)).pipe(
    Schema.annotateKey({ description: "Agent who first took the call." }),
  ),
  customer_id: Schema.optional(Schema.NullOr(Long)).pipe(
    Schema.annotateKey({ description: "Customer on the call." }),
  ),
  line_id: Schema.optional(Schema.NullOr(Long)).pipe(
    Schema.annotateKey({ description: "Line in `talk_lines`." }),
  ),
  direction: Schema.String.pipe(Schema.annotateKey({ description: "inbound or outbound." })),
  talk_time: Schema.optional(Schema.NullOr(Long)).pipe(
    Schema.annotateKey({ description: "Seconds spent talking with an agent." }),
  ),
  wait_time: Schema.optional(Schema.NullOr(Long)).pipe(
    Schema.annotateKey({ description: "Seconds spent waiting for an agent." }),
  ),
  voicemail: Schema.optional(Schema.NullOr(Schema.Boolean)).pipe(
    Schema.annotateKey({ description: "Whether the call went to voicemail." }),
  ),
  ...callTimes("call"),
})
  .annotate({ description: "Zendesk Talk calls. Needs Talk export access." })
  .pipe(Iceberg.identifier("id"));

export const TalkLegSchema = Schema.Struct({
  id: Long.pipe(Schema.annotateKey({ description: "Leg ID." })),
  version: version("leg"),
  call_id: Long.pipe(Schema.annotateKey({ description: "Call in `talk_calls`." })),
  agent_id: Schema.optional(Schema.NullOr(Long)).pipe(
    Schema.annotateKey({ description: "Agent on this leg." }),
  ),
  user_id: Schema.optional(Schema.NullOr(Long)).pipe(
    Schema.annotateKey({ description: "User on this leg." }),
  ),
  type: Schema.String.pipe(
    Schema.annotateKey({ description: "customer, agent, external, supervisor, or ai_agent." }),
  ),
  talk_time: Schema.optional(Schema.NullOr(Long)).pipe(
    Schema.annotateKey({ description: "Seconds spent talking on this leg." }),
  ),
  ...callTimes("leg"),
})
  .annotate({ description: "Parts of Zendesk Talk calls, one per person on the call." })
  .pipe(Iceberg.identifier("id"));

export type TalkCall = Schema.Schema.Type<typeof TalkCallSchema>;
export type TalkLeg = Schema.Schema.Type<typeof TalkLegSchema>;

const objectOf = <F extends Schema.Struct.Fields>(schema: Schema.Struct<F>) =>
  schema.mapFields((fields) => Struct.omit(fields, ["version"]));

export const TalkCallObjectSchema = objectOf(TalkCallSchema);
export const TalkLegObjectSchema = objectOf(TalkLegSchema);

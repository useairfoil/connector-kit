import * as Iceberg from "@useairfoil/connector-kit/iceberg";
import { Option, Schema } from "effect";

import { JsonSchema, date } from "./shared";

const UsageEventInputSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Unique event identifier." })),
  timestamp: date("Time when the event happened."),
  organization_id: Schema.String.pipe(
    Schema.annotateKey({ description: "Organization that owns the event." }),
  ),
  customer_id: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Polar customer linked to the event." }),
  ),
  external_customer_id: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Customer ID from your system." }),
  ),
  member_id: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Customer member linked to the event." }),
  ),
  external_member_id: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Member ID from your system." }),
  ),
  parent_id: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Parent event, for nested events." }),
  ),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Event name." })),
  source: Schema.String.pipe(
    Schema.annotateKey({ description: "Who created the event: `system` or `user`." }),
  ),
  label: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Readable event label." }),
  ),
  metadata: JsonSchema.pipe(Schema.annotateKey({ description: "Event metadata stored as JSON." })),
});

export const UsageEventSchema = UsageEventInputSchema.pipe(
  Schema.extendTo(
    {
      version: Schema.Date.pipe(
        Schema.annotateKey({ description: "Event time. Events don't change." }),
      ),
    },
    { version: (row) => Option.some(row.timestamp) },
  ),
)
  .annotate({ description: "Usage and system events in a Polar organization." })
  .pipe(Iceberg.identifier("id"));

export type UsageEvent = Schema.Schema.Type<typeof UsageEventSchema>;

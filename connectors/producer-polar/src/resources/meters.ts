import { Iceberg } from "@useairfoil/connector-kit";
import { Option, Schema } from "effect";

import { JsonSchema, MetadataJsonSchema, date, nullableDate } from "./shared";

const MeterInputSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Unique identifier." })),
  created_at: date("Time when the record was created."),
  modified_at: nullableDate("Time when the record was last changed."),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Meter name." })),
  unit: Schema.String.pipe(
    Schema.annotateKey({ description: "Unit of the meter, such as `scalar` or `token`." }),
  ),
  custom_label: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Label for a custom unit." }),
  ),
  custom_multiplier: Schema.optional(Schema.NullOr(Schema.Int)).pipe(
    Schema.annotateKey({ description: "Multiplier for a custom unit." }),
  ),
  filter: JsonSchema.pipe(Schema.annotateKey({ description: "Event filter stored as JSON." })),
  aggregation: JsonSchema.pipe(
    Schema.annotateKey({ description: "How matching events are counted, as JSON." }),
  ),
  organization_id: Schema.String.pipe(
    Schema.annotateKey({ description: "Organization that owns the meter." }),
  ),
  archived_at: Schema.optional(Schema.NullOr(Schema.DateFromString)).pipe(
    Schema.annotateKey({ description: "Time when the meter was archived." }),
  ),
  metadata: MetadataJsonSchema.pipe(
    Schema.annotateKey({ description: "Meter metadata stored as JSON." }),
  ),
});

export const MeterSchema = MeterInputSchema.pipe(
  Schema.extendTo(
    {
      version: Schema.Date.pipe(Schema.annotateKey({ description: "Time used to order changes." })),
    },
    { version: (row) => Option.some(row.modified_at ?? row.created_at) },
  ),
)
  .annotate({ description: "Usage meter definitions." })
  .pipe(Iceberg.identifier("id"));

export type Meter = Schema.Schema.Type<typeof MeterSchema>;

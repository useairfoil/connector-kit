import * as Iceberg from "@useairfoil/connector-kit/iceberg";
import { Option, Schema } from "effect";

import { JsonSchema, MetadataJsonSchema, date, nullableDate } from "./shared";

const CustomFieldInputSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Unique identifier." })),
  created_at: date("Time when the record was created."),
  modified_at: nullableDate("Time when the record was last changed."),
  organization_id: Schema.String.pipe(
    Schema.annotateKey({ description: "Organization that owns the field." }),
  ),
  type: Schema.String.pipe(Schema.annotateKey({ description: "Field type." })),
  slug: Schema.String.pipe(Schema.annotateKey({ description: "Key used in custom field data." })),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Field name." })),
  properties: JsonSchema.pipe(
    Schema.annotateKey({ description: "Type-specific settings stored as JSON." }),
  ),
  metadata: MetadataJsonSchema.pipe(
    Schema.annotateKey({ description: "Field metadata stored as JSON." }),
  ),
});

export const CustomFieldSchema = CustomFieldInputSchema.pipe(
  Schema.extendTo(
    {
      version: Schema.Date.pipe(Schema.annotateKey({ description: "Time used to order changes." })),
    },
    { version: (row) => Option.some(row.modified_at ?? row.created_at) },
  ),
)
  .annotate({ description: "Custom fields for checkouts and orders." })
  .pipe(Iceberg.identifier("id"));

export type CustomField = Schema.Schema.Type<typeof CustomFieldSchema>;

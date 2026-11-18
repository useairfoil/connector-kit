import * as Iceberg from "@useairfoil/connector-kit/iceberg";
import { Option, Schema } from "effect";

import { JsonSchema, MetadataJsonSchema, date, nullableDate } from "./shared";

const BenefitInputSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Unique identifier." })),
  created_at: date("Time when the record was created."),
  modified_at: nullableDate("Time when the record was last changed."),
  type: Schema.String.pipe(Schema.annotateKey({ description: "Benefit type." })),
  description: Schema.String.pipe(Schema.annotateKey({ description: "Benefit description." })),
  selectable: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the benefit can be added to products." }),
  ),
  deletable: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the benefit can be deleted." }),
  ),
  is_deleted: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the benefit is deleted." }),
  ),
  visibility: Schema.String.pipe(Schema.annotateKey({ description: "Who can see the benefit." })),
  organization_id: Schema.String.pipe(
    Schema.annotateKey({ description: "Organization that owns the benefit." }),
  ),
  properties: JsonSchema.pipe(
    Schema.annotateKey({ description: "Type-specific settings stored as JSON." }),
  ),
  metadata: MetadataJsonSchema.pipe(
    Schema.annotateKey({ description: "Benefit metadata stored as JSON." }),
  ),
});

export const BenefitSchema = BenefitInputSchema.pipe(
  Schema.extendTo(
    {
      version: Schema.Date.pipe(Schema.annotateKey({ description: "Time used to order changes." })),
    },
    { version: (row) => Option.some(row.modified_at ?? row.created_at) },
  ),
)
  .annotate({ description: "Benefits granted with Polar products." })
  .pipe(Iceberg.identifier("id"));

export type Benefit = Schema.Schema.Type<typeof BenefitSchema>;

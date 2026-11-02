import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, SchemaTransformation } from "effect";

import { Long, version } from "./shared";

const StageSchema = Schema.Struct({
  id: Schema.String.pipe(
    Schema.annotateKey({ description: "Stage ID, as used in `dealstage` or `hs_pipeline_stage`." }),
  ),
  label: Schema.String.pipe(Schema.annotateKey({ description: "Stage name." })),
  display_order: Long.pipe(
    Schema.annotateKey({ description: "Position of the stage in the pipeline." }),
  ),
  archived: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the stage was removed." }),
  ),
  metadata: Schema.ReadonlyMap(Schema.String, Schema.String).pipe(
    Schema.annotateKey({
      description: "Stage settings, such as `probability` for deals or `ticketState` for tickets.",
    }),
  ),
});

export const PipelineSchema = Schema.Struct({
  key: Schema.String.pipe(
    Schema.annotateKey({ description: "Object type and pipeline ID, such as `deals:default`." }),
  ),
  version,
  object_type: Schema.String.pipe(
    Schema.annotateKey({
      description: "Table the pipeline belongs to, or a custom object type ID such as `2-123`.",
    }),
  ),
  id: Schema.String.pipe(
    Schema.annotateKey({ description: "Pipeline ID, as used in `pipeline` or `hs_pipeline`." }),
  ),
  label: Schema.String.pipe(Schema.annotateKey({ description: "Pipeline name." })),
  display_order: Long.pipe(Schema.annotateKey({ description: "Position of the pipeline." })),
  archived: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the pipeline was removed." }),
  ),
  stages: Schema.Array(StageSchema).pipe(
    Schema.annotateKey({ description: "Stages of the pipeline." }),
  ),
  created_at: Schema.Date.pipe(
    Schema.annotateKey({ description: "Time the pipeline was created." }),
  ),
})
  .annotate({
    description:
      "Pipelines with their stages, for deals, tickets, leads, orders, and custom objects.",
  })
  .pipe(Iceberg.identifier("key"));

export type Pipeline = Schema.Schema.Type<typeof PipelineSchema>;

export const PipelineObjectSchema = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  displayOrder: Long,
  archived: Schema.Boolean,
  createdAt: Schema.DateFromString,
  stages: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      label: Schema.String,
      displayOrder: Long,
      archived: Schema.Boolean,
      metadata: Schema.Record(Schema.String, Schema.String).pipe(
        Schema.decodeTo(
          Schema.ReadonlyMap(Schema.String, Schema.String),
          SchemaTransformation.transform({
            decode: (record): ReadonlyMap<string, string> => new Map(Object.entries(record)),
            encode: (map) => Object.fromEntries(map),
          }),
        ),
      ),
    }),
  ),
});

export type PipelineObject = Schema.Schema.Type<typeof PipelineObjectSchema>;

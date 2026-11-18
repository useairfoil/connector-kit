import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { Long, Timestamp, version } from "./shared";

export const WorkflowSchema = Schema.Struct({
  id: Long.pipe(Schema.annotateKey({ description: "Workflow ID." })),
  version: version("workflow"),
  repository_id: Long.pipe(Schema.annotateKey({ description: "Repository ID." })),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Workflow name." })),
  path: Schema.String.pipe(Schema.annotateKey({ description: "Path of the workflow file." })),
  state: Schema.String.pipe(Schema.annotateKey({ description: "Workflow state, such as active." })),
  created_at: Timestamp.pipe(Schema.annotateKey({ description: "Time the workflow was created." })),
  updated_at: Timestamp.pipe(Schema.annotateKey({ description: "Time the workflow was updated." })),
})
  .annotate({ description: "Workflow definitions in GitHub Actions." })
  .pipe(Iceberg.identifier("id"));

export type Workflow = typeof WorkflowSchema.Type;
export const WorkflowObjectSchema = WorkflowSchema.mapFields(
  Struct.omit(["version", "repository_id"]),
);

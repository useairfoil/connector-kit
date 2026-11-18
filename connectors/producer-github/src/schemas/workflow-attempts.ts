import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { Long, Timestamp, version } from "./shared";
import { WorkflowRunSchema } from "./workflow-runs";

export const WorkflowAttemptSchema = Schema.Struct({
  key: Schema.String.pipe(Schema.annotateKey({ description: "Workflow run ID and attempt." })),
  version: version("workflow run attempt"),
  repository_id: Long.pipe(Schema.annotateKey({ description: "Repository ID." })),
  run_id: Long.pipe(Schema.annotateKey({ description: "Workflow run ID." })),
  run_attempt: Long.pipe(Schema.annotateKey({ description: "Attempt number." })),
  ...Struct.pick(WorkflowRunSchema.fields, ["workflow_id", "status", "conclusion", "head_sha"]),
  run_started_at: Schema.optionalKey(Timestamp).pipe(
    Schema.annotateKey({ description: "Time the attempt started." }),
  ),
})
  .annotate({ description: "Attempts of each GitHub Actions workflow run." })
  .pipe(Iceberg.identifier("key"));

export type WorkflowAttempt = typeof WorkflowAttemptSchema.Type;

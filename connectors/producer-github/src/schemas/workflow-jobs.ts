import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { Long, Timestamp, readVersion } from "./shared";

const step = Schema.Struct({
  number: Long.pipe(Schema.annotateKey({ description: "Step number." })),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Step name." })),
  status: Schema.String.pipe(
    Schema.annotateKey({ description: "Status, such as queued, in_progress, or completed." }),
  ),
  conclusion: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Result of a completed step." }),
  ),
  started_at: Schema.optionalKey(Schema.NullOr(Timestamp)).pipe(
    Schema.annotateKey({ description: "Time the step started." }),
  ),
  completed_at: Schema.optionalKey(Schema.NullOr(Timestamp)).pipe(
    Schema.annotateKey({ description: "Time the step completed." }),
  ),
});

export const WorkflowJobSchema = Schema.Struct({
  id: Long.pipe(Schema.annotateKey({ description: "Unique job ID." })),
  version: readVersion("job"),
  node_id: Schema.String.pipe(Schema.annotateKey({ description: "GraphQL node ID of the job." })),
  repository_id: Long.pipe(
    Schema.annotateKey({ description: "ID of the repository the job belongs to." }),
  ),
  run_id: Long.pipe(Schema.annotateKey({ description: "ID of the workflow run." })),
  run_attempt: Schema.optionalKey(Long).pipe(
    Schema.annotateKey({ description: "Attempt of the run the job belongs to." }),
  ),
  workflow_name: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Workflow name." }),
  ),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Job name." })),
  head_sha: Schema.String.pipe(
    Schema.annotateKey({ description: "SHA of the commit the job ran on." }),
  ),
  head_branch: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Branch the job ran on." }),
  ),
  status: Schema.String.pipe(
    Schema.annotateKey({ description: "Status, such as queued, in_progress, or completed." }),
  ),
  conclusion: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Result of a completed job, such as success or failure." }),
  ),
  created_at: Timestamp.pipe(Schema.annotateKey({ description: "Time the job was queued." })),
  started_at: Timestamp.pipe(Schema.annotateKey({ description: "Time the job started." })),
  completed_at: Schema.NullOr(Timestamp).pipe(
    Schema.annotateKey({ description: "Time the job completed." }),
  ),
  runner_name: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Name of the runner." }),
  ),
  labels: Schema.Array(Schema.String).pipe(
    Schema.annotateKey({ description: "Runner labels the job asked for." }),
  ),
  steps: Schema.Array(step).pipe(Schema.annotateKey({ description: "Steps of the job." })),
  html_url: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Job page on GitHub." }),
  ),
})
  .annotate({
    description: "Jobs of GitHub Actions workflow runs. Each run attempt has its own jobs.",
  })
  .pipe(Iceberg.identifier("id"));

export type WorkflowJob = Schema.Schema.Type<typeof WorkflowJobSchema>;

export const WorkflowJobObjectSchema = WorkflowJobSchema.mapFields((fields) => ({
  ...Struct.omit(fields, ["version", "repository_id", "steps"]),
  steps: Schema.optionalKey(Schema.Array(step)),
}));

export type WorkflowJobObject = Schema.Schema.Type<typeof WorkflowJobObjectSchema>;

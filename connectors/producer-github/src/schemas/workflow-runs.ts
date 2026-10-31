import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { Long, Timestamp, user, version } from "./shared";

export const WorkflowRunSchema = Schema.Struct({
  id: Long.pipe(Schema.annotateKey({ description: "Unique workflow run ID." })),
  version: version("workflow run"),
  node_id: Schema.String.pipe(Schema.annotateKey({ description: "GraphQL node ID of the run." })),
  repository_id: Long.pipe(
    Schema.annotateKey({ description: "ID of the repository the run belongs to." }),
  ),
  workflow_id: Long.pipe(Schema.annotateKey({ description: "ID of the workflow." })),
  name: Schema.NullOr(Schema.String).pipe(Schema.annotateKey({ description: "Workflow name." })),
  display_title: Schema.String.pipe(
    Schema.annotateKey({ description: "Title of the run, such as the commit message." }),
  ),
  path: Schema.String.pipe(Schema.annotateKey({ description: "Path of the workflow file." })),
  event: Schema.String.pipe(
    Schema.annotateKey({ description: "Event that started the run, such as push." }),
  ),
  status: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Status, such as queued, in_progress, or completed." }),
  ),
  conclusion: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Result of a completed run, such as success or failure." }),
  ),
  head_branch: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Branch the run is for." }),
  ),
  head_sha: Schema.String.pipe(
    Schema.annotateKey({ description: "SHA of the commit the run is for." }),
  ),
  run_number: Long.pipe(Schema.annotateKey({ description: "Run number of the workflow." })),
  run_attempt: Schema.optionalKey(Long).pipe(
    Schema.annotateKey({ description: "Attempt number. Re-runs count up." }),
  ),
  check_suite_id: Schema.optionalKey(Long).pipe(
    Schema.annotateKey({ description: "ID of the run's check suite." }),
  ),
  actor: Schema.optionalKey(user).pipe(
    Schema.annotateKey({ description: "Account that started the first attempt." }),
  ),
  triggering_actor: Schema.optionalKey(user).pipe(
    Schema.annotateKey({ description: "Account that started the latest attempt." }),
  ),
  pull_requests: Schema.Array(
    Schema.Struct({
      id: Long.pipe(Schema.annotateKey({ description: "Pull request ID." })),
      number: Long.pipe(Schema.annotateKey({ description: "Pull request number." })),
    }),
  ).pipe(Schema.annotateKey({ description: "Pull requests the run is for. Empty for forks." })),
  created_at: Timestamp.pipe(Schema.annotateKey({ description: "Time the run was created." })),
  run_started_at: Schema.optionalKey(Timestamp).pipe(
    Schema.annotateKey({ description: "Time the latest attempt started." }),
  ),
  html_url: Schema.String.pipe(Schema.annotateKey({ description: "Run page on GitHub." })),
})
  .annotate({
    description: "GitHub Actions workflow runs in the installation's repositories.",
  })
  .pipe(Iceberg.identifier("id"));

export type WorkflowRun = Schema.Schema.Type<typeof WorkflowRunSchema>;

export const WorkflowRunObjectSchema = WorkflowRunSchema.mapFields((fields) => ({
  ...Struct.omit(fields, ["version", "repository_id", "pull_requests"]),
  updated_at: Timestamp,
  pull_requests: Schema.NullOr(fields.pull_requests),
}));

export type WorkflowRunObject = Schema.Schema.Type<typeof WorkflowRunObjectSchema>;

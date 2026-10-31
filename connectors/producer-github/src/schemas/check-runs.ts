import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { Long, Timestamp, readVersion } from "./shared";

export const CheckRunSchema = Schema.Struct({
  id: Long.pipe(Schema.annotateKey({ description: "Unique check run ID." })),
  version: readVersion("check run"),
  node_id: Schema.String.pipe(
    Schema.annotateKey({ description: "GraphQL node ID of the check run." }),
  ),
  repository_id: Long.pipe(
    Schema.annotateKey({ description: "ID of the repository the check run belongs to." }),
  ),
  head_sha: Schema.String.pipe(
    Schema.annotateKey({ description: "SHA of the commit the check ran on." }),
  ),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Check name." })),
  status: Schema.String.pipe(
    Schema.annotateKey({ description: "Status, such as queued, in_progress, or completed." }),
  ),
  conclusion: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Result of a completed check, such as success or failure." }),
  ),
  started_at: Schema.NullOr(Timestamp).pipe(
    Schema.annotateKey({ description: "Time the check started." }),
  ),
  completed_at: Schema.NullOr(Timestamp).pipe(
    Schema.annotateKey({ description: "Time the check completed." }),
  ),
  app: Schema.NullOr(
    Schema.Struct({
      id: Long.pipe(Schema.annotateKey({ description: "GitHub App ID." })),
      name: Schema.String.pipe(Schema.annotateKey({ description: "GitHub App name." })),
    }),
  ).pipe(
    Schema.annotateKey({
      description: "GitHub App that created the check, such as GitHub Actions.",
    }),
  ),
  check_suite: Schema.NullOr(
    Schema.Struct({ id: Long.pipe(Schema.annotateKey({ description: "Check suite ID." })) }),
  ).pipe(Schema.annotateKey({ description: "Check suite the check run belongs to." })),
  output: Schema.Struct({
    title: Schema.NullOr(Schema.String).pipe(Schema.annotateKey({ description: "Output title." })),
    summary: Schema.NullOr(Schema.String).pipe(
      Schema.annotateKey({ description: "Output summary in Markdown." }),
    ),
  }).pipe(Schema.annotateKey({ description: "Output the check reported." })),
  external_id: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "ID the app gave the check." }),
  ),
  details_url: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Details page from the app." }),
  ),
  html_url: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Check run page on GitHub." }),
  ),
})
  .annotate({
    description:
      "Check runs, such as GitHub Actions jobs. Polled for default-branch commits; webhooks cover all branches.",
  })
  .pipe(Iceberg.identifier("id"));

export type CheckRun = Schema.Schema.Type<typeof CheckRunSchema>;

export const CheckRunObjectSchema = CheckRunSchema.mapFields((fields) =>
  Struct.omit(fields, ["version", "repository_id"]),
);

export type CheckRunObject = Schema.Schema.Type<typeof CheckRunObjectSchema>;

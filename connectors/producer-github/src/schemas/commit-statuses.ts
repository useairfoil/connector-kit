import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { Long, Text, Timestamp, user, version } from "./shared";

export const CommitStatusSchema = Schema.Struct({
  id: Long.pipe(
    Schema.annotateKey({
      description: "Unique status ID. Each new status of a context gets a new ID.",
    }),
  ),
  version: version("status"),
  node_id: Schema.String.pipe(
    Schema.annotateKey({ description: "GraphQL node ID of the status." }),
  ),
  repository_id: Long.pipe(
    Schema.annotateKey({ description: "ID of the repository the status belongs to." }),
  ),
  sha: Schema.String.pipe(
    Schema.annotateKey({ description: "SHA of the commit the status is on." }),
  ),
  state: Schema.String.pipe(
    Schema.annotateKey({ description: "State: error, failure, pending, or success." }),
  ),
  context: Schema.String.pipe(
    Schema.annotateKey({ description: "Label that tells the status apart, such as ci/build." }),
  ),
  description: Text.pipe(
    Schema.annotateKey({ description: "Short description. Empty when not set." }),
  ),
  target_url: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Link the status points to." }),
  ),
  creator: Schema.NullOr(user).pipe(
    Schema.annotateKey({ description: "Account that created the status." }),
  ),
  created_at: Timestamp.pipe(Schema.annotateKey({ description: "Time the status was created." })),
})
  .annotate({
    description: "Commit statuses. Polled for default-branch commits; webhooks cover all branches.",
  })
  .pipe(Iceberg.identifier("id"));

export type CommitStatus = Schema.Schema.Type<typeof CommitStatusSchema>;

export const CommitStatusObjectSchema = CommitStatusSchema.mapFields((fields) => ({
  ...Struct.omit(fields, ["version", "repository_id", "sha"]),
  updated_at: Timestamp,
}));

export type CommitStatusObject = Schema.Schema.Type<typeof CommitStatusObjectSchema>;

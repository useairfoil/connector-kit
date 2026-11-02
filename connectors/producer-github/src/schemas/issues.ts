import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import {
  Long,
  Text,
  Timestamp,
  deleted,
  label,
  milestone,
  optionalList,
  user,
  version,
} from "./shared";

export const IssueSchema = Schema.Struct({
  id: Long.pipe(Schema.annotateKey({ description: "Unique issue ID." })),
  version: version("issue"),
  node_id: Schema.String.pipe(Schema.annotateKey({ description: "GraphQL node ID of the issue." })),
  repository_id: Long.pipe(
    Schema.annotateKey({ description: "ID of the repository the issue belongs to." }),
  ),
  number: Long.pipe(Schema.annotateKey({ description: "Issue number in the repository." })),
  title: Schema.String.pipe(Schema.annotateKey({ description: "Issue title." })),
  body: Text.pipe(
    Schema.annotateKey({ description: "Issue description in Markdown. Empty when not set." }),
  ),
  state: Schema.String.pipe(Schema.annotateKey({ description: "State: open or closed." })),
  state_reason: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({
      description: "Why the issue was closed or reopened, such as completed or not_planned.",
    }),
  ),
  locked: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the conversation is locked." }),
  ),
  user: Schema.NullOr(user).pipe(
    Schema.annotateKey({ description: "Account that opened the issue." }),
  ),
  author_association: Schema.String.pipe(
    Schema.annotateKey({
      description: "Author's relation to the repository, such as OWNER or CONTRIBUTOR.",
    }),
  ),
  labels: Schema.Array(label).pipe(Schema.annotateKey({ description: "Labels on the issue." })),
  assignees: Schema.Array(user).pipe(
    Schema.annotateKey({ description: "Accounts assigned to the issue." }),
  ),
  milestone: Schema.NullOr(milestone).pipe(
    Schema.annotateKey({ description: "Milestone of the issue." }),
  ),
  comments: Long.pipe(Schema.annotateKey({ description: "Number of comments." })),
  created_at: Timestamp.pipe(Schema.annotateKey({ description: "Time the issue was opened." })),
  closed_at: Schema.NullOr(Timestamp).pipe(
    Schema.annotateKey({ description: "Time the issue was closed. Null while it is open." }),
  ),
  html_url: Schema.String.pipe(Schema.annotateKey({ description: "Issue page on GitHub." })),
  _deleted: deleted("issue"),
})
  .annotate({
    description: "Issues in the installation's repositories. Pull requests are not included.",
  })
  .pipe(Iceberg.identifier("id"));

export type Issue = Schema.Schema.Type<typeof IssueSchema>;

export const IssueObjectSchema = IssueSchema.mapFields((fields) => ({
  ...Struct.omit(fields, ["version", "repository_id", "labels", "assignees", "_deleted"]),
  updated_at: Timestamp,
  labels: optionalList(label),
  assignees: optionalList(user),
  // Set on pull requests, which the issues list also returns.
  pull_request: Schema.optionalKey(Schema.Unknown),
}));

export type IssueObject = Schema.Schema.Type<typeof IssueObjectSchema>;

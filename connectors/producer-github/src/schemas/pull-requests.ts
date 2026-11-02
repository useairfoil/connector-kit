import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { Long, Text, Timestamp, label, milestone, optionalList, user, version } from "./shared";

const branch = Schema.Struct({
  ref: Schema.String.pipe(Schema.annotateKey({ description: "Branch name." })),
  sha: Schema.String.pipe(Schema.annotateKey({ description: "Commit SHA." })),
  label: Schema.String.pipe(
    Schema.annotateKey({ description: "Owner and branch, such as octocat:main." }),
  ),
});

export const PullRequestSchema = Schema.Struct({
  id: Long.pipe(
    Schema.annotateKey({ description: "Unique pull request ID. Not the ID of its issue." }),
  ),
  version: version("pull request"),
  node_id: Schema.String.pipe(
    Schema.annotateKey({ description: "GraphQL node ID of the pull request." }),
  ),
  repository_id: Long.pipe(
    Schema.annotateKey({ description: "ID of the repository the pull request belongs to." }),
  ),
  number: Long.pipe(Schema.annotateKey({ description: "Pull request number in the repository." })),
  title: Schema.String.pipe(Schema.annotateKey({ description: "Pull request title." })),
  body: Text.pipe(
    Schema.annotateKey({
      description: "Pull request description in Markdown. Empty when not set.",
    }),
  ),
  state: Schema.String.pipe(
    Schema.annotateKey({ description: "State: open or closed. Merged pull requests are closed." }),
  ),
  draft: Schema.optionalKey(Schema.Boolean).pipe(
    Schema.annotateKey({ description: "Whether the pull request is a draft." }),
  ),
  locked: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the conversation is locked." }),
  ),
  user: Schema.NullOr(user).pipe(
    Schema.annotateKey({ description: "Account that opened the pull request." }),
  ),
  author_association: Schema.String.pipe(
    Schema.annotateKey({
      description: "Author's relation to the repository, such as OWNER or CONTRIBUTOR.",
    }),
  ),
  labels: Schema.Array(label).pipe(
    Schema.annotateKey({ description: "Labels on the pull request." }),
  ),
  assignees: Schema.Array(user).pipe(
    Schema.annotateKey({ description: "Accounts assigned to the pull request." }),
  ),
  requested_reviewers: Schema.Array(user).pipe(
    Schema.annotateKey({ description: "Accounts asked to review that have not reviewed yet." }),
  ),
  milestone: Schema.NullOr(milestone).pipe(
    Schema.annotateKey({ description: "Milestone of the pull request." }),
  ),
  head: branch.pipe(Schema.annotateKey({ description: "Branch the changes come from." })),
  base: branch.pipe(Schema.annotateKey({ description: "Branch the changes merge into." })),
  created_at: Timestamp.pipe(
    Schema.annotateKey({ description: "Time the pull request was opened." }),
  ),
  closed_at: Schema.NullOr(Timestamp).pipe(
    Schema.annotateKey({ description: "Time the pull request was closed. Null while it is open." }),
  ),
  merged_at: Schema.NullOr(Timestamp).pipe(
    Schema.annotateKey({ description: "Time the pull request was merged." }),
  ),
  html_url: Schema.String.pipe(Schema.annotateKey({ description: "Pull request page on GitHub." })),
})
  .annotate({
    description: "Pull requests in the installation's repositories.",
  })
  .pipe(Iceberg.identifier("id"));

export type PullRequest = Schema.Schema.Type<typeof PullRequestSchema>;

export const PullRequestObjectSchema = PullRequestSchema.mapFields((fields) => ({
  ...Struct.omit(fields, [
    "version",
    "repository_id",
    "labels",
    "assignees",
    "requested_reviewers",
  ]),
  updated_at: Timestamp,
  labels: optionalList(label),
  assignees: optionalList(user),
  requested_reviewers: optionalList(user),
}));

export type PullRequestObject = Schema.Schema.Type<typeof PullRequestObjectSchema>;

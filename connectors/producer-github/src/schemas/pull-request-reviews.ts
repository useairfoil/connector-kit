import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { Long, Timestamp, readVersion, user } from "./shared";

export const PullRequestReviewSchema = Schema.Struct({
  id: Long.pipe(Schema.annotateKey({ description: "Unique review ID." })),
  version: readVersion("review"),
  node_id: Schema.String.pipe(
    Schema.annotateKey({ description: "GraphQL node ID of the review." }),
  ),
  repository_id: Long.pipe(
    Schema.annotateKey({ description: "ID of the repository the review belongs to." }),
  ),
  pull_request_number: Long.pipe(
    Schema.annotateKey({
      description: "Number of the pull request the review is on, in its repository.",
    }),
  ),
  user: Schema.NullOr(user).pipe(
    Schema.annotateKey({ description: "Account that wrote the review." }),
  ),
  author_association: Schema.String.pipe(
    Schema.annotateKey({
      description: "Author's relation to the repository, such as OWNER or CONTRIBUTOR.",
    }),
  ),
  state: Schema.String.pipe(
    Schema.annotateKey({
      description: "State, such as APPROVED, CHANGES_REQUESTED, COMMENTED, or DISMISSED.",
    }),
  ),
  body: Schema.String.pipe(Schema.annotateKey({ description: "Review summary in Markdown." })),
  commit_id: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "SHA of the commit the review is on." }),
  ),
  submitted_at: Schema.optionalKey(Timestamp).pipe(
    Schema.annotateKey({ description: "Time the review was submitted." }),
  ),
  html_url: Schema.String.pipe(Schema.annotateKey({ description: "Review on GitHub." })),
})
  .annotate({
    description: "Reviews on pull requests. Pending reviews are only visible to their author.",
  })
  .pipe(Iceberg.identifier("id"));

export type PullRequestReview = Schema.Schema.Type<typeof PullRequestReviewSchema>;

export const PullRequestReviewObjectSchema = PullRequestReviewSchema.mapFields((fields) =>
  Struct.omit(fields, ["version", "repository_id", "pull_request_number"]),
);

export type PullRequestReviewObject = Schema.Schema.Type<typeof PullRequestReviewObjectSchema>;

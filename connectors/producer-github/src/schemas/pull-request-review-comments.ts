import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { Long, Timestamp, deleted, user, version } from "./shared";

export const PullRequestReviewCommentSchema = Schema.Struct({
  id: Long.pipe(Schema.annotateKey({ description: "Unique review comment ID." })),
  version: version("review comment"),
  node_id: Schema.String.pipe(
    Schema.annotateKey({ description: "GraphQL node ID of the review comment." }),
  ),
  repository_id: Long.pipe(
    Schema.annotateKey({ description: "ID of the repository the comment belongs to." }),
  ),
  pull_request_number: Long.pipe(
    Schema.annotateKey({
      description: "Number of the pull request the comment is on, in its repository.",
    }),
  ),
  pull_request_review_id: Schema.NullOr(Long).pipe(
    Schema.annotateKey({ description: "ID of the review the comment belongs to." }),
  ),
  in_reply_to_id: Schema.optionalKey(Long).pipe(
    Schema.annotateKey({ description: "ID of the comment this one replies to." }),
  ),
  user: Schema.NullOr(user).pipe(
    Schema.annotateKey({ description: "Account that wrote the comment." }),
  ),
  author_association: Schema.String.pipe(
    Schema.annotateKey({
      description: "Author's relation to the repository, such as OWNER or CONTRIBUTOR.",
    }),
  ),
  body: Schema.String.pipe(Schema.annotateKey({ description: "Comment in Markdown." })),
  path: Schema.String.pipe(
    Schema.annotateKey({ description: "Path of the file the comment is on." }),
  ),
  commit_id: Schema.String.pipe(
    Schema.annotateKey({ description: "SHA of the commit the comment is on now." }),
  ),
  original_commit_id: Schema.String.pipe(
    Schema.annotateKey({ description: "SHA of the commit the comment was written on." }),
  ),
  diff_hunk: Schema.String.pipe(
    Schema.annotateKey({ description: "Part of the diff the comment is on." }),
  ),
  // GitHub sends null for a comment on a line that is no longer in the diff.
  line: Schema.optionalKey(Schema.NullOr(Long)).pipe(
    Schema.annotateKey({ description: "Last line of the commented range in the current diff." }),
  ),
  original_line: Schema.optionalKey(Schema.NullOr(Long)).pipe(
    Schema.annotateKey({ description: "Last line of the commented range in the original diff." }),
  ),
  start_line: Schema.optionalKey(Schema.NullOr(Long)).pipe(
    Schema.annotateKey({ description: "First line of a multi-line comment." }),
  ),
  side: Schema.optionalKey(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Side of the diff: LEFT or RIGHT." }),
  ),
  subject_type: Schema.optionalKey(Schema.String).pipe(
    Schema.annotateKey({ description: "What the comment is on: line or file." }),
  ),
  created_at: Timestamp.pipe(Schema.annotateKey({ description: "Time the comment was written." })),
  html_url: Schema.String.pipe(Schema.annotateKey({ description: "Comment on GitHub." })),
  _deleted: deleted("review comment"),
})
  .annotate({
    description: "Review comments on pull request diffs.",
  })
  .pipe(Iceberg.identifier("id"));

export type PullRequestReviewComment = Schema.Schema.Type<typeof PullRequestReviewCommentSchema>;

export const PullRequestReviewCommentObjectSchema = PullRequestReviewCommentSchema.mapFields(
  (fields) => ({
    ...Struct.omit(fields, ["version", "repository_id", "pull_request_number", "_deleted"]),
    updated_at: Timestamp,
    // The list has no pull request number, only this URL, which ends in it.
    pull_request_url: Schema.String.check(Schema.isPattern(/\/pulls\/\d+$/)),
  }),
);

export type PullRequestReviewCommentObject = Schema.Schema.Type<
  typeof PullRequestReviewCommentObjectSchema
>;

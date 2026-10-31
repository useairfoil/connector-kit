import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { Long, Text, Timestamp, deleted, user, version } from "./shared";

export const IssueCommentSchema = Schema.Struct({
  id: Long.pipe(Schema.annotateKey({ description: "Unique comment ID." })),
  version: version("comment"),
  node_id: Schema.String.pipe(
    Schema.annotateKey({ description: "GraphQL node ID of the comment." }),
  ),
  repository_id: Long.pipe(
    Schema.annotateKey({ description: "ID of the repository the comment belongs to." }),
  ),
  issue_number: Long.pipe(
    Schema.annotateKey({
      description: "Number of the issue or pull request the comment is on, in its repository.",
    }),
  ),
  user: Schema.NullOr(user).pipe(
    Schema.annotateKey({ description: "Account that wrote the comment." }),
  ),
  author_association: Schema.String.pipe(
    Schema.annotateKey({
      description: "Author's relation to the repository, such as OWNER or CONTRIBUTOR.",
    }),
  ),
  body: Text.pipe(Schema.annotateKey({ description: "Comment in Markdown. Empty when not set." })),
  created_at: Timestamp.pipe(Schema.annotateKey({ description: "Time the comment was written." })),
  html_url: Schema.String.pipe(Schema.annotateKey({ description: "Comment on GitHub." })),
  _deleted: deleted("comment"),
})
  .annotate({
    description:
      "Comments on issues and pull requests. Pull request review comments are not included.",
  })
  .pipe(Iceberg.identifier("id"));

export type IssueComment = Schema.Schema.Type<typeof IssueCommentSchema>;

export const IssueCommentObjectSchema = IssueCommentSchema.mapFields((fields) => ({
  ...Struct.omit(fields, ["version", "repository_id", "issue_number", "_deleted"]),
  updated_at: Timestamp,
  // The list has no issue number, only this URL, which ends in it.
  issue_url: Schema.String.check(Schema.isPattern(/\/issues\/\d+$/)),
}));

export type IssueCommentObject = Schema.Schema.Type<typeof IssueCommentObjectSchema>;

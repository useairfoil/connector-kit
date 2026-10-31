import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { OptionalRef, OptionalString, OptionalTimestamp, common, deleted } from "./shared";

export const CommentSchema = Schema.Struct({
  ...common("Comment"),
  _deleted: deleted("comment"),
  body: Schema.String.pipe(Schema.annotateKey({ description: "Comment text in markdown." })),
  user_id: OptionalRef.pipe(Schema.annotateKey({ description: "User who wrote the comment." })),
  external_user_id: OptionalRef.pipe(
    Schema.annotateKey({ description: "External user who wrote the comment." }),
  ),
  issue_id: OptionalString.pipe(Schema.annotateKey({ description: "Issue the comment is on." })),
  project_id: OptionalString.pipe(
    Schema.annotateKey({ description: "Project the comment is on." }),
  ),
  project_update_id: OptionalString.pipe(
    Schema.annotateKey({ description: "Project update the comment is on." }),
  ),
  initiative_id: OptionalString.pipe(
    Schema.annotateKey({ description: "Initiative the comment is on." }),
  ),
  initiative_update_id: OptionalString.pipe(
    Schema.annotateKey({ description: "Initiative update the comment is on." }),
  ),
  document_content_id: OptionalString.pipe(
    Schema.annotateKey({ description: "Document content the comment is on." }),
  ),
  parent_id: OptionalString.pipe(
    Schema.annotateKey({ description: "Comment this one replies to." }),
  ),
  quoted_text: OptionalString.pipe(Schema.annotateKey({ description: "Text the comment quotes." })),
  edited_at: OptionalTimestamp.pipe(
    Schema.annotateKey({ description: "Time the comment was last edited." }),
  ),
  resolved_at: OptionalTimestamp.pipe(
    Schema.annotateKey({ description: "Time the thread was resolved." }),
  ),
  resolving_user_id: OptionalRef.pipe(
    Schema.annotateKey({ description: "User who resolved the thread." }),
  ),
  url: Schema.String.pipe(Schema.annotateKey({ description: "Comment URL." })),
})
  .annotate({ description: "Linear comments on issues, projects, initiatives, and updates." })
  .pipe(Iceberg.identifier("id"));

export type Comment = Schema.Schema.Type<typeof CommentSchema>;

export const CommentObjectSchema = CommentSchema.mapFields((fields) =>
  Struct.omit(fields, ["version", "_deleted"]),
);

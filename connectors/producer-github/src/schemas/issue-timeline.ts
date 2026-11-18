import * as Iceberg from "@useairfoil/connector-kit/iceberg";
import { Schema, Struct } from "effect";

import { Long, Timestamp, readVersion, user } from "./shared";

const relatedIssue = Schema.Struct({
  id: Long.pipe(Schema.annotateKey({ description: "Related issue ID." })),
  number: Long.pipe(Schema.annotateKey({ description: "Number in the related repository." })),
  html_url: Schema.String.pipe(Schema.annotateKey({ description: "Related issue URL." })),
});

export const IssueTimelineSchema = Schema.Struct({
  key: Schema.String.pipe(Schema.annotateKey({ description: "Event key within this issue." })),
  version: readVersion("issue timeline event"),
  repository_id: Long.pipe(Schema.annotateKey({ description: "Repository ID." })),
  issue_number: Long.pipe(Schema.annotateKey({ description: "Issue number in the repository." })),
  id: Schema.optionalKey(Long).pipe(
    Schema.annotateKey({ description: "GitHub event ID. Cross-references have none." }),
  ),
  event: Schema.String.pipe(Schema.annotateKey({ description: "Timeline event type." })),
  created_at: Schema.optionalKey(Timestamp).pipe(
    Schema.annotateKey({ description: "Time of the event." }),
  ),
  actor: Schema.optionalKey(Schema.NullOr(user)).pipe(
    Schema.annotateKey({ description: "Account that caused the event." }),
  ),
  commit_id: Schema.optionalKey(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Commit that caused the event, such as a closing commit." }),
  ),
  assignee: Schema.optionalKey(user).pipe(
    Schema.annotateKey({ description: "Account assigned or unassigned." }),
  ),
  label: Schema.optionalKey(
    Schema.Struct({
      name: Schema.String.pipe(Schema.annotateKey({ description: "Label name." })),
    }),
  ).pipe(Schema.annotateKey({ description: "Label added or removed." })),
  milestone: Schema.optionalKey(
    Schema.Struct({
      title: Schema.String.pipe(Schema.annotateKey({ description: "Milestone title." })),
    }),
  ).pipe(Schema.annotateKey({ description: "Milestone added or removed." })),
  rename: Schema.optionalKey(
    Schema.Struct({
      from: Schema.String.pipe(Schema.annotateKey({ description: "Old title." })),
      to: Schema.String.pipe(Schema.annotateKey({ description: "New title." })),
    }),
  ).pipe(Schema.annotateKey({ description: "Title change." })),
  state_reason: Schema.optionalKey(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Why the issue was closed or reopened." }),
  ),
  source: Schema.optionalKey(
    Schema.Struct({
      issue: Schema.optionalKey(relatedIssue).pipe(
        Schema.annotateKey({ description: "Issue that references this issue." }),
      ),
    }),
  ).pipe(Schema.annotateKey({ description: "Source of a cross-reference." })),
  sub_issue: Schema.optionalKey(relatedIssue).pipe(
    Schema.annotateKey({ description: "Sub-issue in a relationship change." }),
  ),
  parent_issue: Schema.optionalKey(relatedIssue).pipe(
    Schema.annotateKey({ description: "Parent issue in a relationship change." }),
  ),
  blocking: Schema.optionalKey(relatedIssue).pipe(
    Schema.annotateKey({ description: "Issue blocked by this one." }),
  ),
  blocked_by: Schema.optionalKey(relatedIssue).pipe(
    Schema.annotateKey({ description: "Issue that blocks this one." }),
  ),
})
  .annotate({ description: "Changes and relationship events on GitHub issues." })
  .pipe(Iceberg.identifier("key"));

export type IssueTimeline = typeof IssueTimelineSchema.Type;
export const IssueTimelineObjectSchema = IssueTimelineSchema.mapFields(
  Struct.omit(["key", "version", "repository_id", "issue_number"]),
);

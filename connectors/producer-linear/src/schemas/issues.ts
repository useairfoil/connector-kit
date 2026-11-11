import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import {
  Long,
  OptionalRef,
  OptionalString,
  OptionalTimestamp,
  Ref,
  common,
  deleted,
} from "./shared";

export const IssueSchema = Schema.Struct({
  ...common("Issue"),
  _deleted: deleted("issue"),
  identifier: Schema.String.pipe(
    Schema.annotateKey({ description: "Readable ID, such as ENG-123." }),
  ),
  number: Schema.Finite.pipe(Schema.annotateKey({ description: "Issue number within its team." })),
  title: Schema.String.pipe(Schema.annotateKey({ description: "Issue title." })),
  description: OptionalString.pipe(Schema.annotateKey({ description: "Description in markdown." })),
  url: Schema.String.pipe(Schema.annotateKey({ description: "Issue URL." })),
  branch_name: Schema.String.pipe(
    Schema.annotateKey({ description: "Suggested Git branch name." }),
  ),
  priority: Schema.Finite.pipe(
    Schema.annotateKey({ description: "0 none, 1 urgent, 2 high, 3 medium, 4 low." }),
  ),
  priority_label: Schema.String.pipe(Schema.annotateKey({ description: "Priority name." })),
  estimate: Schema.NullOr(Schema.Finite).pipe(
    Schema.annotateKey({ description: "Estimate, on the team's scale." }),
  ),
  due_date: OptionalString.pipe(Schema.annotateKey({ description: "Due date, as YYYY-MM-DD." })),
  creator_id: OptionalRef.pipe(Schema.annotateKey({ description: "User who created the issue." })),
  assignee_id: OptionalRef.pipe(Schema.annotateKey({ description: "Assigned user." })),
  delegate_id: OptionalRef.pipe(
    Schema.annotateKey({ description: "Agent user working on the issue." }),
  ),
  snoozed_by_id: OptionalRef.pipe(
    Schema.annotateKey({ description: "User who snoozed the issue." }),
  ),
  state_id: Ref.pipe(Schema.annotateKey({ description: "Workflow state." })),
  team_id: Ref.pipe(Schema.annotateKey({ description: "Team the issue belongs to." })),
  project_id: OptionalRef.pipe(Schema.annotateKey({ description: "Project." })),
  project_milestone_id: OptionalRef.pipe(Schema.annotateKey({ description: "Project milestone." })),
  cycle_id: OptionalRef.pipe(Schema.annotateKey({ description: "Cycle." })),
  parent_id: OptionalRef.pipe(Schema.annotateKey({ description: "Parent issue." })),
  source_comment_id: OptionalRef.pipe(
    Schema.annotateKey({ description: "Comment the issue was made from." }),
  ),
  external_user_creator_id: OptionalRef.pipe(
    Schema.annotateKey({
      description: "External user who created the issue through an integration.",
    }),
  ),
  label_ids: Schema.Array(Schema.String).pipe(Schema.annotateKey({ description: "Labels." })),
  previous_identifiers: Schema.Array(Schema.String).pipe(
    Schema.annotateKey({ description: "Earlier readable IDs, from before the issue moved team." }),
  ),
  started_at: OptionalTimestamp.pipe(
    Schema.annotateKey({ description: "Time the issue moved to a started state." }),
  ),
  completed_at: OptionalTimestamp.pipe(
    Schema.annotateKey({ description: "Time the issue was completed." }),
  ),
  canceled_at: OptionalTimestamp.pipe(
    Schema.annotateKey({ description: "Time the issue was canceled." }),
  ),
  started_triage_at: OptionalTimestamp.pipe(
    Schema.annotateKey({ description: "Time the issue entered triage." }),
  ),
  triaged_at: OptionalTimestamp.pipe(
    Schema.annotateKey({ description: "Time the issue left triage." }),
  ),
  auto_closed_at: OptionalTimestamp.pipe(
    Schema.annotateKey({ description: "Time the issue was closed automatically." }),
  ),
  auto_archived_at: OptionalTimestamp.pipe(
    Schema.annotateKey({ description: "Time the issue was archived automatically." }),
  ),
  added_to_cycle_at: OptionalTimestamp.pipe(
    Schema.annotateKey({ description: "Time the issue was added to its cycle." }),
  ),
  added_to_project_at: OptionalTimestamp.pipe(
    Schema.annotateKey({ description: "Time the issue was added to its project." }),
  ),
  added_to_team_at: OptionalTimestamp.pipe(
    Schema.annotateKey({ description: "Time the issue was added to its team." }),
  ),
  snoozed_until_at: OptionalTimestamp.pipe(
    Schema.annotateKey({ description: "Time the issue is snoozed until." }),
  ),
  sla_type: OptionalString.pipe(Schema.annotateKey({ description: "SLA type." })),
  sla_started_at: OptionalTimestamp.pipe(
    Schema.annotateKey({ description: "Time the SLA started." }),
  ),
  sla_breaches_at: OptionalTimestamp.pipe(
    Schema.annotateKey({ description: "Time the SLA breaches." }),
  ),
  customer_ticket_count: Long.pipe(Schema.annotateKey({ description: "Linked support tickets." })),
  integration_source_type: OptionalString.pipe(
    Schema.annotateKey({ description: "Integration that created the issue." }),
  ),
  trashed: Schema.NullOr(Schema.Boolean).pipe(
    Schema.annotateKey({ description: "Whether the issue is in the trash." }),
  ),
})
  .annotate({ description: "Linear issues, including archived and trashed ones." })
  .pipe(Iceberg.identifier("id"));

export type Issue = Schema.Schema.Type<typeof IssueSchema>;

export const IssueObjectSchema = IssueSchema.mapFields((fields) =>
  Struct.omit(fields, ["version", "_deleted"]),
);

export const IssueHistorySchema = Schema.Struct({
  ...common("History entry"),
  issue_id: Schema.String.pipe(Schema.annotateKey({ description: "Issue that changed." })),
  actor_id: OptionalString.pipe(Schema.annotateKey({ description: "User who made the change." })),
  from_state_id: OptionalString.pipe(Schema.annotateKey({ description: "Workflow state before." })),
  to_state_id: OptionalString.pipe(Schema.annotateKey({ description: "Workflow state after." })),
  from_assignee_id: OptionalString.pipe(Schema.annotateKey({ description: "Assignee before." })),
  to_assignee_id: OptionalString.pipe(Schema.annotateKey({ description: "Assignee after." })),
  from_cycle_id: OptionalString.pipe(Schema.annotateKey({ description: "Cycle before." })),
  to_cycle_id: OptionalString.pipe(Schema.annotateKey({ description: "Cycle after." })),
  from_project_id: OptionalString.pipe(Schema.annotateKey({ description: "Project before." })),
  to_project_id: OptionalString.pipe(Schema.annotateKey({ description: "Project after." })),
  from_parent_id: OptionalString.pipe(Schema.annotateKey({ description: "Parent issue before." })),
  to_parent_id: OptionalString.pipe(Schema.annotateKey({ description: "Parent issue after." })),
  from_team_id: OptionalString.pipe(Schema.annotateKey({ description: "Team before." })),
  to_team_id: OptionalString.pipe(Schema.annotateKey({ description: "Team after." })),
  from_priority: Schema.NullOr(Schema.Finite).pipe(
    Schema.annotateKey({ description: "Priority before." }),
  ),
  to_priority: Schema.NullOr(Schema.Finite).pipe(
    Schema.annotateKey({ description: "Priority after." }),
  ),
  from_estimate: Schema.NullOr(Schema.Finite).pipe(
    Schema.annotateKey({ description: "Estimate before." }),
  ),
  to_estimate: Schema.NullOr(Schema.Finite).pipe(
    Schema.annotateKey({ description: "Estimate after." }),
  ),
  from_due_date: OptionalString.pipe(
    Schema.annotateKey({ description: "Due date before, as YYYY-MM-DD." }),
  ),
  to_due_date: OptionalString.pipe(
    Schema.annotateKey({ description: "Due date after, as YYYY-MM-DD." }),
  ),
  from_title: OptionalString.pipe(Schema.annotateKey({ description: "Title before." })),
  to_title: OptionalString.pipe(Schema.annotateKey({ description: "Title after." })),
  added_label_ids: Schema.NullOr(Schema.Array(Schema.String)).pipe(
    Schema.annotateKey({ description: "Labels added." }),
  ),
  removed_label_ids: Schema.NullOr(Schema.Array(Schema.String)).pipe(
    Schema.annotateKey({ description: "Labels removed." }),
  ),
  attachment_id: OptionalString.pipe(
    Schema.annotateKey({ description: "Attachment linked or unlinked." }),
  ),
  customer_need_id: OptionalString.pipe(
    Schema.annotateKey({ description: "Customer request linked or unlinked." }),
  ),
  to_converted_project_id: OptionalString.pipe(
    Schema.annotateKey({ description: "Project the issue became." }),
  ),
  updated_description: Schema.NullOr(Schema.Boolean).pipe(
    Schema.annotateKey({ description: "Whether the description changed." }),
  ),
  archived: Schema.NullOr(Schema.Boolean).pipe(
    Schema.annotateKey({ description: "Whether the issue was archived." }),
  ),
  trashed: Schema.NullOr(Schema.Boolean).pipe(
    Schema.annotateKey({ description: "Whether the issue was trashed." }),
  ),
  auto_archived: Schema.NullOr(Schema.Boolean).pipe(
    Schema.annotateKey({ description: "Whether the issue was archived automatically." }),
  ),
  auto_closed: Schema.NullOr(Schema.Boolean).pipe(
    Schema.annotateKey({ description: "Whether the issue was closed automatically." }),
  ),
  added_to_release_ids: Schema.optionalKey(Schema.NullOr(Schema.Array(Schema.String))).pipe(
    Schema.annotateKey({ description: "Releases the issue was added to." }),
  ),
  removed_from_release_ids: Schema.optionalKey(Schema.NullOr(Schema.Array(Schema.String))).pipe(
    Schema.annotateKey({ description: "Releases the issue was removed from." }),
  ),
})
  .annotate({ description: "Linear issue history. One row per change to an issue." })
  .pipe(Iceberg.identifier("id"));

export type IssueHistory = Schema.Schema.Type<typeof IssueHistorySchema>;

export const IssueHistoryObjectSchema = IssueHistorySchema.mapFields((fields) =>
  Struct.omit(fields, ["version", "issue_id"]),
);

export const IssueRelationSchema = Schema.Struct({
  ...common("Relation"),
  issue_id: Ref.pipe(Schema.annotateKey({ description: "Issue the relation starts from." })),
  related_issue_id: Ref.pipe(Schema.annotateKey({ description: "Related issue." })),
  type: Schema.String.pipe(
    Schema.annotateKey({ description: "Relation type: blocks, duplicate, related, or similar." }),
  ),
})
  .annotate({ description: "Linear issue relations. Deleted relations aren't seen." })
  .pipe(Iceberg.identifier("id"));

export type IssueRelation = Schema.Schema.Type<typeof IssueRelationSchema>;

export const IssueRelationObjectSchema = IssueRelationSchema.mapFields((fields) =>
  Struct.omit(fields, ["version"]),
);

export const AttachmentSchema = Schema.Struct({
  ...common("Attachment"),
  _deleted: deleted("attachment"),
  issue_id: Ref.pipe(Schema.annotateKey({ description: "Issue the attachment is on." })),
  creator_id: OptionalRef.pipe(Schema.annotateKey({ description: "User who added it." })),
  external_user_creator_id: OptionalRef.pipe(
    Schema.annotateKey({ description: "External user who added it." }),
  ),
  title: Schema.String.pipe(Schema.annotateKey({ description: "Title." })),
  subtitle: OptionalString.pipe(Schema.annotateKey({ description: "Subtitle." })),
  url: Schema.String.pipe(
    Schema.annotateKey({ description: "Linked URL, such as a pull request or ticket." }),
  ),
  source_type: OptionalString.pipe(
    Schema.annotateKey({ description: "Source, such as github or zendesk." }),
  ),
})
  .annotate({ description: "Linear issue attachments: links to pull requests, tickets, and more." })
  .pipe(Iceberg.identifier("id"));

export type Attachment = Schema.Schema.Type<typeof AttachmentSchema>;

export const AttachmentObjectSchema = AttachmentSchema.mapFields((fields) =>
  Struct.omit(fields, ["version", "_deleted"]),
);

export const IssueLabelSchema = Schema.Struct({
  ...common("Label"),
  _deleted: deleted("label"),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Label name." })),
  description: OptionalString.pipe(Schema.annotateKey({ description: "Label description." })),
  color: Schema.String.pipe(Schema.annotateKey({ description: "Label color, as hex." })),
  is_group: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the label groups other labels." }),
  ),
  parent_id: OptionalRef.pipe(Schema.annotateKey({ description: "Label group." })),
  team_id: OptionalRef.pipe(
    Schema.annotateKey({ description: "Team, or null for a workspace label." }),
  ),
  creator_id: OptionalRef.pipe(Schema.annotateKey({ description: "User who made the label." })),
  retired_at: OptionalTimestamp.pipe(
    Schema.annotateKey({ description: "Time the label was retired." }),
  ),
})
  .annotate({ description: "Linear issue labels. Names the IDs in `issues.label_ids`." })
  .pipe(Iceberg.identifier("id"));

export type IssueLabel = Schema.Schema.Type<typeof IssueLabelSchema>;

export const IssueLabelObjectSchema = IssueLabelSchema.mapFields((fields) =>
  Struct.omit(fields, ["version", "_deleted"]),
);

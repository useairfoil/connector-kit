import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import {
  Long,
  OptionalRef,
  OptionalString,
  OptionalTimestamp,
  Ref,
  RefList,
  common,
  deleted,
} from "./shared";

export const ProjectSchema = Schema.Struct({
  ...common("Project"),
  _deleted: deleted("project"),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Project name." })),
  description: Schema.String.pipe(Schema.annotateKey({ description: "Short summary." })),
  content: OptionalString.pipe(
    Schema.annotateKey({ description: "Project overview in markdown." }),
  ),
  url: Schema.String.pipe(Schema.annotateKey({ description: "Project URL." })),
  icon: OptionalString.pipe(Schema.annotateKey({ description: "Icon." })),
  color: Schema.String.pipe(Schema.annotateKey({ description: "Color, as hex." })),
  status_id: Ref.pipe(Schema.annotateKey({ description: "Project status." })),
  priority: Long.pipe(
    Schema.annotateKey({ description: "0 none, 1 urgent, 2 high, 3 medium, 4 low." }),
  ),
  priority_label: Schema.String.pipe(Schema.annotateKey({ description: "Priority name." })),
  health: OptionalString.pipe(
    Schema.annotateKey({ description: "Health from the latest update." }),
  ),
  health_updated_at: OptionalTimestamp.pipe(
    Schema.annotateKey({ description: "Time the health last changed." }),
  ),
  progress: Schema.Finite.pipe(
    Schema.annotateKey({ description: "Share of the scope completed, from 0 to 1." }),
  ),
  scope: Schema.Finite.pipe(
    Schema.annotateKey({ description: "Total estimate of the project's issues." }),
  ),
  lead_id: OptionalRef.pipe(Schema.annotateKey({ description: "Project lead." })),
  creator_id: OptionalRef.pipe(Schema.annotateKey({ description: "User who made the project." })),
  converted_from_issue_id: OptionalRef.pipe(
    Schema.annotateKey({ description: "Issue the project was made from." }),
  ),
  start_date: OptionalString.pipe(
    Schema.annotateKey({ description: "Start date, as YYYY-MM-DD." }),
  ),
  target_date: OptionalString.pipe(
    Schema.annotateKey({ description: "Target date, as YYYY-MM-DD." }),
  ),
  started_at: OptionalTimestamp.pipe(
    Schema.annotateKey({ description: "Time the project started." }),
  ),
  completed_at: OptionalTimestamp.pipe(
    Schema.annotateKey({ description: "Time the project was completed." }),
  ),
  canceled_at: OptionalTimestamp.pipe(
    Schema.annotateKey({ description: "Time the project was canceled." }),
  ),
  auto_archived_at: OptionalTimestamp.pipe(
    Schema.annotateKey({ description: "Time the project was archived automatically." }),
  ),
  label_ids: Schema.Array(Schema.String).pipe(
    Schema.annotateKey({ description: "Project labels." }),
  ),
  team_ids: RefList.pipe(
    Schema.annotateKey({ description: "Teams the project belongs to. Reads up to 50." }),
  ),
  member_ids: RefList.pipe(
    Schema.annotateKey({ description: "Project members. Reads up to 100." }),
  ),
  trashed: Schema.NullOr(Schema.Boolean).pipe(
    Schema.annotateKey({ description: "Whether the project is in the trash." }),
  ),
})
  .annotate({ description: "Linear projects, including archived and trashed ones." })
  .pipe(Iceberg.identifier("id"));

export type Project = Schema.Schema.Type<typeof ProjectSchema>;

export const ProjectObjectSchema = ProjectSchema.mapFields((fields) =>
  Struct.omit(fields, ["version", "_deleted"]),
);

export const ProjectMilestoneSchema = Schema.Struct({
  ...common("Milestone"),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Milestone name." })),
  description: OptionalString.pipe(Schema.annotateKey({ description: "Description in markdown." })),
  project_id: Ref.pipe(Schema.annotateKey({ description: "Project." })),
  target_date: OptionalString.pipe(
    Schema.annotateKey({ description: "Target date, as YYYY-MM-DD." }),
  ),
  status: Schema.String.pipe(
    Schema.annotateKey({ description: "Status: unstarted, next, overdue, or done." }),
  ),
  progress: Schema.Finite.pipe(
    Schema.annotateKey({ description: "Share of the scope completed, from 0 to 1." }),
  ),
  sort_order: Schema.Finite.pipe(Schema.annotateKey({ description: "Order within the project." })),
})
  .annotate({ description: "Linear project milestones. Deleted milestones aren't seen." })
  .pipe(Iceberg.identifier("id"));

export type ProjectMilestone = Schema.Schema.Type<typeof ProjectMilestoneSchema>;

export const ProjectMilestoneObjectSchema = ProjectMilestoneSchema.mapFields((fields) =>
  Struct.omit(fields, ["version"]),
);

export const ProjectUpdateSchema = Schema.Struct({
  ...common("Update"),
  _deleted: deleted("update"),
  project_id: Ref.pipe(Schema.annotateKey({ description: "Project." })),
  user_id: Ref.pipe(Schema.annotateKey({ description: "User who posted the update." })),
  body: Schema.String.pipe(Schema.annotateKey({ description: "Update text in markdown." })),
  health: Schema.String.pipe(
    Schema.annotateKey({ description: "Health: onTrack, atRisk, or offTrack." }),
  ),
  url: Schema.String.pipe(Schema.annotateKey({ description: "Update URL." })),
  edited_at: OptionalTimestamp.pipe(
    Schema.annotateKey({ description: "Time the update was last edited." }),
  ),
  comment_count: Long.pipe(Schema.annotateKey({ description: "Comments on the update." })),
})
  .annotate({ description: "Linear project updates: status posts with a health." })
  .pipe(Iceberg.identifier("id"));

export type ProjectUpdate = Schema.Schema.Type<typeof ProjectUpdateSchema>;

export const ProjectUpdateObjectSchema = ProjectUpdateSchema.mapFields((fields) =>
  Struct.omit(fields, ["version", "_deleted"]),
);

export const ProjectStatusSchema = Schema.Struct({
  ...common("Status"),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Status name." })),
  type: Schema.String.pipe(
    Schema.annotateKey({
      description: "Status type: backlog, planned, started, paused, completed, or canceled.",
    }),
  ),
  color: Schema.String.pipe(Schema.annotateKey({ description: "Color, as hex." })),
  description: OptionalString.pipe(Schema.annotateKey({ description: "Description." })),
  position: Schema.Finite.pipe(Schema.annotateKey({ description: "Order in the list." })),
})
  .annotate({ description: "Linear project statuses. Names the IDs in `projects.status_id`." })
  .pipe(Iceberg.identifier("id"));

export type ProjectStatus = Schema.Schema.Type<typeof ProjectStatusSchema>;

export const ProjectStatusObjectSchema = ProjectStatusSchema.mapFields((fields) =>
  Struct.omit(fields, ["version"]),
);

export const ProjectLabelSchema = Schema.Struct({
  ...common("Label"),
  _deleted: deleted("label"),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Label name." })),
  description: OptionalString.pipe(Schema.annotateKey({ description: "Label description." })),
  color: Schema.String.pipe(Schema.annotateKey({ description: "Label color, as hex." })),
  is_group: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the label groups other labels." }),
  ),
  parent_id: OptionalRef.pipe(Schema.annotateKey({ description: "Label group." })),
  creator_id: OptionalRef.pipe(Schema.annotateKey({ description: "User who made the label." })),
  retired_at: OptionalTimestamp.pipe(
    Schema.annotateKey({ description: "Time the label was retired." }),
  ),
})
  .annotate({ description: "Linear project labels. Names the IDs in `projects.label_ids`." })
  .pipe(Iceberg.identifier("id"));

export type ProjectLabel = Schema.Schema.Type<typeof ProjectLabelSchema>;

export const ProjectLabelObjectSchema = ProjectLabelSchema.mapFields((fields) =>
  Struct.omit(fields, ["version", "_deleted"]),
);

export const ProjectRelationSchema = Schema.Struct({
  ...common("Relation"),
  type: Schema.String.pipe(
    Schema.annotateKey({ description: "Relation type, such as dependency." }),
  ),
  project_id: Ref.pipe(Schema.annotateKey({ description: "Project the relation starts from." })),
  project_milestone_id: OptionalRef.pipe(
    Schema.annotateKey({ description: "Milestone the relation starts from." }),
  ),
  anchor_type: Schema.String.pipe(
    Schema.annotateKey({ description: "Which end of the project it starts from." }),
  ),
  related_project_id: Ref.pipe(Schema.annotateKey({ description: "Related project." })),
  related_project_milestone_id: OptionalRef.pipe(
    Schema.annotateKey({ description: "Related milestone." }),
  ),
  related_anchor_type: Schema.String.pipe(
    Schema.annotateKey({ description: "Which end of the related project." }),
  ),
  user_id: OptionalRef.pipe(Schema.annotateKey({ description: "User who made the relation." })),
})
  .annotate({ description: "Linear project dependencies. Deleted relations aren't seen." })
  .pipe(Iceberg.identifier("id"));

export type ProjectRelation = Schema.Schema.Type<typeof ProjectRelationSchema>;

export const ProjectRelationObjectSchema = ProjectRelationSchema.mapFields((fields) =>
  Struct.omit(fields, ["version"]),
);

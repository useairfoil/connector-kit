import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import {
  OptionalRef,
  OptionalString,
  OptionalTimestamp,
  Ref,
  Timestamp,
  common,
  deleted,
} from "./shared";

export const TeamSchema = Schema.Struct({
  ...common("Team"),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Team name." })),
  key: Schema.String.pipe(
    Schema.annotateKey({ description: "Team key, used in issue IDs such as ENG-123." }),
  ),
  display_name: Schema.String.pipe(Schema.annotateKey({ description: "Name shown in Linear." })),
  description: OptionalString.pipe(Schema.annotateKey({ description: "Team description." })),
  visibility: Schema.String.pipe(Schema.annotateKey({ description: "Who can see the team." })),
  parent_id: OptionalRef.pipe(Schema.annotateKey({ description: "Parent team." })),
  timezone: Schema.String.pipe(Schema.annotateKey({ description: "Team timezone." })),
  cycles_enabled: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the team uses cycles." }),
  ),
  cycle_duration: Schema.Finite.pipe(Schema.annotateKey({ description: "Cycle length in weeks." })),
  cycle_cooldown_time: Schema.Finite.pipe(
    Schema.annotateKey({ description: "Weeks between cycles." }),
  ),
  cycle_start_day: Schema.Finite.pipe(
    Schema.annotateKey({ description: "Day cycles start, 0 for Sunday." }),
  ),
  triage_enabled: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the team uses triage." }),
  ),
  issue_estimation_type: Schema.String.pipe(Schema.annotateKey({ description: "Estimate scale." })),
  default_issue_estimate: Schema.Finite.pipe(
    Schema.annotateKey({ description: "Default estimate." }),
  ),
  auto_archive_period: Schema.Finite.pipe(
    Schema.annotateKey({ description: "Months before closed issues are archived." }),
  ),
  auto_close_period: Schema.NullOr(Schema.Finite).pipe(
    Schema.annotateKey({ description: "Months before stale issues are closed." }),
  ),
  retired_at: OptionalTimestamp.pipe(
    Schema.annotateKey({ description: "Time the team was retired." }),
  ),
})
  .annotate({ description: "Linear teams." })
  .pipe(Iceberg.identifier("id"));

export type Team = Schema.Schema.Type<typeof TeamSchema>;

export const TeamObjectSchema = TeamSchema.mapFields((fields) => Struct.omit(fields, ["version"]));

export const TeamMembershipSchema = Schema.Struct({
  ...common("Membership"),
  team_id: Ref.pipe(Schema.annotateKey({ description: "Team." })),
  user_id: Ref.pipe(Schema.annotateKey({ description: "User." })),
  owner: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the user owns the team." }),
  ),
})
  .annotate({ description: "Linear team members. Removed members aren't seen." })
  .pipe(Iceberg.identifier("id"));

export type TeamMembership = Schema.Schema.Type<typeof TeamMembershipSchema>;

export const TeamMembershipObjectSchema = TeamMembershipSchema.mapFields((fields) =>
  Struct.omit(fields, ["version"]),
);

export const WorkflowStateSchema = Schema.Struct({
  ...common("Workflow state"),
  name: Schema.String.pipe(Schema.annotateKey({ description: "State name." })),
  type: Schema.String.pipe(
    Schema.annotateKey({
      description: "State type: triage, backlog, unstarted, started, completed, or canceled.",
    }),
  ),
  color: Schema.String.pipe(Schema.annotateKey({ description: "State color, as hex." })),
  description: OptionalString.pipe(Schema.annotateKey({ description: "State description." })),
  position: Schema.Finite.pipe(Schema.annotateKey({ description: "Order within the team." })),
  team_id: Ref.pipe(Schema.annotateKey({ description: "Team." })),
})
  .annotate({ description: "Linear workflow states. Names the IDs in `issues.state_id`." })
  .pipe(Iceberg.identifier("id"));

export type WorkflowState = Schema.Schema.Type<typeof WorkflowStateSchema>;

export const WorkflowStateObjectSchema = WorkflowStateSchema.mapFields((fields) =>
  Struct.omit(fields, ["version"]),
);

export const UserSchema = Schema.Struct({
  ...common("User"),
  _deleted: deleted("user"),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Full name." })),
  display_name: Schema.String.pipe(Schema.annotateKey({ description: "Display name." })),
  email: Schema.String.pipe(Schema.annotateKey({ description: "Email address." })),
  avatar_url: OptionalString.pipe(Schema.annotateKey({ description: "Avatar image URL." })),
  title: OptionalString.pipe(Schema.annotateKey({ description: "Job title." })),
  timezone: OptionalString.pipe(Schema.annotateKey({ description: "Timezone." })),
  active: Schema.Boolean.pipe(Schema.annotateKey({ description: "Whether the user is active." })),
  admin: Schema.Boolean.pipe(Schema.annotateKey({ description: "Whether the user is an admin." })),
  owner: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the user owns the workspace." }),
  ),
  guest: Schema.Boolean.pipe(Schema.annotateKey({ description: "Whether the user is a guest." })),
  app: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the user is an app or agent." }),
  ),
  last_seen: OptionalTimestamp.pipe(
    Schema.annotateKey({ description: "Time the user was last online." }),
  ),
  url: Schema.String.pipe(Schema.annotateKey({ description: "Profile URL." })),
})
  .annotate({ description: "Linear users." })
  .pipe(Iceberg.identifier("id"));

export type User = Schema.Schema.Type<typeof UserSchema>;

export const UserObjectSchema = UserSchema.mapFields((fields) =>
  Struct.omit(fields, ["version", "_deleted"]),
);

export const ExternalUserSchema = Schema.Struct({
  ...common("External user"),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Name." })),
  display_name: Schema.String.pipe(Schema.annotateKey({ description: "Display name." })),
  email: OptionalString.pipe(Schema.annotateKey({ description: "Email address." })),
  avatar_url: OptionalString.pipe(Schema.annotateKey({ description: "Avatar image URL." })),
  last_seen: OptionalTimestamp.pipe(
    Schema.annotateKey({ description: "Time the user was last seen." }),
  ),
})
  .annotate({
    description: "People from integrations, such as Slack, who create issues and comments.",
  })
  .pipe(Iceberg.identifier("id"));

export type ExternalUser = Schema.Schema.Type<typeof ExternalUserSchema>;

export const ExternalUserObjectSchema = ExternalUserSchema.mapFields((fields) =>
  Struct.omit(fields, ["version"]),
);

export const CycleSchema = Schema.Struct({
  ...common("Cycle"),
  _deleted: deleted("cycle"),
  number: Schema.Finite.pipe(Schema.annotateKey({ description: "Cycle number within its team." })),
  name: OptionalString.pipe(Schema.annotateKey({ description: "Cycle name." })),
  description: OptionalString.pipe(Schema.annotateKey({ description: "Cycle description." })),
  team_id: Ref.pipe(Schema.annotateKey({ description: "Team." })),
  starts_at: Timestamp.pipe(Schema.annotateKey({ description: "Time the cycle starts." })),
  ends_at: Timestamp.pipe(Schema.annotateKey({ description: "Time the cycle ends." })),
  completed_at: OptionalTimestamp.pipe(
    Schema.annotateKey({ description: "Time the cycle was completed." }),
  ),
  auto_archived_at: OptionalTimestamp.pipe(
    Schema.annotateKey({ description: "Time the cycle was archived automatically." }),
  ),
  progress: Schema.Finite.pipe(
    Schema.annotateKey({ description: "Share of the scope completed, from 0 to 1." }),
  ),
})
  .annotate({ description: "Linear cycles." })
  .pipe(Iceberg.identifier("id"));

export type Cycle = Schema.Schema.Type<typeof CycleSchema>;

export const CycleObjectSchema = CycleSchema.mapFields((fields) =>
  Struct.omit(fields, ["version", "_deleted"]),
);

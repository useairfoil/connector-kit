import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { Json, Long, Optional, Ref, Timestamp, common, fetched } from "./shared";

const withoutVersion = <Fields extends Schema.Struct.Fields & { readonly version: unknown }>(
  fields: Fields,
) => Struct.omit(fields, ["version"]);

export const UserSchema = Schema.Struct({
  ...fetched("User"),
  name: Schema.String.pipe(Schema.annotateKey({ description: "User name." })),
  email: Optional(Schema.String).pipe(Schema.annotateKey({ description: "Email address." })),
  slack_user_id: Optional(Schema.String).pipe(Schema.annotateKey({ description: "Slack user." })),
  is_active: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the user is active." }),
  ),
  base_role_slug: Schema.String.pipe(
    Schema.annotateKey({ description: "Base role, such as responder." }),
  ),
  custom_role_slugs: Schema.Array(Schema.String).pipe(
    Schema.annotateKey({ description: "Custom roles." }),
  ),
  seat_on_call: Schema.String.pipe(
    Schema.annotateKey({ description: "On-call seat: full_access, viewer_only, or none." }),
  ),
  seat_response: Schema.String.pipe(
    Schema.annotateKey({ description: "Response seat: full_access, viewer_only, or none." }),
  ),
})
  .annotate({ description: "incident.io users, including deactivated ones." })
  .pipe(Iceberg.identifier("id"));

export type User = Schema.Schema.Type<typeof UserSchema>;

const RoleSchema = Schema.Struct({ slug: Schema.String });

export const UserObjectSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  email: Optional(Schema.String),
  slack_user_id: Optional(Schema.String),
  is_active: Schema.Boolean,
  base_role: RoleSchema,
  custom_roles: Schema.Array(RoleSchema),
  seats: Schema.Struct({ on_call: Schema.String, response: Schema.String }),
});

export const TeamSchema = Schema.Struct({
  ...fetched("Team"),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Team name." })),
  catalog_entry_id: Schema.String.pipe(
    Schema.annotateKey({ description: "Catalog entry for the team." }),
  ),
  member_ids: Schema.Array(Schema.String).pipe(
    Schema.annotateKey({ description: "Team members." }),
  ),
})
  .annotate({ description: "incident.io teams and their members." })
  .pipe(Iceberg.identifier("id"));

export type Team = Schema.Schema.Type<typeof TeamSchema>;

export const TeamObjectSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  catalog_entry: Ref,
  members: Schema.Array(Ref),
});

const setting = (object: string) => ({
  ...common(object),
  name: Schema.String.pipe(Schema.annotateKey({ description: `${object} name.` })),
  description: Schema.String.pipe(Schema.annotateKey({ description: `${object} description.` })),
});

export const SeveritySchema = Schema.Struct({
  ...setting("Severity"),
  rank: Long.pipe(Schema.annotateKey({ description: "Rank. Higher is more severe." })),
})
  .annotate({ description: "incident.io incident severities." })
  .pipe(Iceberg.identifier("id"));

export type Severity = Schema.Schema.Type<typeof SeveritySchema>;

export const SeverityObjectSchema = SeveritySchema.mapFields(withoutVersion);

export const IncidentStatusSchema = Schema.Struct({
  ...setting("Status"),
  rank: Long.pipe(Schema.annotateKey({ description: "Order in the app." })),
  category: Schema.String.pipe(
    Schema.annotateKey({
      description: "Status category. The app shows live as Active and learning as Post-incident.",
    }),
  ),
})
  .annotate({ description: "incident.io incident statuses." })
  .pipe(Iceberg.identifier("id"));

export type IncidentStatus = Schema.Schema.Type<typeof IncidentStatusSchema>;

export const IncidentStatusObjectSchema = IncidentStatusSchema.mapFields(withoutVersion);

export const IncidentTypeSchema = Schema.Struct({
  ...setting("Incident type"),
  is_default: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether new incidents get it by default." }),
  ),
  private_incidents_only: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether its incidents are always private." }),
  ),
  create_in_triage: Schema.String.pipe(Schema.annotateKey({ description: "always or optional." })),
  owning_team_ids: Schema.Array(Schema.String).pipe(
    Schema.annotateKey({ description: "Teams that own it." }),
  ),
})
  .annotate({ description: "incident.io incident types." })
  .pipe(Iceberg.identifier("id"));

export type IncidentType = Schema.Schema.Type<typeof IncidentTypeSchema>;

export const IncidentTypeObjectSchema = IncidentTypeSchema.mapFields((fields) => ({
  ...withoutVersion(fields),
  owning_team_ids: Optional(Schema.Array(Schema.String)),
}));

export const IncidentRoleSchema = Schema.Struct({
  ...setting("Incident role"),
  shortform: Schema.String.pipe(Schema.annotateKey({ description: "Short name, such as lead." })),
  instructions: Schema.String.pipe(Schema.annotateKey({ description: "What the role does." })),
  role_type: Schema.String.pipe(Schema.annotateKey({ description: "lead, reporter, or custom." })),
})
  .annotate({ description: "incident.io incident roles." })
  .pipe(Iceberg.identifier("id"));

export type IncidentRole = Schema.Schema.Type<typeof IncidentRoleSchema>;

export const IncidentRoleObjectSchema = IncidentRoleSchema.mapFields(withoutVersion);

export const IncidentTimestampSchema = Schema.Struct({
  ...fetched("Incident timestamp"),
  name: Schema.String.pipe(
    Schema.annotateKey({ description: "Timestamp name, such as Impact started." }),
  ),
  rank: Long.pipe(Schema.annotateKey({ description: "Order in the app." })),
})
  .annotate({ description: "incident.io timestamps that incidents record." })
  .pipe(Iceberg.identifier("id"));

export type IncidentTimestamp = Schema.Schema.Type<typeof IncidentTimestampSchema>;

export const IncidentTimestampObjectSchema = IncidentTimestampSchema.mapFields(withoutVersion);

export const CustomFieldSchema = Schema.Struct({
  ...setting("Custom field"),
  field_type: Schema.String.pipe(
    Schema.annotateKey({ description: "single_select, multi_select, text, link, or numeric." }),
  ),
  catalog_type_id: Optional(Schema.String).pipe(
    Schema.annotateKey({ description: "Catalog type its options come from." }),
  ),
})
  .annotate({ description: "incident.io incident custom fields." })
  .pipe(Iceberg.identifier("id"));

export type CustomField = Schema.Schema.Type<typeof CustomFieldSchema>;

export const CustomFieldObjectSchema = CustomFieldSchema.mapFields(withoutVersion);

export const CustomFieldOptionSchema = Schema.Struct({
  ...fetched("Custom field option"),
  custom_field_id: Schema.String.pipe(Schema.annotateKey({ description: "Custom field." })),
  value: Schema.String.pipe(Schema.annotateKey({ description: "Option text." })),
  sort_key: Long.pipe(Schema.annotateKey({ description: "Order in the app." })),
})
  .annotate({ description: "incident.io options of select custom fields." })
  .pipe(Iceberg.identifier("id"));

export type CustomFieldOption = Schema.Schema.Type<typeof CustomFieldOptionSchema>;

export const CustomFieldOptionObjectSchema = CustomFieldOptionSchema.mapFields(withoutVersion);

export const WorkflowSchema = Schema.Struct({
  ...fetched("Workflow"),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Workflow name." })),
  state: Schema.String.pipe(
    Schema.annotateKey({ description: "active, disabled, draft, or error." }),
  ),
  workflow_version: Long.pipe(Schema.annotateKey({ description: "Workflow version number." })),
  folder: Optional(Schema.String).pipe(Schema.annotateKey({ description: "Folder in the app." })),
  shortform: Optional(Schema.String).pipe(Schema.annotateKey({ description: "Short name." })),
  trigger: Json.pipe(Schema.annotateKey({ description: "What starts it, as JSON." })),
  auto_run_mode: Schema.String.pipe(
    Schema.annotateKey({ description: "Whether it runs on its own or asks first." }),
  ),
  runs_on_incidents: Schema.String.pipe(
    Schema.annotateKey({ description: "Which incidents it runs on." }),
  ),
  runs_on_incident_modes: Schema.Array(Schema.String).pipe(
    Schema.annotateKey({ description: "Incident modes it runs on." }),
  ),
  private_incident_scope: Schema.String.pipe(
    Schema.annotateKey({ description: "Private incidents it acts on." }),
  ),
  owning_team_ids: Schema.Array(Schema.String).pipe(
    Schema.annotateKey({ description: "Teams that own it." }),
  ),
  continue_on_step_error: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether it goes on after a failed step." }),
  ),
  runs_from: Optional(Timestamp).pipe(
    Schema.annotateKey({ description: "Time from which it runs." }),
  ),
  steps: Json.pipe(Schema.annotateKey({ description: "Steps, as JSON." })),
  condition_groups: Json.pipe(Schema.annotateKey({ description: "Conditions, as JSON." })),
  expressions: Json.pipe(Schema.annotateKey({ description: "Expressions, as JSON." })),
  once_for: Json.pipe(Schema.annotateKey({ description: "What it runs once for, as JSON." })),
  delay: Json.pipe(Schema.annotateKey({ description: "Delay before it runs, as JSON." })),
})
  .annotate({ description: "incident.io workflows." })
  .pipe(Iceberg.identifier("id"));

export type Workflow = Schema.Schema.Type<typeof WorkflowSchema>;

export const WorkflowObjectSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  state: Schema.String,
  version: Long,
  folder: Optional(Schema.String),
  shortform: Optional(Schema.String),
  trigger: Json,
  auto_run_mode: Schema.String,
  runs_on_incidents: Schema.String,
  runs_on_incident_modes: Schema.Array(Schema.String),
  private_incident_scope: Schema.String,
  owning_team_ids: Optional(Schema.Array(Schema.String)),
  continue_on_step_error: Schema.Boolean,
  runs_from: Optional(Timestamp),
  steps: Json,
  condition_groups: Json,
  expressions: Json,
  once_for: Json,
  delay: Schema.optional(Json),
});

export const WorkflowRunSchema = Schema.Struct({
  ...common("Workflow run"),
  workflow_id: Schema.String.pipe(Schema.annotateKey({ description: "Workflow." })),
  workflow_name: Optional(Schema.String).pipe(
    Schema.annotateKey({ description: "Workflow name." }),
  ),
  workflow_version_id: Schema.String.pipe(Schema.annotateKey({ description: "Workflow version." })),
  workflow_version_number: Long.pipe(
    Schema.annotateKey({ description: "Workflow version number." }),
  ),
  incident_id: Optional(Schema.String).pipe(
    Schema.annotateKey({ description: "Incident it ran on." }),
  ),
  incident_reference: Optional(Schema.String).pipe(
    Schema.annotateKey({ description: "Incident reference, such as INC-123." }),
  ),
  scheduled_at: Timestamp.pipe(Schema.annotateKey({ description: "Time it was due to run." })),
  enqueued_at: Optional(Timestamp).pipe(Schema.annotateKey({ description: "Time it was queued." })),
  cancelled_at: Optional(Timestamp).pipe(
    Schema.annotateKey({ description: "Time it was cancelled." }),
  ),
  error: Optional(Schema.String).pipe(Schema.annotateKey({ description: "Error, if it failed." })),
  progress: Json.pipe(Schema.annotateKey({ description: "Progress of each step, as JSON." })),
})
  .annotate({ description: "incident.io workflow runs." })
  .pipe(Iceberg.identifier("id"));

export type WorkflowRun = Schema.Schema.Type<typeof WorkflowRunSchema>;

export const WorkflowRunObjectSchema = WorkflowRunSchema.mapFields(withoutVersion);

export const StatusPageSchema = Schema.Struct({
  ...fetched("Status page"),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Status page name." })),
  description: Optional(Schema.String).pipe(
    Schema.annotateKey({ description: "Status page description." }),
  ),
  public_url: Optional(Schema.String).pipe(Schema.annotateKey({ description: "Public URL." })),
})
  .annotate({ description: "incident.io status pages." })
  .pipe(Iceberg.identifier("id"));

export type StatusPage = Schema.Schema.Type<typeof StatusPageSchema>;

export const StatusPageObjectSchema = StatusPageSchema.mapFields(withoutVersion);

export const StatusPageComponentSchema = Schema.Struct({
  ...fetched("Status page component"),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Component name." })),
  description: Optional(Schema.String).pipe(
    Schema.annotateKey({ description: "Component description." }),
  ),
  management_meta: Json.pipe(
    Schema.annotateKey({ description: "How the component is managed, as JSON." }),
  ),
})
  .annotate({ description: "incident.io status page components." })
  .pipe(Iceberg.identifier("id"));

export type StatusPageComponent = Schema.Schema.Type<typeof StatusPageComponentSchema>;

export const StatusPageComponentObjectSchema = StatusPageComponentSchema.mapFields(withoutVersion);

export const StatusPageIncidentSchema = Schema.Struct({
  ...fetched("Status page incident"),
  status_page_id: Schema.String.pipe(Schema.annotateKey({ description: "Status page." })),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Incident name on the page." })),
  incident_status: Schema.String.pipe(
    Schema.annotateKey({ description: "investigating, identified, monitoring, or resolved." }),
  ),
  published_at: Timestamp.pipe(Schema.annotateKey({ description: "Time it was published." })),
  component_impacts: Json.pipe(
    Schema.annotateKey({ description: "Affected components, as JSON." }),
  ),
  updates: Json.pipe(Schema.annotateKey({ description: "Updates posted, as JSON." })),
})
  .annotate({ description: "incident.io incidents published on status pages." })
  .pipe(Iceberg.identifier("id"));

export type StatusPageIncident = Schema.Schema.Type<typeof StatusPageIncidentSchema>;

export const StatusPageIncidentObjectSchema = StatusPageIncidentSchema.mapFields(withoutVersion);

export const StatusPageMaintenanceSchema = Schema.Struct({
  ...fetched("Status page maintenance"),
  status_page_id: Schema.String.pipe(Schema.annotateKey({ description: "Status page." })),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Maintenance name." })),
  maintenance_status: Schema.String.pipe(
    Schema.annotateKey({ description: "Scheduled, in progress, or complete." }),
  ),
  published_at: Timestamp.pipe(Schema.annotateKey({ description: "Time it was published." })),
  automate_maintenance_status: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the status changes on its own." }),
  ),
  component_maintenance_periods: Json.pipe(
    Schema.annotateKey({ description: "Components and times, as JSON." }),
  ),
  updates: Json.pipe(Schema.annotateKey({ description: "Updates posted, as JSON." })),
})
  .annotate({ description: "incident.io maintenances published on status pages." })
  .pipe(Iceberg.identifier("id"));

export type StatusPageMaintenance = Schema.Schema.Type<typeof StatusPageMaintenanceSchema>;

export const StatusPageMaintenanceObjectSchema =
  StatusPageMaintenanceSchema.mapFields(withoutVersion);

export const PolicySchema = Schema.Struct({
  ...common("Policy"),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Policy name." })),
  description: Optional(Schema.String).pipe(
    Schema.annotateKey({ description: "Policy description." }),
  ),
  policy_type: Schema.String.pipe(
    Schema.annotateKey({ description: "What it checks, such as follow_up." }),
  ),
  status: Schema.String.pipe(Schema.annotateKey({ description: "enabled or disabled." })),
  conditions: Json.pipe(Schema.annotateKey({ description: "Which items it applies to, as JSON." })),
  rules: Json.pipe(Schema.annotateKey({ description: "Rules for its policy type, as JSON." })),
  assignment_rules: Json.pipe(Schema.annotateKey({ description: "Who is responsible, as JSON." })),
})
  .annotate({ description: "incident.io policies, such as follow-up deadlines." })
  .pipe(Iceberg.identifier("id"));

export type Policy = Schema.Schema.Type<typeof PolicySchema>;

/** Rules sit under a key named after the policy type. */
export const PolicyObjectSchema = Schema.Struct({
  id: Schema.String,
  created_at: Timestamp,
  updated_at: Timestamp,
  name: Schema.String,
  description: Optional(Schema.String),
  policy_type: Schema.String,
  status: Schema.String,
  conditions: Json,
  assignment_rules: Schema.optional(Json),
  debrief: Schema.optional(Json),
  follow_up: Schema.optional(Json),
  on_call_readiness: Schema.optional(Json),
  post_mortem: Schema.optional(Json),
  schedule: Schema.optional(Json),
});

export const PolicyFindingSchema = Schema.Struct({
  ...common("Policy finding"),
  policy_id: Schema.String.pipe(Schema.annotateKey({ description: "Policy." })),
  policy_type: Schema.String.pipe(Schema.annotateKey({ description: "What the policy checks." })),
  state: Schema.String.pipe(
    Schema.annotateKey({ description: "pending, active, resolved, cancelled, or dismissed." }),
  ),
  due_at: Optional(Timestamp).pipe(Schema.annotateKey({ description: "Time it's due." })),
  days: Optional(Long).pipe(Schema.annotateKey({ description: "Days the finding covers." })),
  last_checked_at: Timestamp.pipe(Schema.annotateKey({ description: "Time it was last checked." })),
  responsible_user_ids: Schema.Array(Schema.String).pipe(
    Schema.annotateKey({ description: "Users responsible." }),
  ),
  details: Json.pipe(Schema.annotateKey({ description: "Details for the policy type, as JSON." })),
  dismissal: Json.pipe(Schema.annotateKey({ description: "Why it was dismissed, as JSON." })),
})
  .annotate({ description: "incident.io policy findings: items that break a policy." })
  .pipe(Iceberg.identifier("id"));

export type PolicyFinding = Schema.Schema.Type<typeof PolicyFindingSchema>;

/** Details sit under a key named after the policy type. */
export const PolicyFindingObjectSchema = Schema.Struct({
  id: Schema.String,
  created_at: Timestamp,
  updated_at: Timestamp,
  policy_id: Schema.String,
  policy_type: Schema.String,
  state: Schema.String,
  due_at: Optional(Timestamp),
  days: Optional(Long),
  last_checked_at: Timestamp,
  responsible_users: Schema.Array(Ref),
  dismissal: Schema.optional(Json),
  debrief: Schema.optional(Json),
  follow_up: Schema.optional(Json),
  on_call_readiness: Schema.optional(Json),
  post_mortem: Schema.optional(Json),
  schedule: Schema.optional(Json),
  shift_conflict: Schema.optional(Json),
  vacation_conflict: Schema.optional(Json),
});

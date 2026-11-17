import type { Demo } from "@useairfoil/connector-kit";

import type { CatalogEntry, CatalogType } from "../schemas/catalog";
import type {
  CustomField,
  CustomFieldOption,
  IncidentRole,
  IncidentStatus,
  IncidentTimestamp,
  IncidentType,
  Policy,
  Severity,
  Team,
  User,
  Workflow,
} from "../schemas/settings";

import { alertingTables } from "./alerting";
import {
  affectedServiceField,
  customerImpactField,
  day,
  impactOptions,
  json,
  policyId,
  roleId,
  roles,
  serviceEntryId,
  services,
  severities,
  severityId,
  statuses,
  statusId,
  teamEntryId,
  teamId,
  teams,
  timestampId,
  timestamps,
  ulid,
  userCount,
  userId,
  workflowId,
  workflows,
} from "./shared";
import { statusPageTables } from "./status-page";

/** The workspace, written once before any incident. */
export const setupRows = (context: Demo.DemoContext) => {
  const { faker, now } = context;
  const setup = new Date(now.getTime() - 700 * day);
  const stamp = { version: setup, created_at: setup, updated_at: setup };

  const users: Array<User> = Array.from({ length: userCount }, (_, u) => {
    const first = faker.person.firstName();
    const last = faker.person.lastName();

    return {
      id: userId(u),
      version: now,
      name: `${first} ${last}`,
      email: faker.internet.exampleEmail({ firstName: first, lastName: last }).toLowerCase(),
      slack_user_id: `U0${faker.string.alphanumeric({ length: 9, casing: "upper" })}`,
      is_active: true,
      base_role_slug: u < 2 ? "owner" : u < 6 ? "admin" : "responder",
      custom_role_slugs: [],
      seat_on_call: u < 16 ? "full_access" : "none",
      seat_response: "full_access",
    };
  });

  const teamRows: Array<Team> = teams.map((name, t) => ({
    id: teamId(t),
    version: now,
    name,
    catalog_entry_id: teamEntryId(t),
    member_ids: users.filter((_, u) => u % teams.length === t).map((user) => user.id),
  }));

  const catalogTypes: Array<CatalogType> = [
    {
      id: ulid("CTY", 0),
      name: "Service",
      typeName: 'Custom["Service"]',
      categories: ["service"],
      icon: "box",
      count: services.length,
    },
    {
      id: ulid("CTY", 1),
      name: "Team",
      typeName: 'Custom["Team"]',
      categories: ["team"],
      icon: "users",
      count: teams.length,
    },
  ].map((type) => ({
    id: type.id,
    ...stamp,
    name: type.name,
    description: `${type.name}s at Acme`,
    type_name: type.typeName,
    engine_resource_type: `CatalogEntry["${type.id}"]`,
    ranked: false,
    is_editable: true,
    categories: type.categories,
    color: "blue",
    icon: type.icon,
    annotations: new Map(),
    attributes: [
      {
        attribute_id: ulid("CAT", type.count),
        name: "Owner",
        type: "User",
        array: false,
        mode: "dashboard",
      },
    ],
    schema_version: 1n,
    last_synced_at: null,
    estimated_count: BigInt(type.count),
    owning_team_ids: [teamId(0)],
  }));

  const catalogEntries: Array<CatalogEntry> = [
    ...services.map((name, s) => ({
      id: serviceEntryId(s),
      type: ulid("CTY", 0),
      name,
      owner: (s * 3) % userCount,
    })),
    ...teams.map((name, t) => ({ id: teamEntryId(t), type: ulid("CTY", 1), name, owner: t })),
  ].map((entry, rank) => ({
    id: entry.id,
    ...stamp,
    catalog_type_id: entry.type,
    name: entry.name,
    external_id: entry.name.toLowerCase().replaceAll(" ", "-"),
    rank: BigInt(rank),
    aliases: [],
    archived_at: null,
    attribute_values: new Map([
      [
        ulid("CAT", entry.type === ulid("CTY", 0) ? services.length : teams.length),
        { value: { label: `User ${entry.owner}`, literal: userId(entry.owner) }, array_value: [] },
      ],
    ]),
  }));

  const severityRows: Array<Severity> = severities.map((severity, s) => ({
    id: severityId(s),
    ...stamp,
    name: severity.name,
    description: severity.description,
    rank: severity.rank,
  }));

  const statusRows: Array<IncidentStatus> = statuses.map((status, s) => ({
    id: statusId(s),
    ...stamp,
    name: status.name,
    description: `Incidents that are ${status.name.toLowerCase()}.`,
    rank: BigInt(s),
    category: status.category,
  }));

  const types: Array<IncidentType> = [
    { name: "Default", private: false, isDefault: true },
    { name: "Security", private: true, isDefault: false },
  ].map((type, t) => ({
    id: ulid("ITY", t),
    ...stamp,
    name: type.name,
    description: `${type.name} incidents`,
    is_default: type.isDefault,
    private_incidents_only: type.private,
    create_in_triage: "optional",
    owning_team_ids: [teamId(0)],
  }));

  const roleRows: Array<IncidentRole> = roles.map((role, r) => ({
    id: roleId(r),
    ...stamp,
    name: role.name,
    description: `${role.name} for the incident`,
    shortform: role.shortform,
    instructions:
      role.type === "lead"
        ? "Coordinate the response and keep the channel updated."
        : "Help the lead.",
    role_type: role.type,
  }));

  const timestampRows: Array<IncidentTimestamp> = timestamps.map((name, t) => ({
    id: timestampId(t),
    version: now,
    name,
    rank: BigInt(t),
  }));

  const fields: Array<CustomField> = [
    {
      id: affectedServiceField,
      ...stamp,
      name: "Affected service",
      description: "Service with the problem.",
      field_type: "single_select",
      catalog_type_id: ulid("CTY", 0),
    },
    {
      id: customerImpactField,
      ...stamp,
      name: "Customer impact",
      description: "How many customers noticed.",
      field_type: "single_select",
      catalog_type_id: null,
    },
  ];

  const options: Array<CustomFieldOption> = impactOptions.map((value, o) => ({
    id: ulid("CFO", o),
    version: now,
    custom_field_id: customerImpactField,
    value,
    sort_key: BigInt(o * 10),
  }));

  const alertingSetup = alertingTables(context, setup);
  const statusPageSetup = statusPageTables(context);

  const workflowRows: Array<Workflow> = workflows.map((name, w) => ({
    id: workflowId(w),
    version: now,
    name,
    state: "active",
    workflow_version: BigInt(w + 2),
    folder: "Response",
    shortform: null,
    trigger: json({ name: w === 2 ? "incident.status_changed" : "incident.created" }),
    auto_run_mode: "auto",
    runs_on_incidents: "newly_created",
    runs_on_incident_modes: ["standard"],
    private_incident_scope: "exclude",
    owning_team_ids: [teamId(0)],
    continue_on_step_error: false,
    runs_from: setup,
    steps: json([
      {
        name:
          w === 0
            ? "pagerduty.escalate"
            : w === 1
              ? "slack.post_message"
              : "incident.create_postmortem",
      },
    ]),
    condition_groups: json([]),
    expressions: json([]),
    once_for: json(["incident"]),
    delay: null,
  }));

  const policies: Array<Policy> = [
    {
      id: policyId,
      ...stamp,
      name: "Follow-ups done in 30 days",
      description: "Critical and major incidents close their follow-ups within 30 days.",
      policy_type: "follow_up",
      status: "enabled",
      conditions: json([
        { subject: "incident.severity", operation: "rank_gte", param: severityId(1) },
      ]),
      rules: json({ days: 30 }),
      assignment_rules: json({ assignee: "follow_up_assignee" }),
    },
  ];

  return {
    alert_tags: [{ id: ulid("TAG", 0), name: "production", version: now }],
    users,
    teams: teamRows,
    catalog_types: catalogTypes,
    catalog_entries: catalogEntries,
    severities: severityRows,
    incident_statuses: statusRows,
    incident_types: types,
    incident_roles: roleRows,
    incident_timestamps: timestampRows,
    custom_fields: fields,
    custom_field_options: options,
    ...alertingSetup,
    ...statusPageSetup,
    workflows: workflowRows,
    policies,
  };
};

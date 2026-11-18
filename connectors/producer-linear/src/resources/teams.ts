import { Resource } from "@useairfoil/connector-kit";
import { DateTime, Effect, Schema } from "effect";

import type { LinearClientService } from "../client/client";

import { Timestamp } from "../schemas/shared";
import {
  CustomViewObjectSchema,
  CustomViewSchema,
  CycleObjectSchema,
  CycleSchema,
  ExternalUserObjectSchema,
  ExternalUserSchema,
  SlaRuleSchema,
  TeamMembershipObjectSchema,
  TeamMembershipSchema,
  TeamObjectSchema,
  TeamSchema,
  TeamSlaRulesSchema,
  TemplateObjectSchema,
  TemplateSchema,
  UserObjectSchema,
  UserSchema,
  WorkflowStateObjectSchema,
  WorkflowStateSchema,
} from "../schemas/teams";
import {
  backfillList,
  changesList,
  checkList,
  listSources,
  listSpec,
  readAllSources,
  rowsOf,
  webhookList,
} from "./pages";

const teamSpec = listSpec({
  connection: "teams",
  fields: `id created_at: createdAt updated_at: updatedAt archived_at: archivedAt
    name key display_name: displayName description visibility parent_id: parent { id }
    timezone cycles_enabled: cyclesEnabled cycle_duration: cycleDuration
    cycle_cooldown_time: cycleCooldownTime cycle_start_day: cycleStartDay
    triage_enabled: triageEnabled issue_estimation_type: issueEstimationType
    default_issue_estimate: defaultIssueEstimate auto_archive_period: autoArchivePeriod
    auto_close_period: autoClosePeriod retired_at: retiredAt`,
  item: TeamObjectSchema,
  updatedAt: (team) => team.updated_at,
  rows: rowsOf((team) => ({ ...team, version: team.updated_at })),
});

export const makeTeams = (client: LinearClientService) =>
  Resource.entity({
    name: "teams",
    rowSchema: TeamSchema,
    version: "version",
    ...listSources(client, teamSpec),
  });

const teamMembershipSpec = listSpec({
  connection: "teamMemberships",
  fields: `id created_at: createdAt updated_at: updatedAt archived_at: archivedAt team_id: team { id } user_id: user { id } owner`,
  item: TeamMembershipObjectSchema,
  updatedAt: (membership) => membership.updated_at,
  rows: rowsOf((membership) => ({ ...membership, version: membership.updated_at })),
});

export const makeTeamMemberships = (client: LinearClientService) =>
  Resource.entity({
    name: "team_memberships",
    rowSchema: TeamMembershipSchema,
    version: "version",
    ...listSources(client, teamMembershipSpec),
  });

const workflowStateSpec = listSpec({
  connection: "workflowStates",
  fields: `id created_at: createdAt updated_at: updatedAt archived_at: archivedAt name type color description position team_id: team { id }`,
  item: WorkflowStateObjectSchema,
  updatedAt: (state) => state.updated_at,
  rows: rowsOf((state) => ({ ...state, version: state.updated_at })),
});

export const makeWorkflowStates = (client: LinearClientService) =>
  Resource.entity({
    name: "workflow_states",
    rowSchema: WorkflowStateSchema,
    version: "version",
    ...listSources(client, workflowStateSpec),
  });

const userSpec = listSpec({
  connection: "users",
  single: "user",
  fields: `id created_at: createdAt updated_at: updatedAt archived_at: archivedAt
    name display_name: displayName email avatar_url: avatarUrl title timezone
    active admin owner guest app last_seen: lastSeen url`,
  item: UserObjectSchema,
  updatedAt: (user) => user.updated_at,
  rows: rowsOf((user) => ({ ...user, version: user.updated_at, _deleted: false })),
});

export const makeUsers = (client: LinearClientService) =>
  Resource.entity({
    name: "users",
    rowSchema: UserSchema,
    version: "version",
    ...listSources(client, userSpec),
    webhook: webhookList(client, userSpec),
  });

const externalUserSpec = listSpec({
  connection: "externalUsers",
  fields: `id created_at: createdAt updated_at: updatedAt archived_at: archivedAt name display_name: displayName email avatar_url: avatarUrl last_seen: lastSeen`,
  item: ExternalUserObjectSchema,
  updatedAt: (user) => user.updated_at,
  rows: rowsOf((user) => ({ ...user, version: user.updated_at })),
});

export const makeExternalUsers = (client: LinearClientService) =>
  Resource.entity({
    name: "external_users",
    rowSchema: ExternalUserSchema,
    version: "version",
    ...listSources(client, externalUserSpec),
  });

const cycleSpec = listSpec({
  connection: "cycles",
  single: "cycle",
  fields: `id created_at: createdAt updated_at: updatedAt archived_at: archivedAt
    number name description team_id: team { id } starts_at: startsAt ends_at: endsAt
    completed_at: completedAt auto_archived_at: autoArchivedAt progress`,
  item: CycleObjectSchema,
  updatedAt: (cycle) => cycle.updated_at,
  rows: rowsOf((cycle) => ({ ...cycle, version: cycle.updated_at, _deleted: false })),
});

export const makeCycles = (client: LinearClientService) =>
  Resource.entity({
    name: "cycles",
    rowSchema: CycleSchema,
    version: "version",

    check: checkList(client, cycleSpec),
    backfill: backfillList(client, cycleSpec),
    changes: changesList(client, cycleSpec),
    webhook: webhookList(client, cycleSpec),
  });

const slaRulesSpec = (client: LinearClientService) =>
  listSpec({
    connection: "teams",
    fields: "id updated_at: updatedAt",
    item: Schema.Struct({ id: Schema.String, updated_at: Timestamp }),
    updatedAt: (team) => team.updated_at,
    // Rules have no update time, so the version is the read time.
    rows: (teams) =>
      Effect.forEach(teams, ({ id }) =>
        Effect.gen(function* () {
          const { rules } = yield* client.query(
            Schema.Struct({ rules: Schema.Array(SlaRuleSchema) }),
            `query SlaConfigurations($id: String!) {
  rules: slaConfigurations(teamId: $id) {
    id name conditions removes_sla: removesSla sla sla_type: slaType start_mode: startMode
  }
}`,
            { id },
          );
          return { id, version: yield* DateTime.nowAsDate, rules };
        }),
      ),
  });

export const makeTeamSlaRules = (client: LinearClientService) =>
  Resource.entity({
    name: "team_sla_rules",
    rowSchema: TeamSlaRulesSchema,
    version: "version",
    ...listSources(client, slaRulesSpec(client)),
  });

const viewAndTemplateFields = `id created_at: createdAt updated_at: updatedAt archived_at: archivedAt
    name description team_id: team { id }`;

/** `templates` has no paging and already includes archived templates. */
export const makeTemplates = (client: LinearClientService) => {
  const read = client
    .query(
      Schema.Struct({ templates: Schema.Array(TemplateObjectSchema) }),
      `query Templates {
  templates {
    ${viewAndTemplateFields} type template_data: templateData content has_form_fields: hasFormFields
  }
}`,
    )
    .pipe(
      Effect.map(({ templates }) =>
        templates.map((template) => ({ ...template, version: template.updated_at })),
      ),
    );
  return Resource.entity({
    name: "templates",
    rowSchema: TemplateSchema,
    version: "version",
    ...readAllSources(Effect.asVoid(read), read),
  });
};

const customViewSpec = listSpec({
  connection: "customViews",
  fields: `${viewAndTemplateFields} model_name: modelName owner_id: owner { id }
    creator_id: creator { id } shared filter_data: filterData
    project_filter_data: projectFilterData initiative_filter_data: initiativeFilterData
    feed_item_filter_data: feedItemFilterData`,
  item: CustomViewObjectSchema,
  updatedAt: (view) => view.updated_at,
  rows: rowsOf((view) => ({ ...view, version: view.updated_at })),
});

export const makeCustomViews = (client: LinearClientService) =>
  Resource.entity({
    name: "custom_views",
    rowSchema: CustomViewSchema,
    version: "version",

    check: checkList(client, customViewSpec),
    backfill: backfillList(client, customViewSpec),
    changes: changesList(client, customViewSpec),
  });

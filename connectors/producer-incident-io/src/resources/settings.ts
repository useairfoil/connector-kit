import { Cursor, Fetch, Resource } from "@useairfoil/connector-kit";
import { DateTime, Effect, Option, Schema, Struct } from "effect";

import type { IncidentIoClientService } from "../client/client";

import {
  CustomFieldObjectSchema,
  CustomFieldOptionObjectSchema,
  CustomFieldOptionSchema,
  CustomFieldSchema,
  IncidentRoleObjectSchema,
  IncidentRoleSchema,
  IncidentStatusObjectSchema,
  IncidentTemplateObjectSchema,
  IncidentTemplateSchema,
  IncidentStatusSchema,
  IncidentTimestampObjectSchema,
  IncidentTimestampSchema,
  IncidentTypeObjectSchema,
  IncidentTypeSchema,
  type Policy,
  type PolicyFinding,
  PolicyFindingObjectSchema,
  PolicyFindingSchema,
  PolicyObjectSchema,
  PolicySchema,
  SeverityObjectSchema,
  SeveritySchema,
  StatusPageAvailabilityObjectSchema,
  StatusPageAvailabilitySchema,
  StatusPageComponentObjectSchema,
  StatusPageComponentSchema,
  StatusPageGroupSchema,
  StatusPageIncidentObjectSchema,
  StatusPageIncidentLinksSchema,
  StatusPageIncidentSchema,
  StatusPageMaintenanceObjectSchema,
  StatusPageMaintenanceSchema,
  StatusPageObjectSchema,
  StatusPageSchema,
  StatusPageStructureObjectSchema,
  TeamObjectSchema,
  TeamSchema,
  UserObjectSchema,
  UserSchema,
  type Workflow,
  WorkflowObjectSchema,
  WorkflowRunObjectSchema,
  WorkflowRunSchema,
  WorkflowSchema,
} from "../schemas/settings";
import { Ref, WebhookTargetSchema } from "../schemas/shared";
import { findOne, hourly, listAll, listSources } from "./pages";

export const makeUsers = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "users",
    rowSchema: UserSchema,
    version: "version",
    ...listSources(
      Effect.gen(function* () {
        const version = yield* DateTime.nowAsDate;
        const users = yield* listAll(client, {
          path: "/v2/users",
          key: "users",
          item: UserObjectSchema,
          params: { include_inactive: "true", page_size: "1000" },
        });
        return users.map(({ base_role, custom_roles, seats, ...user }) => ({
          ...user,
          version,
          base_role_slug: base_role.slug,
          custom_role_slugs: custom_roles.map((role) => role.slug),
          seat_on_call: seats.on_call,
          seat_response: seats.response,
        }));
      }),
    ),
  });

export const makeTeams = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "teams",
    rowSchema: TeamSchema,
    version: "version",
    ...listSources(
      Effect.gen(function* () {
        const version = yield* DateTime.nowAsDate;
        const teams = yield* listAll(client, {
          path: "/v3/teams",
          key: "teams",
          item: TeamObjectSchema,
          params: { page_size: "250" },
        });
        return teams.map(({ catalog_entry, members, ...team }) => ({
          ...team,
          version,
          catalog_entry_id: catalog_entry.id,
          member_ids: members.map((member) => member.id),
        }));
      }),
    ),
  });

export const makeSeverities = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "severities",
    rowSchema: SeveritySchema,
    version: "version",
    ...listSources(
      listAll(client, {
        path: "/v1/severities",
        key: "severities",
        item: SeverityObjectSchema,
      }).pipe(Effect.map((items) => items.map((item) => ({ ...item, version: item.updated_at })))),
    ),
  });

export const makeIncidentStatuses = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "incident_statuses",
    rowSchema: IncidentStatusSchema,
    version: "version",
    ...listSources(
      listAll(client, {
        path: "/v1/incident_statuses",
        key: "incident_statuses",
        item: IncidentStatusObjectSchema,
      }).pipe(Effect.map((items) => items.map((item) => ({ ...item, version: item.updated_at })))),
    ),
  });

export const makeIncidentTypes = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "incident_types",
    rowSchema: IncidentTypeSchema,
    version: "version",
    ...listSources(
      listAll(client, {
        path: "/v1/incident_types",
        key: "incident_types",
        item: IncidentTypeObjectSchema,
      }).pipe(
        Effect.map((items) =>
          items.map((item) => ({
            ...item,
            version: item.updated_at,
            owning_team_ids: item.owning_team_ids ?? [],
          })),
        ),
      ),
    ),
  });

export const makeIncidentRoles = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "incident_roles",
    rowSchema: IncidentRoleSchema,
    version: "version",
    ...listSources(
      listAll(client, {
        path: "/v2/incident_roles",
        key: "incident_roles",
        item: IncidentRoleObjectSchema,
      }).pipe(Effect.map((items) => items.map((item) => ({ ...item, version: item.updated_at })))),
    ),
  });

export const makeIncidentTimestamps = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "incident_timestamps",
    rowSchema: IncidentTimestampSchema,
    version: "version",
    ...listSources(
      Effect.gen(function* () {
        const version = yield* DateTime.nowAsDate;
        const timestamps = yield* listAll(client, {
          path: "/v2/incident_timestamps",
          key: "incident_timestamps",
          item: IncidentTimestampObjectSchema,
        });
        return timestamps.map((timestamp) => ({ ...timestamp, version }));
      }),
    ),
  });

const listCustomFields = (client: IncidentIoClientService) =>
  listAll(client, {
    path: "/v2/custom_fields",
    key: "custom_fields",
    item: CustomFieldObjectSchema,
  });

export const makeCustomFields = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "custom_fields",
    rowSchema: CustomFieldSchema,
    version: "version",
    ...listSources(
      listCustomFields(client).pipe(
        Effect.map((items) => items.map((item) => ({ ...item, version: item.updated_at }))),
      ),
    ),
  });

export const makeCustomFieldOptions = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "custom_field_options",
    rowSchema: CustomFieldOptionSchema,
    version: "version",
    ...listSources(
      Effect.gen(function* () {
        const version = yield* DateTime.nowAsDate;
        const fields = yield* listCustomFields(client);
        const options = yield* Effect.forEach(fields, (field) =>
          listAll(client, {
            path: "/v1/custom_field_options",
            key: "custom_field_options",
            item: CustomFieldOptionObjectSchema,
            params: { custom_field_id: field.id, page_size: "250" },
          }),
        );
        return options.flat().map((option) => ({ ...option, version }));
      }),
    ),
  });

export const makeIncidentTemplates = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "incident_templates",
    rowSchema: IncidentTemplateSchema,
    version: "version",
    ...listSources(
      listAll(client, {
        path: "/v1/incident_templates",
        key: "incident_templates",
        item: IncidentTemplateObjectSchema,
        params: { page_size: "250" },
      }).pipe(Effect.map((items) => items.map((item) => ({ ...item, version: item.updated_at })))),
    ),
  });

export const makeWorkflows = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "workflows",
    rowSchema: WorkflowSchema,
    version: "version",
    ...listSources(
      Effect.gen(function* () {
        const version = yield* DateTime.nowAsDate;
        const workflows = yield* listAll(client, {
          path: "/v2/workflows",
          key: "workflows",
          item: WorkflowObjectSchema,
        });
        return workflows.map(
          ({ version: workflow_version, owning_team_ids, delay, ...workflow }): Workflow => ({
            ...workflow,
            version,
            workflow_version,
            owning_team_ids: owning_team_ids ?? [],
            delay: delay ?? null,
          }),
        );
      }),
    ),
  });

export const makeWorkflowRuns = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "workflow_runs",
    rowSchema: WorkflowRunSchema,
    version: "version",
    // Runs only filter by `created_at`, and a delayed run can finish days later.
    ...listSources(
      listAll(client, {
        path: "/v2/workflow_runs",
        key: "workflow_runs",
        item: WorkflowRunObjectSchema,
        params: { page_size: "50" },
      }).pipe(Effect.map((runs) => runs.map((run) => ({ ...run, version: run.updated_at })))),
    ),
  });

const listStatusPages = (client: IncidentIoClientService) =>
  listAll(client, {
    path: "/v2/status_pages",
    key: "status_pages",
    item: StatusPageObjectSchema,
    params: { page_size: "250" },
  });

export const makeStatusPages = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "status_pages",
    rowSchema: StatusPageSchema,
    version: "version",
    ...listSources(
      Effect.gen(function* () {
        const version = yield* DateTime.nowAsDate;
        const pages = yield* listStatusPages(client);
        return pages.map((page) => ({ ...page, version }));
      }),
    ),
  });

export const makeStatusPageComponents = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "status_page_components",
    rowSchema: StatusPageComponentSchema,
    version: "version",
    ...listSources(
      Effect.gen(function* () {
        const version = yield* DateTime.nowAsDate;
        const components = yield* listAll(client, {
          path: "/v2/status_page_components",
          key: "status_page_components",
          item: StatusPageComponentObjectSchema,
        });
        return components.map((component) => ({ ...component, version }));
      }),
    ),
  });

export const makeStatusPageIncidents = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "status_page_incidents",
    rowSchema: StatusPageIncidentSchema,
    version: "version",
    ...listSources(
      Effect.gen(function* () {
        const version = yield* DateTime.nowAsDate;
        const pages = yield* listStatusPages(client);
        const incidents = yield* Effect.forEach(pages, (page) =>
          listAll(client, {
            path: "/v2/status_page_incidents",
            key: "status_page_incidents",
            item: StatusPageIncidentObjectSchema,
            params: { status_page_id: page.id, page_size: "250" },
          }),
        );
        return incidents.flat().map((incident) => ({ ...incident, version }));
      }),
    ),
    webhook: {
      schema: WebhookTargetSchema,
      handler: ({ payload }) =>
        Effect.gen(function* () {
          const version = yield* DateTime.nowAsDate;
          return yield* findOne(client, {
            path: `/v2/status_page_incidents/${payload.id}`,
            key: "status_page_incident",
            item: StatusPageIncidentObjectSchema,
            toRow: (incident) => ({ ...incident, version }),
          });
        }),
    },
  });

export const makeStatusPageMaintenances = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "status_page_maintenances",
    rowSchema: StatusPageMaintenanceSchema,
    version: "version",
    ...listSources(
      Effect.gen(function* () {
        const version = yield* DateTime.nowAsDate;
        const pages = yield* listStatusPages(client);
        const maintenances = yield* Effect.forEach(pages, (page) =>
          listAll(client, {
            path: "/v2/status_page_maintenances",
            key: "status_page_maintenances",
            item: StatusPageMaintenanceObjectSchema,
            params: { status_page_id: page.id, page_size: "250" },
          }),
        );
        return maintenances.flat().map((maintenance) => ({ ...maintenance, version }));
      }),
    ),
  });

const readStructures = (client: IncidentIoClientService) =>
  listStatusPages(client).pipe(
    Effect.flatMap((pages) =>
      Effect.forEach(pages, (page) =>
        client.get(StatusPageStructureObjectSchema, `/v2/status_page_structures/${page.id}`).pipe(
          Effect.map(({ current_structure }) => ({
            status_page_id: page.id,
            items: current_structure.items.flatMap(({ sub_page, ...item }) => [
              { ...item, sub_page_id: null },
              ...(sub_page?.items ?? []).map((subItem) => ({
                ...subItem,
                sub_page_id: sub_page?.id,
              })),
            ]),
          })),
        ),
      ),
    ),
  );

export const makeStatusPageGroups = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "status_page_groups",
    rowSchema: StatusPageGroupSchema,
    version: "version",
    ...listSources(
      Effect.gen(function* () {
        const version = yield* DateTime.nowAsDate;
        const structures = yield* readStructures(client);
        return structures.flatMap(({ status_page_id, items }) =>
          items.flatMap(({ group, sub_page_id }) =>
            group
              ? [
                  {
                    ...Struct.omit(group, ["components"]),
                    version,
                    status_page_id,
                    sub_page_id,
                    component_ids: group.components.map((component) => component.component_id),
                  },
                ]
              : [],
          ),
        );
      }),
    ),
  });

const readAvailability = (client: IncidentIoClientService, start: DateTime.Utc) =>
  Effect.gen(function* () {
    const version = yield* DateTime.nowAsDate;
    const structures = yield* readStructures(client);
    const rows = yield* Effect.forEach(structures, ({ status_page_id, items }) => {
      const componentIds = new Set(
        items.flatMap(({ component, group }) =>
          [...(component ? [component] : []), ...(group?.components ?? [])].map(
            (item) => item.component_id,
          ),
        ),
      );
      return Effect.forEach(componentIds, (componentId) =>
        client
          .get(
            Schema.Struct({ availability: StatusPageAvailabilityObjectSchema }),
            `/v2/status_pages/${status_page_id}/components/${componentId}/availability`,
            {
              start_at: DateTime.formatIso(start),
              end_at: DateTime.formatIso(DateTime.add(start, { days: 1 })),
            },
          )
          .pipe(
            Effect.map(({ availability }) => ({
              ...availability,
              id: `${status_page_id}:${componentId}:${DateTime.formatIsoDateUtc(start)}`,
              version,
            })),
          ),
      );
    });
    return rows.flat();
  });

const startOfDay = (time: string) => DateTime.startOf(DateTime.makeUnsafe(time), "day");

// Backfill reads the last whole day before the cutoff. Changes then read each
// day once it's over.
export const makeStatusPageAvailability = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "status_page_availability",
    rowSchema: StatusPageAvailabilitySchema,
    version: "version",
    check: DateTime.now.pipe(
      Effect.flatMap((now) =>
        readAvailability(client, DateTime.subtract(DateTime.startOf(now, "day"), { days: 1 })),
      ),
      Effect.asVoid,
    ),
    backfill: Fetch.page({
      pageCursor: Cursor.string(),
      cutoff: Cursor.isoDateTime(),
      fetch: ({ cutoff }) =>
        readAvailability(client, DateTime.subtract(startOfDay(String(cutoff)), { days: 1 })).pipe(
          Effect.map((rows) => ({ rows, hasMore: false })),
        ),
    }),
    changes: Fetch.changes({
      cursor: Cursor.string(),
      interval: hourly,
      // The first cursor is the backfill cutoff.
      fetch: ({ cursor }) =>
        Effect.gen(function* () {
          const start = startOfDay(String(cursor));
          const today = DateTime.startOf(yield* DateTime.now, "day");
          if (!DateTime.isLessThan(start, today)) return { rows: [], cursor: String(cursor) };
          const end = DateTime.add(start, { days: 1 });
          return {
            rows: yield* readAvailability(client, start),
            cursor: DateTime.formatIso(end),
            hasMore: DateTime.isLessThan(end, today),
          };
        }),
    }),
  });

export const makeStatusPageIncidentLinks = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "status_page_incident_links",
    rowSchema: StatusPageIncidentLinksSchema,
    version: "version",
    ...listSources(
      Effect.gen(function* () {
        const version = yield* DateTime.nowAsDate;
        const pages = yield* listStatusPages(client);
        const links = yield* Effect.forEach(pages, (page) =>
          listAll(client, {
            path: "/v2/status_page_incidents",
            key: "status_page_incidents",
            item: Ref,
            params: { status_page_id: page.id, page_size: "250" },
          }).pipe(
            Effect.flatMap((incidents) =>
              Effect.forEach(incidents, (incident) =>
                client
                  .find(
                    Schema.Struct({ incidents: StatusPageIncidentLinksSchema.fields.incidents }),
                    `/v1/status-pages/${page.id}/incidents/${incident.id}/response-incidents`,
                  )
                  .pipe(
                    Effect.map(
                      Option.map(({ incidents }) => ({
                        id: incident.id,
                        version,
                        status_page_id: page.id,
                        incidents,
                      })),
                    ),
                  ),
              ),
            ),
          ),
        );
        return links.flat().flatMap(Option.toArray);
      }),
    ),
  });

export const makePolicies = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "policies",
    rowSchema: PolicySchema,
    version: "version",
    ...listSources(
      listAll(client, {
        path: "/v2/policies",
        key: "policies",
        item: PolicyObjectSchema,
        params: { page_size: "50" },
      }).pipe(
        Effect.map((policies) =>
          policies.map(
            ({
              assignment_rules,
              debrief,
              follow_up,
              on_call_readiness,
              post_mortem,
              schedule,
              ...policy
            }): Policy => ({
              ...policy,
              version: policy.updated_at,
              rules:
                new Map(
                  Object.entries({ debrief, follow_up, on_call_readiness, post_mortem, schedule }),
                ).get(policy.policy_type) ?? null,
              assignment_rules: assignment_rules ?? null,
            }),
          ),
        ),
      ),
    ),
  });

export const makePolicyFindings = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "policy_findings",
    rowSchema: PolicyFindingSchema,
    version: "version",
    ...listSources(
      listAll(client, {
        path: "/v2/policy_findings",
        key: "policy_findings",
        item: PolicyFindingObjectSchema,
        params: { page_size: "250" },
      }).pipe(
        Effect.map((findings) =>
          findings.map(
            ({
              responsible_users,
              dismissal,
              debrief,
              follow_up,
              on_call_readiness,
              post_mortem,
              schedule,
              shift_conflict,
              vacation_conflict,
              ...finding
            }): PolicyFinding => ({
              ...finding,
              version: finding.updated_at,
              responsible_user_ids: responsible_users.map((user) => user.id),
              details:
                new Map(
                  Object.entries({
                    debrief,
                    follow_up,
                    on_call_readiness,
                    post_mortem,
                    schedule,
                    shift_conflict,
                    vacation_conflict,
                  }),
                ).get(finding.policy_type) ?? null,
              dismissal: dismissal ?? null,
            }),
          ),
        ),
      ),
    ),
  });

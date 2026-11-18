import { describe, expect, it } from "@effect/vitest";
import { Effect, Option, Ref, Schema } from "effect";
import { TestClock } from "effect/testing";

import { demo } from "../src/demo";
import { IncidentIoConnector, manifest } from "../src/index";
import { tableSchemas } from "../src/tables";
import { examples } from "./fixtures/objects";
import {
  type FakeIncidentIo,
  connectorLayer,
  describeRequest,
  makeFakeClient,
  param,
  pick,
} from "./helpers";

const now = Date.parse("2026-10-19T12:00:00.000Z");
const cutoff = "2026-10-19T11:00:00.000Z";

type ResourceName = (typeof manifest.resources)[number]["name"];

const [incident] = examples["/v2/incidents"].incidents;

const isExample = (path: string): path is keyof typeof examples => path in examples;

/** Every list answers with its example. Show paths use the `{id}` example. */
const fromExamples: FakeIncidentIo = (request) => {
  if (request.path.endsWith("/content")) return examples["/v1/postmortem_documents/{id}/content"];
  const path = request.path.replace(/^(\/v\d\/[a-z_]+)\/[^/]+$/, (_, list) =>
    list === "/v2/status_page_incidents" ? `${list}/{status_page_incident_id}` : `${list}/{id}`,
  );
  if (path === "/v1/postmortem_documents") {
    // The spec's example has `updated_at: "abc123"`.
    const [document] = examples[path].postmortem_documents;
    return { postmortem_documents: [{ ...document, updated_at: document.created_at }] };
  }
  if (isExample(request.path)) return examples[request.path];
  return isExample(path) ? examples[path] : undefined;
};

const getConnector = (fake: FakeIncidentIo) =>
  Effect.gen(function* () {
    yield* TestClock.setTime(now);
    const { client, requests } = yield* makeFakeClient(fake);
    const connector = yield* IncidentIoConnector.IncidentIoConnector.pipe(
      Effect.provide(connectorLayer(client)),
    );
    return {
      connector,
      requests: Ref.get(requests).pipe(Effect.map((items) => items.map(describeRequest))),
    };
  });

const getResource = (name: ResourceName, fake: FakeIncidentIo) =>
  Effect.gen(function* () {
    const { connector, requests } = yield* getConnector(fake);
    const resource = yield* Effect.fromOption(
      Option.fromNullishOr(connector.resources.find((item) => item.name === name)),
    );
    return { resource, requests };
  });

describe("resources", () => {
  it.effect("matches the manifest and the table schemas", () =>
    Effect.gen(function* () {
      const { connector } = yield* getConnector(() => undefined);

      expect(connector.resources.map((item) => item.name)).toEqual(
        manifest.resources.map((item) => item.name),
      );
      expect(Object.keys(tableSchemas)).toEqual(manifest.resources.map((item) => item.name));
      const demoTables = [...demo.setup.tables, ...demo.group.tables];
      expect(demoTables.map((table) => table.name).toSorted()).toEqual(
        Object.keys(tableSchemas).toSorted(),
      );
      for (const table of demoTables) {
        const resource = connector.resources.find((item) => item.name === table.name);
        expect(table.rowSchema).toBe(resource?.rowSchema);
        expect(table.version).toBe(resource?.version);
      }
    }),
  );

  it.effect("catches up one complete availability day per poll page", () =>
    Effect.gen(function* () {
      const { resource } = yield* getResource("status_page_availability", fromExamples);
      const changes = yield* Effect.fromOption(Option.fromNullishOr(resource.changes));
      const first = yield* changes.fetch({ cursor: "2026-10-17T12:00:00.000Z" });
      const second = yield* changes.fetch({ cursor: first.cursor });
      expect(first.rows).toHaveLength(1);
      expect(first.cursor).toBe("2026-10-18T00:00:00.000Z");
      expect(first.hasMore).toBe(true);
      expect(second.rows).toHaveLength(1);
      expect(second.cursor).toBe("2026-10-19T00:00:00.000Z");
      expect(second.hasMore).toBe(false);
    }),
  );

  it.effect("maps an incident row", () =>
    Effect.gen(function* () {
      const { resource } = yield* getResource("incidents", () => ({ incidents: [incident] }));
      const backfill = yield* Effect.fromOption(Option.fromNullishOr(resource.backfill));
      const page = yield* backfill.fetch({ cutoff });

      expect(
        pick(page.rows, [
          "id",
          "status_category",
          "severity_rank",
          "creator_user_id",
          "role_assignments",
          "custom_field_values",
          "timestamps",
          "duration_metrics",
        ]),
      ).toMatchInlineSnapshot(`
        [
          {
            "creator_user_id": "01FCNDV6P870EA6S7TK1DSYDG0",
            "custom_field_values": [
              {
                "catalog_entry_id": "01FCNDV6P870EA6S7TK1DSYDG0",
                "catalog_entry_name": "Primary On-call",
                "custom_field_id": "01FCNDV6P870EA6S7TK1DSYDG0",
                "custom_field_name": "Affected Team",
                "field_type": "single_select",
                "option_id": "01FCNDV6P870EA6S7TK1DSYDG0",
                "option_value": "Product",
                "value_link": "https://google.com/",
                "value_numeric": "123.456",
                "value_text": "This is my text field, I hope you like it",
              },
            ],
            "duration_metrics": [
              {
                "metric_id": "01FCNDV6P870EA6S7TK1DSYD5H",
                "name": "Lasted",
                "status": "success",
                "value_seconds": "10800n",
              },
            ],
            "id": "01FDAG4SAP5TYPT98WGR2N7W91",
            "role_assignments": [
              {
                "assignee_id": "01FCNDV6P870EA6S7TK1DSYDG0",
                "role_id": "01FCNDV6P870EA6S7TK1DSYDG0",
                "role_name": "Incident Lead",
                "role_type": "lead",
              },
            ],
            "severity_rank": "1n",
            "status_category": "triage",
            "timestamps": [
              {
                "name": "Impact started",
                "timestamp_id": "01FCNDV6P870EA6S7TK1DSYD5H",
                "value": "2021-08-17T13:28:57.801Z",
              },
            ],
          },
        ]
      `);
    }),
  );

  it.effect("backfills incidents until `after` is missing, and drops newer ones", () =>
    Effect.gen(function* () {
      const newer = { ...incident, id: "newer", created_at: "2026-10-19T11:30:00Z" };
      const { resource, requests } = yield* getResource("incidents", (request) =>
        Option.isNone(param(request, "after"))
          ? { incidents: [newer], pagination_meta: { after: "page-2", page_size: 250 } }
          : { incidents: [incident], pagination_meta: { page_size: 250 } },
      );
      const backfill = yield* Effect.fromOption(Option.fromNullishOr(resource.backfill));
      const first = yield* backfill.fetch({ cutoff });
      const second = yield* backfill.fetch({ cutoff, pageCursor: String(first.nextPageCursor) });

      expect({
        first: { rows: first.rows.length, hasMore: first.hasMore, next: first.nextPageCursor },
        second: { rows: pick(second.rows, ["id"]), hasMore: second.hasMore },
        requests: yield* requests,
      }).toMatchInlineSnapshot(`
        {
          "first": {
            "hasMore": true,
            "next": "page-2",
            "rows": 0,
          },
          "requests": [
            "/v2/incidents page_size=250&mode[one_of]=standard&mode[one_of]=retrospective&mode[one_of]=test&mode[one_of]=tutorial",
            "/v2/incidents page_size=250&mode[one_of]=standard&mode[one_of]=retrospective&mode[one_of]=test&mode[one_of]=tutorial&after=page-2",
          ],
          "second": {
            "hasMore": false,
            "rows": [
              {
                "id": "01FDAG4SAP5TYPT98WGR2N7W91",
              },
            ],
          },
        }
      `);
    }),
  );

  it.effect("feed reads changed incidents and the lists of open ones", () =>
    Effect.gen(function* () {
      const changed = { ...incident, id: "changed", updated_at: "2026-10-19T10:58:00Z" };
      const stale = { ...incident, id: "stale", updated_at: "2026-10-19T09:00:00Z" };
      const open = { ...incident, id: "open" };
      const { connector, requests } = yield* getConnector((request) => {
        if (request.path === "/v2/incidents") {
          return Option.isSome(param(request, "updated_at[gte]"))
            ? { incidents: [changed, stale] }
            : { incidents: [open, changed] };
        }
        if (request.path === "/v2/incident_updates") {
          return {
            incident_updates: examples["/v2/incident_updates"].incident_updates.map((update) => ({
              ...update,
              incident_id: param(request, "incident_id").pipe(Option.getOrElse(() => "")),
            })),
          };
        }
        return undefined;
      });
      const feed = yield* Effect.fromOption(Option.fromNullishOr(connector.changes));
      const result = yield* feed.fetch({
        cursor: cutoff,
        selected: new Set(["incidents", "incident_updates"]),
      });

      expect({
        incidents: pick(result.rows.incidents ?? [], ["id", "version"]),
        updates: pick(result.rows.incident_updates ?? [], ["incident_id"]),
        others: result.rows.incident_timeline_items,
        cursor: result.cursor,
        requests: yield* requests,
      }).toMatchInlineSnapshot(`
        {
          "cursor": "2026-10-19T12:00:00.000Z",
          "incidents": [
            {
              "id": "changed",
              "version": "2026-10-19T10:58:00.000Z",
            },
          ],
          "others": [],
          "requests": [
            "/v2/incidents page_size=250&mode[one_of]=standard&mode[one_of]=retrospective&mode[one_of]=test&mode[one_of]=tutorial&updated_at[gte]=2026-10-19",
            "/v2/incidents page_size=250&mode[one_of]=standard&mode[one_of]=retrospective&mode[one_of]=test&mode[one_of]=tutorial&status_category[one_of]=triage&status_category[one_of]=live&status_category[one_of]=paused",
            "/v2/incident_updates incident_id=changed&page_size=250",
            "/v2/incident_updates incident_id=open&page_size=250",
          ],
          "updates": [
            {
              "incident_id": "changed",
            },
            {
              "incident_id": "open",
            },
          ],
        }
      `);
    }),
  );

  it.effect("reads the spec examples for every resource", () =>
    Effect.gen(function* () {
      const { connector } = yield* getConnector(fromExamples);
      const feed = yield* Effect.fromOption(Option.fromNullishOr(connector.changes));
      const fed = yield* feed.fetch({
        cursor: cutoff,
        selected: new Set(connector.resources.map((resource) => resource.name)),
      });
      const fedRows = new Map(Object.entries(fed.rows));
      const counts = yield* Effect.forEach(connector.resources, (resource) =>
        Effect.gen(function* () {
          yield* resource.check;
          const backfill = yield* Effect.fromOption(Option.fromNullishOr(resource.backfill));
          const page = yield* backfill.fetch({ cutoff: "2030-01-01T00:00:00.000Z" });
          const changed = resource.changes
            ? (yield* resource.changes.fetch({ cursor: cutoff })).rows
            : (fedRows.get(resource.name) ?? []);
          // Rows must match the table: no extra or missing columns.
          yield* Effect.forEach([...page.rows, ...changed], (row) =>
            Schema.encodeUnknownEffect(resource.rowSchema)(row, { onExcessProperty: "error" }),
          );
          return [resource.name, { backfill: page.rows.length, changes: changed.length }] as const;
        }),
      );

      expect(Object.fromEntries(counts)).toMatchInlineSnapshot(`
        {
          "actions": {
            "backfill": 1,
            "changes": 5,
          },
          "alert_attributes": {
            "backfill": 1,
            "changes": 1,
          },
          "alert_notes": {
            "backfill": 1,
            "changes": 1,
          },
          "alert_routes": {
            "backfill": 1,
            "changes": 1,
          },
          "alert_sources": {
            "backfill": 1,
            "changes": 1,
          },
          "alert_tags": {
            "backfill": 1,
            "changes": 1,
          },
          "alerts": {
            "backfill": 1,
            "changes": 1,
          },
          "call_routes": {
            "backfill": 1,
            "changes": 1,
          },
          "catalog_entries": {
            "backfill": 1,
            "changes": 1,
          },
          "catalog_types": {
            "backfill": 1,
            "changes": 1,
          },
          "custom_field_options": {
            "backfill": 1,
            "changes": 1,
          },
          "custom_fields": {
            "backfill": 1,
            "changes": 1,
          },
          "escalation_paths": {
            "backfill": 1,
            "changes": 1,
          },
          "escalations": {
            "backfill": 1,
            "changes": 1,
          },
          "follow_ups": {
            "backfill": 1,
            "changes": 5,
          },
          "incident_activity_log_entries": {
            "backfill": 1,
            "changes": 1,
          },
          "incident_alerts": {
            "backfill": 1,
            "changes": 1,
          },
          "incident_attachments": {
            "backfill": 1,
            "changes": 1,
          },
          "incident_call_sessions": {
            "backfill": 1,
            "changes": 1,
          },
          "incident_call_transcripts": {
            "backfill": 1,
            "changes": 1,
          },
          "incident_participant_workloads": {
            "backfill": 1,
            "changes": 1,
          },
          "incident_participants": {
            "backfill": 2,
            "changes": 2,
          },
          "incident_relationships": {
            "backfill": 1,
            "changes": 1,
          },
          "incident_roles": {
            "backfill": 1,
            "changes": 1,
          },
          "incident_statuses": {
            "backfill": 1,
            "changes": 1,
          },
          "incident_templates": {
            "backfill": 1,
            "changes": 1,
          },
          "incident_timeline_items": {
            "backfill": 1,
            "changes": 1,
          },
          "incident_timestamps": {
            "backfill": 1,
            "changes": 1,
          },
          "incident_types": {
            "backfill": 1,
            "changes": 1,
          },
          "incident_updates": {
            "backfill": 1,
            "changes": 1,
          },
          "incidents": {
            "backfill": 1,
            "changes": 0,
          },
          "maintenance_windows": {
            "backfill": 1,
            "changes": 1,
          },
          "on_call_notification_pauses": {
            "backfill": 1,
            "changes": 1,
          },
          "pay_configs": {
            "backfill": 1,
            "changes": 1,
          },
          "pay_reports": {
            "backfill": 1,
            "changes": 1,
          },
          "policies": {
            "backfill": 1,
            "changes": 1,
          },
          "policy_findings": {
            "backfill": 1,
            "changes": 1,
          },
          "postmortem_contents": {
            "backfill": 1,
            "changes": 1,
          },
          "postmortem_documents": {
            "backfill": 1,
            "changes": 1,
          },
          "schedule_overrides": {
            "backfill": 1,
            "changes": 1,
          },
          "schedule_shifts": {
            "backfill": 1,
            "changes": 1,
          },
          "schedules": {
            "backfill": 1,
            "changes": 1,
          },
          "severities": {
            "backfill": 1,
            "changes": 1,
          },
          "status_page_availability": {
            "backfill": 1,
            "changes": 0,
          },
          "status_page_components": {
            "backfill": 1,
            "changes": 1,
          },
          "status_page_groups": {
            "backfill": 2,
            "changes": 2,
          },
          "status_page_incident_links": {
            "backfill": 1,
            "changes": 1,
          },
          "status_page_incidents": {
            "backfill": 1,
            "changes": 1,
          },
          "status_page_maintenances": {
            "backfill": 1,
            "changes": 1,
          },
          "status_pages": {
            "backfill": 1,
            "changes": 1,
          },
          "teams": {
            "backfill": 1,
            "changes": 1,
          },
          "users": {
            "backfill": 1,
            "changes": 1,
          },
          "workflow_runs": {
            "backfill": 1,
            "changes": 1,
          },
          "workflows": {
            "backfill": 1,
            "changes": 1,
          },
        }
      `);
    }),
  );

  it.effect("polls follow-ups once per incident mode", () =>
    Effect.gen(function* () {
      const [followUp] = examples["/v3/follow_ups"].follow_ups;
      const { resource, requests } = yield* getResource("follow_ups", (request) => ({
        follow_ups: [followUp],
        pagination_meta:
          Option.isNone(param(request, "after")) &&
          Option.contains(param(request, "incident_mode"), "standard")
            ? { after: "page-2" }
            : {},
      }));
      const backfill = yield* Effect.fromOption(Option.fromNullishOr(resource.backfill));
      const changes = yield* Effect.fromOption(Option.fromNullishOr(resource.changes));
      const first = yield* backfill.fetch({ cutoff });
      const second = yield* backfill.fetch({ cutoff, pageCursor: first.nextPageCursor });
      const third = yield* backfill.fetch({ cutoff, pageCursor: second.nextPageCursor });
      const changed = yield* changes.fetch({ cursor: cutoff });

      expect({
        cursors: [first.nextPageCursor, second.nextPageCursor, third.nextPageCursor],
        changes: { rows: changed.rows.length, cursor: changed.cursor },
        requests: yield* requests,
      }).toMatchInlineSnapshot(`
        {
          "changes": {
            "cursor": "2026-10-19T12:00:00.000Z",
            "rows": 6,
          },
          "cursors": [
            "{"variant":0,"after":"page-2"}",
            "{"variant":1}",
            "{"variant":2}",
          ],
          "requests": [
            "/v3/follow_ups page_size=250&incident_mode=standard&created_at[lte]=2026-10-19T11:00:00.000Z",
            "/v3/follow_ups page_size=250&incident_mode=standard&created_at[lte]=2026-10-19T11:00:00.000Z&after=page-2",
            "/v3/follow_ups page_size=250&incident_mode=retrospective&created_at[lte]=2026-10-19T11:00:00.000Z",
            "/v3/follow_ups page_size=250&incident_mode=standard&updated_at[gte]=2026-10-19T10:55:00.000Z",
            "/v3/follow_ups page_size=250&incident_mode=standard&updated_at[gte]=2026-10-19T10:55:00.000Z&after=page-2",
            "/v3/follow_ups page_size=250&incident_mode=retrospective&updated_at[gte]=2026-10-19T10:55:00.000Z",
            "/v3/follow_ups page_size=250&incident_mode=test&updated_at[gte]=2026-10-19T10:55:00.000Z",
            "/v3/follow_ups page_size=250&incident_mode=tutorial&updated_at[gte]=2026-10-19T10:55:00.000Z",
            "/v3/follow_ups page_size=250&incident_mode=stream&updated_at[gte]=2026-10-19T10:55:00.000Z",
          ],
        }
      `);
    }),
  );

  it.effect("keeps only shifts that have ended", () =>
    Effect.gen(function* () {
      const [schedule] = examples["/v2/schedules"].schedules;
      const [entry] = examples["/v2/schedule_entries"].schedule_entries.final;
      const { resource, requests } = yield* getResource("schedule_shifts", (request) =>
        request.path === "/v2/schedules"
          ? { schedules: [{ ...schedule, created_at: "2026-10-12T12:00:00.000Z" }] }
          : {
              schedule_entries: {
                scheduled: [],
                overrides: [],
                // Two layers can share a start time. Only the fingerprint tells them apart.
                final: [
                  {
                    ...entry,
                    fingerprint: "shift-a",
                    start_at: "2026-10-19T08:00:00Z",
                    end_at: "2026-10-19T10:00:00Z",
                  },
                  {
                    ...entry,
                    fingerprint: "shift-b",
                    start_at: "2026-10-19T08:00:00Z",
                    end_at: "2026-10-19T11:00:00Z",
                  },
                  {
                    ...entry,
                    fingerprint: "shift-c",
                    start_at: "2026-10-19T11:00:00Z",
                    end_at: "2026-10-19T14:00:00Z",
                  },
                ],
              },
            },
      );
      const backfill = yield* Effect.fromOption(Option.fromNullishOr(resource.backfill));
      const page = yield* backfill.fetch({ cutoff: new Date(now).toISOString() });

      expect({
        rows: pick(page.rows, ["id", "start_at", "end_at"]),
        requests: yield* requests,
      }).toMatchInlineSnapshot(`
        {
          "requests": [
            "/v2/schedules page_size=250",
            "/v2/schedule_entries schedule_id=01G0J1EXE7AXZ2C93K61WBPYEH&entry_window_start=2026-10-12T12:00:00.000Z&entry_window_end=2026-10-19T12:00:00.000Z",
          ],
          "rows": [
            {
              "end_at": "2026-10-19T10:00:00.000Z",
              "id": "01G0J1EXE7AXZ2C93K61WBPYEH:shift-a",
              "start_at": "2026-10-19T08:00:00.000Z",
            },
            {
              "end_at": "2026-10-19T11:00:00.000Z",
              "id": "01G0J1EXE7AXZ2C93K61WBPYEH:shift-b",
              "start_at": "2026-10-19T08:00:00.000Z",
            },
          ],
        }
      `);
    }),
  );

  it.effect("filters escalations by date only, and drops newer ones", () =>
    Effect.gen(function* () {
      const [escalation] = examples["/v2/escalations"].escalations;
      const { resource, requests } = yield* getResource("escalations", () => ({
        escalations: [
          { ...escalation, id: "older", created_at: "2026-10-19T10:00:00Z" },
          { ...escalation, id: "newer", created_at: "2026-10-19T11:30:00Z" },
        ],
      }));
      const backfill = yield* Effect.fromOption(Option.fromNullishOr(resource.backfill));
      const changes = yield* Effect.fromOption(Option.fromNullishOr(resource.changes));
      const page = yield* backfill.fetch({ cutoff });
      yield* changes.fetch({ cursor: cutoff });

      expect({ rows: pick(page.rows, ["id"]), requests: yield* requests }).toMatchInlineSnapshot(`
        {
          "requests": [
            "/v2/escalations page_size=50&created_at[lte]=2026-10-20",
            "/v2/escalations page_size=50&updated_at[gte]=2026-10-19",
          ],
          "rows": [
            {
              "id": "older",
            },
          ],
        }
      `);
    }),
  );
});

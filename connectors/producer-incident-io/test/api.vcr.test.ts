import { NodeServices } from "@effect/platform-node";
import { describe, expect, it } from "@effect/vitest";
import { ConnectorApp, type ConnectorError } from "@useairfoil/connector-kit";
import { FileSystemCassetteStore, VcrHttpClient } from "@useairfoil/effect-vcr";
import { ConfigProvider, Effect, Layer, Option, Schema } from "effect";
import { FetchHttpClient } from "effect/http";
import { existsSync } from "node:fs";

import type { WebhookTarget } from "../src/schemas/shared";

import { IncidentIoClient, IncidentIoConnector } from "../src/index";
import { makeIncidents } from "../src/resources/incidents";
import { makeAlerts, makeEscalations } from "../src/resources/on-call";

// Needs a cassette, or a key to record one. See the README.
const canRun =
  existsSync(new URL("./__cassettes__/api.vcr.test.cassette", import.meta.url)) ||
  process.env.INCIDENT_IO_API_KEY !== undefined;

const configLayer = ConfigProvider.layer(
  ConfigProvider.fromEnv().pipe(
    ConfigProvider.orElse(
      ConfigProvider.fromUnknown({
        INCIDENT_IO_API_KEY: "inc_placeholder",
        INCIDENT_IO_WEBHOOK_SECRET: "whsec_cGxhY2Vob2xkZXI=",
      }),
    ),
  ),
);

const config = IncidentIoConnector.IncidentIoConfigDef.config;

// Keeps the client, so webhooks can be called on their own below.
const connectorLayer = Layer.effect(IncidentIoConnector.IncidentIoConnector)(
  config.pipe(Effect.flatMap(IncidentIoConnector.make)),
).pipe(
  Layer.provideMerge(IncidentIoClient.layerConfig(config)),
  Layer.provide(
    VcrHttpClient.layer({ vcrName: "producer-incident-io" }).pipe(
      Layer.provide(FileSystemCassetteStore.layer()),
      Layer.provide(Layer.merge(NodeServices.layer, FetchHttpClient.layer)),
    ),
  ),
  Layer.provide(configLayer),
);

// Recorded against a real organization. Set these near the recording time.
const cutoff = "2026-10-19T08:00:00.000Z";
const since = "2026-10-12T08:00:00.000Z";
// Keeps the cassette small. Thousands of escalations would make it 15 MB.
const maxPages = 3;

// Rows must match the table: no extra or missing columns.
const encodeRows = <S extends Schema.Top>(schema: S, rows: ReadonlyArray<object>) =>
  Effect.forEach(rows, (row) =>
    Schema.encodeUnknownEffect(schema)(row, { onExcessProperty: "error" }),
  );

describe.skipIf(!canRun)("incident.io API (vcr)", () => {
  it.live(
    "checks, backfills, and reads changes for every resource",
    () =>
      Effect.gen(function* () {
        const built = Layer.succeedContext(yield* Layer.build(connectorLayer));
        const connector = yield* IncidentIoConnector.IncidentIoConnector.pipe(
          Effect.provide(built),
        );
        const recordedResources = connector.resources.filter(
          ({ name }) =>
            ![
              "alert_tags",
              "postmortem_contents",
              "call_routes",
              "incident_templates",
              "pay_configs",
              "pay_reports",
              "incident_call_transcripts",
              "status_page_groups",
              "status_page_availability",
              "status_page_incident_links",
            ].includes(name),
        );
        const check = yield* ConnectorApp.check(IncidentIoConnector.IncidentIoConnector, built, {
          resources: recordedResources.map((resource) => resource.name),
        });
        // A resource without its role fails its check, and doesn't run.
        const failedChecks = Object.entries(check).flatMap(([name, result]) =>
          result._tag === "ok" ? [] : [name],
        );
        const resources = recordedResources.filter(
          (resource) => !failedChecks.includes(resource.name),
        );
        const feed = yield* Effect.fromOption(Option.fromNullishOr(connector.changes));
        const fed = yield* feed.fetch({
          cursor: since,
          selected: new Set(resources.map((resource) => resource.name)),
        });

        const fedRows = new Map(Object.entries(fed.rows));
        const results: Record<string, string> = {};
        const firstIds = new Map<string, string>();
        for (const resource of resources) {
          const backfill = yield* Effect.fromOption(Option.fromNullishOr(resource.backfill));
          let rows = 0;
          let pageCursor: string | undefined;
          for (let pages = 1; pages <= maxPages; pages++) {
            const page = yield* backfill.fetch({ cutoff, ...(pageCursor ? { pageCursor } : {}) });
            rows += page.rows.length;
            yield* encodeRows(resource.rowSchema, page.rows);
            const [first] = page.rows;
            if (first !== undefined && "id" in first && typeof first.id === "string") {
              if (!firstIds.has(resource.name)) firstIds.set(resource.name, first.id);
            }
            if (!page.hasMore) break;
            pageCursor = String(page.nextPageCursor);
          }
          const changed = resource.changes
            ? (yield* resource.changes.fetch({ cursor: since })).rows
            : (fedRows.get(resource.name) ?? []);
          yield* encodeRows(resource.rowSchema, changed);
          results[resource.name] = `${rows} backfilled, ${changed.length} changed`;
        }

        // Webhooks read records again with the show endpoints.
        const client = yield* IncidentIoClient.IncidentIoClient.pipe(Effect.provide(built));
        const [Incidents, IncidentUpdates] = makeIncidents(client).resources;
        const reread = (
          webhook:
            | {
                readonly handler: (input: {
                  readonly payload: WebhookTarget;
                }) => Effect.Effect<ReadonlyArray<object>, ConnectorError>;
              }
            | undefined,
          id: string | undefined,
        ) =>
          Effect.fromOption(Option.fromNullishOr(webhook)).pipe(
            Effect.flatMap((handler) =>
              handler.handler({ payload: { event: "test", id: id ?? "", time: new Date(cutoff) } }),
            ),
            Effect.map((rows) => rows.length),
          );
        const webhooks = {
          incident: yield* reread(Incidents.webhook, firstIds.get("incidents")),
          missingIncident: yield* reread(Incidents.webhook, "01HZZZZZZZZZZZZZZZZZZZZZZZ"),
          incidentUpdates: yield* reread(IncidentUpdates.webhook, firstIds.get("incidents")),
          alert: yield* reread(makeAlerts(client).webhook, firstIds.get("alerts")),
          escalation: yield* reread(makeEscalations(client).webhook, firstIds.get("escalations")),
        };

        expect({ failedChecks, results, webhooks }).toMatchInlineSnapshot(`
          {
            "failedChecks": [
              "incident_call_sessions",
              "maintenance_windows",
            ],
            "results": {
              "actions": "0 backfilled, 0 changed",
              "alert_attributes": "8 backfilled, 8 changed",
              "alert_notes": "0 backfilled, 0 changed",
              "alert_routes": "3 backfilled, 3 changed",
              "alert_sources": "4 backfilled, 4 changed",
              "alerts": "150 backfilled, 1 changed",
              "catalog_entries": "191 backfilled, 191 changed",
              "catalog_types": "19 backfilled, 19 changed",
              "custom_field_options": "0 backfilled, 0 changed",
              "custom_fields": "2 backfilled, 2 changed",
              "escalation_paths": "2 backfilled, 2 changed",
              "escalations": "150 backfilled, 0 changed",
              "follow_ups": "0 backfilled, 0 changed",
              "incident_activity_log_entries": "413 backfilled, 9 changed",
              "incident_alerts": "232 backfilled, 5 changed",
              "incident_attachments": "0 backfilled, 0 changed",
              "incident_participant_workloads": "64 backfilled, 3 changed",
              "incident_participants": "66 backfilled, 2 changed",
              "incident_relationships": "0 backfilled, 0 changed",
              "incident_roles": "2 backfilled, 2 changed",
              "incident_statuses": "11 backfilled, 11 changed",
              "incident_timeline_items": "217 backfilled, 6 changed",
              "incident_timestamps": "12 backfilled, 12 changed",
              "incident_types": "1 backfilled, 1 changed",
              "incident_updates": "210 backfilled, 6 changed",
              "incidents": "68 backfilled, 1 changed",
              "on_call_notification_pauses": "0 backfilled, 0 changed",
              "policies": "1 backfilled, 1 changed",
              "policy_findings": "0 backfilled, 0 changed",
              "postmortem_documents": "0 backfilled, 0 changed",
              "schedule_overrides": "0 backfilled, 0 changed",
              "schedule_shifts": "0 backfilled, 0 changed",
              "schedules": "0 backfilled, 0 changed",
              "severities": "3 backfilled, 3 changed",
              "status_page_components": "7 backfilled, 7 changed",
              "status_page_incidents": "0 backfilled, 0 changed",
              "status_page_maintenances": "0 backfilled, 0 changed",
              "status_pages": "1 backfilled, 1 changed",
              "teams": "4 backfilled, 4 changed",
              "users": "3 backfilled, 3 changed",
              "workflow_runs": "0 backfilled, 0 changed",
              "workflows": "0 backfilled, 0 changed",
            },
            "webhooks": {
              "alert": 1,
              "escalation": 1,
              "incident": 1,
              "incidentUpdates": 1,
              "missingIncident": 0,
            },
          }
        `);
      }),
    { timeout: 600_000 },
  );
});

import { NodeHttpServer } from "@effect/platform-node";
import { describe, expect, it } from "@effect/vitest";
import { Ingestion, StateStore } from "@useairfoil/connector-kit";
import { DateTime, Deferred, Effect, Layer, Option, Ref, Result } from "effect";
import { HttpClient, HttpClientRequest, HttpServerRequest } from "effect/http";
import { TestClock } from "effect/testing";

import { IncidentIoConnector, webhookPath } from "../src/index";
import { readEventId } from "../src/webhook/route";
import { webhookEvents } from "./fixtures/events";
import { examples } from "./fixtures/objects";
import {
  type FakeRequest,
  connectorLayer,
  makeFakeClient,
  makeTestIngestor,
  param,
  pick,
  signedHeaders,
} from "./helpers";

const now = Date.parse("2026-10-19T12:00:00.000Z");
const incidentId = examples["/v2/incidents/{id}"].incident.id;

// Backfills see empty lists. Webhooks read the example incident and its lists.
const emptyLists = Object.fromEntries(
  Object.entries(examples).flatMap(([, body]) =>
    Object.keys(body).map((key) => [key, []] as const),
  ),
);

const isExample = (path: string): path is keyof typeof examples => path in examples;

const fake = (request: FakeRequest): unknown => {
  // Show paths answer with their example, except for the `missing` ID.
  const show = /^(\/v\d\/[a-z_]+)\/([^/]+)$/.exec(request.path);
  if (show !== null) {
    const path = `${show[1]}/{id}`;
    return show[2] !== "missing" && isExample(path) ? examples[path] : undefined;
  }
  const forIncident = param(request, "incident_id");
  if (Option.isSome(forIncident)) {
    return forIncident.value === incidentId && isExample(request.path)
      ? examples[request.path]
      : undefined;
  }
  if (request.path === "/v2/schedule_entries") return examples[request.path];
  return emptyLists;
};

/** Waits for the expected ingests before reading webhook rows. */
const post = (
  event: string,
  body: unknown,
  options: { readonly headers?: Record<string, string>; readonly expected?: number } = {},
) =>
  Effect.gen(function* () {
    yield* TestClock.setTime(now);
    const { client } = yield* makeFakeClient(fake);
    const connector = yield* IncidentIoConnector.IncidentIoConnector.pipe(
      Effect.provide(connectorLayer(client)),
    );
    const expected = options.expected ?? 0;
    const { ingestedRef, done, layer } = yield* makeTestIngestor(expected);
    const cutoff = yield* DateTime.now.pipe(Effect.map(DateTime.formatIso));

    return yield* Effect.gen(function* () {
      yield* Effect.forkScoped(
        Ingestion.run(connector, {
          initialCutoff: cutoff,
          webhook: { routes: connector.webhooks ?? [] },
        }),
      );

      const rawBody = JSON.stringify({ event_type: event, [event]: body });
      const http = yield* HttpClient.HttpClient;
      const response = yield* http.execute(
        HttpClientRequest.post(webhookPath).pipe(
          HttpClientRequest.setHeaders(options.headers ?? signedHeaders(rawBody)),
          HttpClientRequest.bodyText(rawBody, "application/json"),
        ),
      );
      if (expected > 0) yield* Deferred.await(done);

      const ingested = (yield* Ref.get(ingestedRef)).filter((item) => item.source === "webhook");
      return {
        status: response.status,
        rows: pick(
          ingested.flatMap((item) =>
            item.batch.rows.map((row) => ({ resource: item.resource, ...row })),
          ),
          ["resource", "id", "_deleted"],
        ),
      };
    }).pipe(
      Effect.provide(Layer.mergeAll(StateStore.layerMemory, layer, NodeHttpServer.layerTest)),
    );
  }).pipe(Effect.scoped);

describe("webhook", () => {
  it.live("requires an event body and record ID before confirming verification", () =>
    Effect.gen(function* () {
      const { client } = yield* makeFakeClient(fake);
      const connector = yield* IncidentIoConnector.IncidentIoConnector.pipe(
        Effect.provide(connectorLayer(client)),
      );
      const verify = connector.webhooks?.[0]?.verify;
      if (verify === undefined) throw new Error("Webhook verification is missing");

      const accepts = (payload: Readonly<Record<string, unknown>>) => {
        const body = JSON.stringify(payload);
        return verify({
          request: HttpServerRequest.fromWeb(
            new Request(`https://hooks.example.test${webhookPath}`, {
              method: "POST",
              headers: signedHeaders(body),
            }),
          ),
          rawBody: new TextEncoder().encode(body),
          payload,
        });
      };

      const event = "private_incident.incident_updated_v2";
      expect(Result.isFailure(yield* accepts({ event_type: event }).pipe(Effect.result))).toBe(
        true,
      );
      expect(
        Result.isFailure(yield* accepts({ event_type: event, [event]: {} }).pipe(Effect.result)),
      ).toBe(true);
      expect(yield* accepts({ event_type: event, [event]: { id: incidentId } })).toBe(true);
      expect(yield* accepts({ event_type: "unknown.event" })).toBe(false);
    }),
  );

  it.effect("reads an incident and its lists again, for public and private events", () =>
    Effect.gen(function* () {
      expect({
        public: yield* post(
          "public_incident.incident_status_updated_v2",
          { incident: examples["/v2/incidents/{id}"].incident },
          { expected: 8 },
        ),
        private: yield* post(
          "private_incident.incident_updated_v2",
          { id: incidentId },
          { expected: 8 },
        ),
      }).toMatchInlineSnapshot(`
        {
          "private": {
            "rows": [
              {
                "id": "01FDAG4SAP5TYPT98WGR2N7W91",
                "resource": "incidents",
              },
              {
                "id": "01FCNDV6P870EA6S7TK1DSYDG0",
                "resource": "incident_updates",
              },
              {
                "id": "01FCNDV6P870EA6S7TK1DSYDG0",
                "resource": "incident_timeline_items",
              },
              {
                "id": "01FCNDV6P870EA6S7TK1DSYDG0",
                "resource": "incident_activity_log_entries",
              },
              {
                "id": "01FDAG4SAP5TYPT98WGR2N7W91:01FCNDV6P870EA6S7TK1DSYDG0",
                "resource": "incident_participants",
              },
              {
                "id": "01FDAG4SAP5TYPT98WGR2N7W91:01FCNDV6P870EA6S7TK1DSYDG0",
                "resource": "incident_participants",
              },
              {
                "id": "01FDAG4SAP5TYPT98WGR2N7W91:01FCNDV6P870EA6S7TK1DSYD5H",
                "resource": "incident_relationships",
              },
              {
                "id": "01FCNDV6P870EA6S7TK1DSYD5H",
                "resource": "incident_attachments",
              },
              {
                "id": "01GW2G3V0S59R238FAHPDS1R66",
                "resource": "incident_alerts",
              },
            ],
            "status": 200,
          },
          "public": {
            "rows": [
              {
                "id": "01FDAG4SAP5TYPT98WGR2N7W91",
                "resource": "incidents",
              },
              {
                "id": "01FCNDV6P870EA6S7TK1DSYDG0",
                "resource": "incident_updates",
              },
              {
                "id": "01FCNDV6P870EA6S7TK1DSYDG0",
                "resource": "incident_timeline_items",
              },
              {
                "id": "01FCNDV6P870EA6S7TK1DSYDG0",
                "resource": "incident_activity_log_entries",
              },
              {
                "id": "01FDAG4SAP5TYPT98WGR2N7W91:01FCNDV6P870EA6S7TK1DSYDG0",
                "resource": "incident_participants",
              },
              {
                "id": "01FDAG4SAP5TYPT98WGR2N7W91:01FCNDV6P870EA6S7TK1DSYDG0",
                "resource": "incident_participants",
              },
              {
                "id": "01FDAG4SAP5TYPT98WGR2N7W91:01FCNDV6P870EA6S7TK1DSYD5H",
                "resource": "incident_relationships",
              },
              {
                "id": "01FCNDV6P870EA6S7TK1DSYD5H",
                "resource": "incident_attachments",
              },
              {
                "id": "01GW2G3V0S59R238FAHPDS1R66",
                "resource": "incident_alerts",
              },
            ],
            "status": 200,
          },
        }
      `);
    }),
  );

  it.effect("skips incidents it can't read, unknown events, and bad signatures", () =>
    Effect.gen(function* () {
      expect({
        missing: yield* post("private_incident.incident_updated_v2", { id: "missing" }),
        unknown: yield* post("private_incident.membership_granted_v1", { id: incidentId }),
        newEventType: yield* post("public_incident.something_new_v9", "not an object"),
        badSignature: yield* post(
          "private_incident.incident_updated_v2",
          { id: incidentId },
          { headers: signedHeaders("{}") },
        ),
      }).toMatchInlineSnapshot(`
        {
          "badSignature": {
            "rows": [],
            "status": 401,
          },
          "missing": {
            "rows": [],
            "status": 200,
          },
          "newEventType": {
            "rows": [],
            "status": 200,
          },
          "unknown": {
            "rows": [],
            "status": 200,
          },
        }
      `);
    }),
  );

  it.effect("reads follow-ups and shifts again, and deletes schedules", () =>
    Effect.gen(function* () {
      expect({
        followUp: yield* post(
          "private_incident.follow_up_updated_v2",
          { id: "01FCNDV6P870EA6S7TK1DSYDG0" },
          { expected: 1 },
        ),
        shiftChange: yield* post(
          "schedule.shift_change_v1",
          { schedule: { id: "01G0J1EXE7AXZ2C93K61WBPYEH" } },
          { expected: 1 },
        ),
        deletedSchedule: yield* post(
          "schedule.deleted_v1",
          { id: "01G0J1EXE7AXZ2C93K61WBPYEH" },
          { expected: 1 },
        ),
      }).toMatchInlineSnapshot(`
        {
          "deletedSchedule": {
            "rows": [
              {
                "_deleted": true,
                "id": "01G0J1EXE7AXZ2C93K61WBPYEH",
                "resource": "schedules",
              },
            ],
            "status": 200,
          },
          "followUp": {
            "rows": [
              {
                "id": "01FCNDV6P870EA6S7TK1DSYDG0",
                "resource": "follow_ups",
              },
            ],
            "status": 200,
          },
          "shiftChange": {
            "rows": [
              {
                "id": "01G0J1EXE7AXZ2C93K61WBPYEH:01G0J1EXE7AXZ2C93K61WBPYEH",
                "resource": "schedule_shifts",
              },
            ],
            "status": 200,
          },
        }
      `);
    }),
  );
  it.effect("finds the record ID in every documented event", () =>
    Effect.gen(function* () {
      const ids = yield* Effect.forEach(webhookEvents, (payload) =>
        readEventId(payload, payload.event_type).pipe(
          Effect.map((id) => [payload.event_type, Option.getOrElse(id, () => "none")] as const),
        ),
      );

      expect(Object.fromEntries(ids)).toMatchInlineSnapshot(`
        {
          "private_alert.alert_created_v1": "abc123",
          "private_alert.alert_resolved_v1": "abc123",
          "private_escalation.escalation_created_v1": "abc123",
          "private_escalation.escalation_status_updated_v1": "abc123",
          "private_incident.action_created_v1": "abc123",
          "private_incident.action_updated_v1": "abc123",
          "private_incident.follow_up_created_v1": "abc123",
          "private_incident.follow_up_created_v2": "abc123",
          "private_incident.follow_up_updated_v1": "abc123",
          "private_incident.follow_up_updated_v2": "abc123",
          "private_incident.incident_created_v2": "abc123",
          "private_incident.incident_updated_v2": "abc123",
          "private_incident.membership_granted_v1": "none",
          "private_incident.membership_revoked_v1": "none",
          "private_incident.postmortem_document_status_updated_v1": "abc123",
          "public_alert.alert_created_v1": "01GW2G3V0S59R238FAHPDS1R66",
          "public_alert.alert_resolved_v1": "01GW2G3V0S59R238FAHPDS1R66",
          "public_escalation.escalation_created_v1": "01G0J1EXE7AXZ2C93K61WBPYEH",
          "public_escalation.escalation_status_updated_v1": "01G0J1EXE7AXZ2C93K61WBPYEH",
          "public_incident.action_created_v1": "01FCNDV6P870EA6S7TK1DSYDG0",
          "public_incident.action_updated_v1": "01FCNDV6P870EA6S7TK1DSYDG0",
          "public_incident.follow_up_created_v1": "01FCNDV6P870EA6S7TK1DSYDG0",
          "public_incident.follow_up_created_v2": "01FCNDV6P870EA6S7TK1DSYDG0",
          "public_incident.follow_up_updated_v1": "01FCNDV6P870EA6S7TK1DSYDG0",
          "public_incident.follow_up_updated_v2": "01FCNDV6P870EA6S7TK1DSYDG0",
          "public_incident.incident_created_v2": "01FDAG4SAP5TYPT98WGR2N7W91",
          "public_incident.incident_status_updated_v2": "01FDAG4SAP5TYPT98WGR2N7W91",
          "public_incident.incident_updated_v2": "01FDAG4SAP5TYPT98WGR2N7W91",
          "public_incident.postmortem_document_status_updated_v1": "01GDZEW57FDA1K4S63MGMQ5DS9",
          "schedule.created_v1": "01G0J1EXE7AXZ2C93K61WBPYEH",
          "schedule.deleted_v1": "01G0J1EXE7AXZ2C93K61WBPYEH",
          "schedule.shift_change_v1": "01G0J1EXE7AXZ2C93K61WBPYEH",
          "schedule.updated_v1": "01G0J1EXE7AXZ2C93K61WBPYEH",
          "status_page_incident.update_shared_v1": "01FCNDV6P870EA6S7TK1DSYDG0",
        }
      `);
    }),
  );
});

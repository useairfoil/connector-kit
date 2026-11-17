import { describe, expect, it } from "@effect/vitest";
import { Demo, Ingestor } from "@useairfoil/connector-kit";
import { Effect, Layer, Ref, Schema } from "effect";

import { demo } from "../src/demo";

const now = new Date("2026-10-01T00:00:00.000Z");

// Only group rows count toward the size, so 1 byte writes the setup tables and one chunk.
const groupTables = new Set<string>(demo.group.tables.map((table) => table.name));

const generate = Effect.gen(function* () {
  const written = yield* Ref.make<ReadonlyArray<Ingestor.IngestOptions>>([]);

  const layer = Layer.succeed(Ingestor.Ingestor)({
    ingest: (options) =>
      Ref.update(written, (all) => [...all, options]).pipe(
        Effect.as({
          rows: options.batch.rows.length,
          bytes: groupTables.has(options.resource) ? options.batch.rows.length : 0,
        }),
      ),
  });

  yield* Demo.run(demo, { bytes: 1, seed: 42, now, groupsPerChunk: 40 }).pipe(
    Effect.provide(layer),
  );

  return yield* Ref.get(written);
});

const Row = Schema.Record(Schema.String, Schema.Unknown);
const isList = Schema.is(Schema.Array(Schema.Unknown));

const tablesOf = (written: ReadonlyArray<Ingestor.IngestOptions>) => {
  const tables = new Map<string, Array<Schema.Schema.Type<typeof Row>>>();

  for (const { resource, batch } of written) {
    const rows = tables.get(resource) ?? [];
    rows.push(...batch.rows.map((row) => Schema.decodeUnknownSync(Row)(row)));
    tables.set(resource, rows);
  }

  return tables;
};

// [table, field, table the field points to]
const references = [
  ["tickets", "requester_id", "users"],
  ["tickets", "assignee_id", "users"],
  ["tickets", "organization_id", "organizations"],
  ["tickets", "group_id", "groups"],
  ["tickets", "brand_id", "brands"],
  ["tickets", "ticket_form_id", "ticket_forms"],
  ["tickets", "custom_status_id", "custom_statuses"],
  ["ticket_comments", "ticket_id", "tickets"],
  ["ticket_comments", "author_id", "users"],
  ["ticket_field_history", "ticket_id", "tickets"],
  ["ticket_metric_events", "ticket_id", "tickets"],
  ["satisfaction_ratings", "ticket_id", "tickets"],
  ["satisfaction_ratings", "requester_id", "users"],
  ["survey_responses", "ticket_id", "tickets"],
  ["survey_responses", "responder_id", "users"],
  ["survey_responses", "survey_id", "csat_surveys"],
  ["group_memberships", "user_id", "users"],
  ["group_memberships", "group_id", "groups"],
  ["organization_memberships", "user_id", "users"],
  ["organization_memberships", "organization_id", "organizations"],
  ["users", "organization_id", "organizations"],
  ["users", "default_group_id", "groups"],
  ["organizations", "group_id", "groups"],
  ["sections", "category_id", "categories"],
  ["articles", "section_id", "sections"],
  ["articles", "author_id", "users"],
  ["community_posts", "topic_id", "community_topics"],
  ["community_posts", "author_id", "users"],
  ["talk_lines", "brand_id", "brands"],
  ["talk_lines", "default_group_id", "groups"],
] as const;

describe("Zendesk demo", () => {
  it.effect("writes every table with unique keys and links that resolve", () =>
    Effect.gen(function* () {
      const tables = tablesOf(yield* generate);
      const names = [...demo.setup.tables, ...demo.group.tables].map((table) => table.name);

      for (const name of names) {
        const keys = (tables.get(name) ?? []).map((row) => row.id ?? row.key);
        expect(keys.length, name).toBeGreaterThan(0);
        expect(new Set(keys).size, name).toBe(keys.length);
      }

      const missing = references.flatMap(([from, field, to]) => {
        const ids = new Set((tables.get(to) ?? []).map((row) => row.id));

        return (tables.get(from) ?? []).flatMap((row) => {
          const value = row[field];

          // Some fields hold a list of IDs.
          return (isList(value) ? value : [value])
            .filter((id) => id !== null && !ids.has(id))
            .map((id) => `${from}.${field} = ${String(id)}`);
        });
      });

      expect(missing).toEqual([]);

      expect(tables.get("tickets")?.[0]).toMatchInlineSnapshot(`
        {
          "_deleted": false,
          "assignee_id": 360000200000n,
          "brand_id": 360000000001n,
          "created_at": 2026-09-24T15:19:21.451Z,
          "custom_fields": Map {
            "360000500010" => "mobile",
            "360000500011" => "pro",
          },
          "custom_status_id": 2n,
          "description": "Hi, can't upload photos from ios. Can you take a look?",
          "due_at": null,
          "external_id": null,
          "group_id": 360000100000n,
          "id": 1000n,
          "is_public": true,
          "metrics": {
            "agent_wait_time_in_minutes": {
              "business": 0n,
              "calendar": 0n,
            },
            "assigned_at": 2026-09-24T19:45:23.024Z,
            "assignee_stations": 1n,
            "first_resolution_time_in_minutes": {
              "business": null,
              "calendar": null,
            },
            "full_resolution_time_in_minutes": {
              "business": null,
              "calendar": null,
            },
            "group_stations": 1n,
            "initially_assigned_at": 2026-09-24T19:45:23.024Z,
            "latest_comment_added_at": 2026-09-24T19:45:23.024Z,
            "on_hold_time_in_minutes": {
              "business": 0n,
              "calendar": 0n,
            },
            "reopens": 0n,
            "replies": 1n,
            "reply_time_in_minutes": {
              "business": 88n,
              "calendar": 266n,
            },
            "requester_wait_time_in_minutes": {
              "business": 88n,
              "calendar": 266n,
            },
            "solved_at": null,
            "status_updated_at": 2026-09-24T19:45:23.024Z,
          },
          "organization_id": null,
          "priority": "normal",
          "problem_id": null,
          "requester_id": 380000000000n,
          "satisfaction_rating": {
            "score": "unoffered",
          },
          "status": "open",
          "subject": "Can't upload photos from iOS",
          "submitter_id": 380000000000n,
          "tags": [
            "mobile",
            "pro",
          ],
          "ticket_form_id": 360000400000n,
          "type": "problem",
          "updated_at": 2026-09-24T19:45:23.024Z,
          "version": 2026-09-24T19:45:23.024Z,
          "via": {
            "channel": "api",
          },
        }
      `);
    }),
  );
});

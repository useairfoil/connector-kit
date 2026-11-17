import { describe, expect, it } from "@effect/vitest";
import { Demo, Ingestor } from "@useairfoil/connector-kit";
import { Effect, Layer, Ref, Schema } from "effect";

import { demo } from "../src/demo";
import { IssueSchema } from "../src/schemas/issues";
import { CycleSchema } from "../src/schemas/teams";

const now = new Date("2026-10-01T00:00:00.000Z");

// Only group rows count toward the size, so 1 byte writes the setup tables and one chunk.
const groupTables = new Set<string>(demo.group.tables.map((table) => table.name));

const generate = (resourceNames?: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const written = yield* Ref.make<ReadonlyArray<Ingestor.IngestOptions>>([]);

    const layer = Layer.succeed(Ingestor.Ingestor)({
      resourceNames,
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
  ["issues", "team_id", "teams"],
  ["issues", "state_id", "workflow_states"],
  ["issues", "creator_id", "users"],
  ["issues", "assignee_id", "users"],
  ["issues", "project_id", "projects"],
  ["issues", "project_milestone_id", "project_milestones"],
  ["issues", "cycle_id", "cycles"],
  ["issue_history", "issue_id", "issues"],
  ["issue_history", "actor_id", "users"],
  ["issue_history", "to_state_id", "workflow_states"],
  ["comments", "issue_id", "issues"],
  ["comments", "user_id", "users"],
  ["issue_relations", "issue_id", "issues"],
  ["issue_relations", "related_issue_id", "issues"],
  ["attachments", "issue_id", "issues"],
  ["customer_needs", "customer_id", "customers"],
  ["customer_needs", "issue_id", "issues"],
  ["issue_to_releases", "issue_id", "issues"],
  ["issue_to_releases", "release_id", "releases"],
  ["workflow_states", "team_id", "teams"],
  ["team_memberships", "team_id", "teams"],
  ["team_memberships", "user_id", "users"],
  ["cycles", "team_id", "teams"],
  ["projects", "status_id", "project_statuses"],
  ["projects", "lead_id", "users"],
  ["project_milestones", "project_id", "projects"],
  ["project_updates", "project_id", "projects"],
  ["project_relations", "related_project_id", "projects"],
  ["documents", "project_id", "projects"],
  ["initiative_updates", "initiative_id", "initiatives"],
  ["initiative_to_projects", "initiative_id", "initiatives"],
  ["initiative_to_projects", "project_id", "projects"],
  ["customers", "status_id", "customer_statuses"],
  ["customers", "tier_id", "customer_tiers"],
  ["releases", "pipeline_id", "release_pipelines"],
  ["releases", "stage_id", "release_stages"],
  ["release_stages", "pipeline_id", "release_pipelines"],
] as const;

describe("Linear demo", () => {
  it.effect("writes every table with unique keys and links that resolve", () =>
    Effect.gen(function* () {
      const tables = tablesOf(yield* generate());
      const names = [...demo.setup.tables, ...demo.group.tables].map((table) => table.name);

      for (const name of names) {
        const ids = (tables.get(name) ?? []).map((row) => row.id);
        expect(ids.length, name).toBeGreaterThan(0);
        expect(new Set(ids).size, name).toBe(ids.length);
      }

      const missing = references.flatMap(([from, field, to]) => {
        const ids = new Set((tables.get(to) ?? []).map((row) => row.id));

        return (tables.get(from) ?? [])
          .filter((row) => row[field] !== null && !ids.has(row[field]))
          .map((row) => `${from}.${field} = ${String(row[field])}`);
      });

      expect(missing).toEqual([]);
    }),
  );

  it.effect("keeps issue dates and states in order", () =>
    Effect.gen(function* () {
      const written = yield* generate(["issues", "cycles"]);

      const rowsOf = (resource: string) =>
        written.filter((item) => item.resource === resource).flatMap((item) => item.batch.rows);

      const issues = Schema.decodeUnknownSync(Schema.Array(Schema.toType(IssueSchema)))(
        rowsOf("issues"),
      );

      const cycles = new Map(
        Schema.decodeUnknownSync(Schema.Array(Schema.toType(CycleSchema)))(rowsOf("cycles")).map(
          (cycle) => [cycle.id, cycle],
        ),
      );

      for (const issue of issues) {
        const cycle = cycles.get(issue.cycle_id ?? "");

        if (cycle && issue.started_at) {
          expect(cycle.starts_at <= issue.started_at && issue.started_at < cycle.ends_at).toBe(
            true,
          );
        }

        expect(issue.created_at <= issue.updated_at && issue.updated_at <= now).toBe(true);
        expect(issue.completed_at === null || issue.started_at !== null).toBe(true);
        expect(issue.identifier).toMatch(/^(ENG|DES|PRD|SUP)-\d+$/);
      }

      expect(issues[0]).toMatchInlineSnapshot(`
        {
          "_deleted": false,
          "added_to_cycle_at": 2026-08-29T14:47:51.636Z,
          "added_to_project_at": null,
          "added_to_team_at": 2026-08-14T17:39:25.999Z,
          "archived_at": null,
          "assignee_id": "00000003-0000-4000-8000-00000000000d",
          "auto_archived_at": null,
          "auto_closed_at": null,
          "branch_name": "eng-1-remove-back-end-sensor",
          "canceled_at": null,
          "completed_at": 2026-08-31T21:39:08.070Z,
          "created_at": 2026-08-14T17:39:25.999Z,
          "creator_id": "00000003-0000-4000-8000-00000000000d",
          "customer_ticket_count": 0n,
          "cycle_id": "00000007-0017-4000-8000-000000000000",
          "delegate_id": null,
          "description": "We need to quantify the primary XML monitor!

        **Steps**

        1. Open the page
        2. Try the action
        3. See the error",
          "due_date": null,
          "estimate": 1,
          "external_user_creator_id": null,
          "id": "0000000c-0000-4000-8000-000000000000",
          "identifier": "ENG-1",
          "integration_source_type": null,
          "label_ids": [
            "00000004-0000-4000-8000-000000000003",
          ],
          "number": 1,
          "parent_id": null,
          "previous_identifiers": [],
          "priority": 3,
          "priority_label": "Medium",
          "project_id": null,
          "project_milestone_id": null,
          "sla_breaches_at": null,
          "sla_high_risk_at": null,
          "sla_medium_risk_at": null,
          "sla_started_at": null,
          "sla_type": null,
          "snoozed_by_id": null,
          "snoozed_until_at": null,
          "source_comment_id": null,
          "started_at": 2026-08-29T14:47:51.636Z,
          "started_triage_at": null,
          "state_id": "00000002-0005-4000-8000-000000000000",
          "team_id": "00000001-0000-4000-8000-000000000000",
          "title": "Remove back-end sensor",
          "trashed": false,
          "triaged_at": null,
          "updated_at": 2026-08-31T21:39:08.070Z,
          "url": "https://linear.app/acme/issue/ENG-1/remove-back-end-sensor",
          "version": 2026-08-31T21:39:08.070Z,
        }
      `);
    }),
  );
});

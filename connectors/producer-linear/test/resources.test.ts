import { describe, expect, it } from "@effect/vitest";
import { Effect, Option, Ref } from "effect";
import { TestClock } from "effect/testing";

import { demo } from "../src/demo";
import { LinearConnector, manifest } from "../src/index";
import { tableSchemas } from "../src/tables";
import { comment, historyEntry, issue, project, workflowStates } from "./fixtures/objects";
import { type FakeLinear, connectorLayer, makeFakeClient, page, pick } from "./helpers";

const now = Date.parse("2026-10-16T12:00:00.000Z");
const cutoff = "2026-10-16T11:00:00.000Z";

type ResourceName = (typeof manifest.resources)[number]["name"];

const getResource = (name: ResourceName, fake: FakeLinear) =>
  Effect.gen(function* () {
    yield* TestClock.setTime(now);
    const { client, requests } = yield* makeFakeClient(fake);
    const connector = yield* LinearConnector.LinearConnector.pipe(
      Effect.provide(connectorLayer(client)),
    );
    const resource = yield* Effect.fromOption(
      Option.fromNullishOr(connector.resources.find((item) => item.name === name)),
    );
    return {
      backfill: yield* Effect.fromOption(Option.fromNullishOr(resource.backfill)),
      changes: yield* Effect.fromOption(Option.fromNullishOr(resource.changes)),
      requests: Ref.get(requests).pipe(
        Effect.map((items) =>
          items.map(({ operation, variables }) => `${operation} ${JSON.stringify(variables)}`),
        ),
      ),
    };
  });

const updatedAt = (time: string) => ({ ...comment, updated_at: time });

describe("resources", () => {
  it.effect("matches the manifest and the table schemas", () =>
    Effect.gen(function* () {
      const { client } = yield* makeFakeClient(() => undefined);
      const connector = yield* LinearConnector.LinearConnector.pipe(
        Effect.provide(connectorLayer(client)),
      );

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

  it.effect("backfills every page, archived items too", () =>
    Effect.gen(function* () {
      const { backfill, requests } = yield* getResource("issues", ({ variables }) =>
        variables.after === null ? page("issues", [issue], "cursor-1") : page("issues", []),
      );
      const first = yield* backfill.fetch({ cutoff });
      const second = yield* backfill.fetch({ cutoff, pageCursor: String(first.nextPageCursor) });

      expect({
        rows: pick(first.rows, ["id", "state_id", "label_ids", "version", "_deleted"]),
        first: { hasMore: first.hasMore, nextPageCursor: first.nextPageCursor },
        second: { rows: second.rows.length, hasMore: second.hasMore },
        requests: yield* requests,
      }).toMatchInlineSnapshot(`
        {
          "first": {
            "hasMore": true,
            "nextPageCursor": "cursor-1",
          },
          "requests": [
            "Issues {"first":250,"after":null,"orderBy":"createdAt"}",
            "Issues {"first":250,"after":"cursor-1","orderBy":"createdAt"}",
          ],
          "rows": [
            {
              "_deleted": false,
              "id": "0ba5ba1b-fcc2-423c-ad89-fc7a0bf208a9",
              "label_ids": [
                "5dd8040c-c281-4c3e-90f6-595e4b7924ef",
              ],
              "state_id": "33849245-b58b-4c69-a1cc-47fb93d35d91",
              "version": "2026-10-16T10:20:56.319Z",
            },
          ],
          "second": {
            "hasMore": false,
            "rows": 0,
          },
        }
      `);
    }),
  );

  it.effect("reads changes newest first and stops at the first older item", () =>
    Effect.gen(function* () {
      const { changes, requests } = yield* getResource("comments", () =>
        page(
          "comments",
          [updatedAt("2026-10-16T11:30:00.000Z"), updatedAt("2026-10-16T10:00:00.000Z")],
          "cursor-1",
        ),
      );
      const result = yield* changes.fetch({ cursor: cutoff });

      expect({
        rows: pick(result.rows, ["updated_at"]),
        cursor: result.cursor,
        hasMore: result.hasMore,
        requests: yield* requests,
      }).toMatchInlineSnapshot(`
        {
          "cursor": "{"since":"2026-10-16T12:00:00.000Z"}",
          "hasMore": false,
          "requests": [
            "Comments {"first":250,"after":null,"orderBy":"updatedAt"}",
          ],
          "rows": [
            {
              "updated_at": "2026-10-16T11:30:00.000Z",
            },
          ],
        }
      `);
    }),
  );

  it.effect("splits a long changes run and goes on from the same page", () =>
    Effect.gen(function* () {
      let pages = 0;
      const { changes, requests } = yield* getResource("comments", () => {
        pages += 1;
        return page("comments", [updatedAt("2026-10-16T11:30:00.000Z")], `page-${pages}`);
      });
      const first = yield* changes.fetch({ cursor: cutoff });
      const second = yield* changes.fetch({ cursor: first.cursor });

      expect({
        first: { rows: first.rows.length, cursor: first.cursor, hasMore: first.hasMore },
        secondStartsAt: (yield* requests)[20],
        second: second.cursor,
      }).toMatchInlineSnapshot(`
        {
          "first": {
            "cursor": "{"since":"2026-10-16T11:00:00.000Z","pending":{"until":"2026-10-16T12:00:00.000Z","after":"page-20"}}",
            "hasMore": true,
            "rows": 20,
          },
          "second": "{"since":"2026-10-16T11:00:00.000Z","pending":{"until":"2026-10-16T12:00:00.000Z","after":"page-40"}}",
          "secondStartsAt": "Comments {"first":250,"after":"page-20","orderBy":"updatedAt"}",
        }
      `);
    }),
  );

  it.effect("reads a short list whole, for backfill and every hour", () =>
    Effect.gen(function* () {
      const { backfill, changes } = yield* getResource("workflow_states", () =>
        page("workflowStates", workflowStates),
      );
      const backfilled = yield* backfill.fetch({ cutoff });
      const changed = yield* changes.fetch({ cursor: cutoff });

      expect({
        backfill: pick(backfilled.rows, ["name", "archived_at", "team_id"]),
        hasMore: backfilled.hasMore,
        changes: changed.rows.length,
        cursor: changed.cursor,
      }).toMatchInlineSnapshot(`
        {
          "backfill": [
            {
              "archived_at": "2026-10-16T10:00:16.470Z",
              "name": "Delete test state",
              "team_id": "0a24709a-8c2e-4bb4-9a60-65c55636927c",
            },
            {
              "archived_at": null,
              "name": "In Review",
              "team_id": "0a24709a-8c2e-4bb4-9a60-65c55636927c",
            },
          ],
          "changes": 2,
          "cursor": "2026-10-16T12:00:00.000Z",
          "hasMore": false,
        }
      `);
    }),
  );

  it.effect("reads the rest of a long issue history", () =>
    Effect.gen(function* () {
      const releaseHistory = {
        ...historyEntry,
        added_to_release_ids: ["release-1"],
        removed_from_release_ids: ["release-2"],
      };
      const { backfill, requests } = yield* getResource("issue_history", ({ operation }) =>
        operation === "IssueHistory"
          ? { issue: { history: page("history", [releaseHistory]).history } }
          : page("issues", [
              {
                id: issue.id,
                updated_at: issue.updated_at,
                history: page("history", [releaseHistory], "history-1").history,
              },
            ]),
      );
      const result = yield* backfill.fetch({ cutoff });
      expect({
        rows: pick(result.rows, [
          "issue_id",
          "added_to_release_ids",
          "removed_from_release_ids",
          "from_state_id",
          "to_state_id",
          "from_priority",
          "to_priority",
        ]),
        requests: yield* requests,
      }).toMatchInlineSnapshot(`
        {
          "requests": [
            "Issues {"first":25,"after":null,"orderBy":"createdAt"}",
            "IssueHistory {"id":"0ba5ba1b-fcc2-423c-ad89-fc7a0bf208a9","after":"history-1"}",
          ],
          "rows": [
            {
              "added_to_release_ids": [
                "release-1",
              ],
              "from_priority": 3,
              "from_state_id": "33849245-b58b-4c69-a1cc-47fb93d35d91",
              "issue_id": "0ba5ba1b-fcc2-423c-ad89-fc7a0bf208a9",
              "removed_from_release_ids": [
                "release-2",
              ],
              "to_priority": 1,
              "to_state_id": "0eb344b1-e812-41c5-8c86-bc72fdfbf253",
            },
            {
              "added_to_release_ids": [
                "release-1",
              ],
              "from_priority": 3,
              "from_state_id": "33849245-b58b-4c69-a1cc-47fb93d35d91",
              "issue_id": "0ba5ba1b-fcc2-423c-ad89-fc7a0bf208a9",
              "removed_from_release_ids": [
                "release-2",
              ],
              "to_priority": 1,
              "to_state_id": "0eb344b1-e812-41c5-8c86-bc72fdfbf253",
            },
          ],
        }
      `);
    }),
  );

  it.effect("keeps a project's teams and members as IDs", () =>
    Effect.gen(function* () {
      const { backfill } = yield* getResource("projects", () => page("projects", [project]));
      const result = yield* backfill.fetch({ cutoff });

      expect(pick(result.rows, ["status_id", "lead_id", "team_ids", "member_ids", "progress"]))
        .toMatchInlineSnapshot(`
          [
            {
              "lead_id": "618d15a8-80f0-4cbf-ba33-2cbf91ddfd8e",
              "member_ids": [
                "618d15a8-80f0-4cbf-ba33-2cbf91ddfd8e",
              ],
              "progress": 0.625,
              "status_id": "ea7b6389-bb19-4f56-9320-fceb53367d72",
              "team_ids": [
                "0a24709a-8c2e-4bb4-9a60-65c55636927c",
              ],
            },
          ]
        `);
    }),
  );

  it.effect("reads release note content and release links", () =>
    Effect.gen(function* () {
      const note = {
        id: "note-1",
        created_at: "2026-10-16T10:00:00.000Z",
        updated_at: "2026-10-16T11:30:00.000Z",
        archived_at: null,
        title: "October release",
        content: { content: "Fixed the dashboard." },
        url: "https://linear.app/example/release-note/note-1",
        pipeline_id: { id: "pipeline-1" },
        release_ids: [{ id: "release-1" }, { id: "release-2" }],
      };
      const { backfill, changes } = yield* getResource("release_notes", () =>
        page("releaseNotes", [
          note,
          { ...note, id: "note-2", title: null, content: null, release_ids: [] },
          { ...note, id: "note-3", content: { content: null } },
        ]),
      );
      const backfilled = yield* backfill.fetch({ cutoff });
      const changed = yield* changes.fetch({ cursor: cutoff });

      expect(changed.rows).toEqual(backfilled.rows);
      expect(
        pick(backfilled.rows, ["id", "title", "content", "pipeline_id", "release_ids", "version"]),
      ).toMatchInlineSnapshot(`
        [
          {
            "content": "Fixed the dashboard.",
            "id": "note-1",
            "pipeline_id": "pipeline-1",
            "release_ids": [
              "release-1",
              "release-2",
            ],
            "title": "October release",
            "version": "2026-10-16T11:30:00.000Z",
          },
          {
            "content": null,
            "id": "note-2",
            "pipeline_id": "pipeline-1",
            "release_ids": [],
            "title": null,
            "version": "2026-10-16T11:30:00.000Z",
          },
          {
            "content": null,
            "id": "note-3",
            "pipeline_id": "pipeline-1",
            "release_ids": [
              "release-1",
              "release-2",
            ],
            "title": "October release",
            "version": "2026-10-16T11:30:00.000Z",
          },
        ]
      `);
    }),
  );
});

import { NodeServices } from "@effect/platform-node";
import { describe, expect, it } from "@effect/vitest";
import { ConnectorApp } from "@useairfoil/connector-kit";
import { FileSystemCassetteStore, VcrHttpClient } from "@useairfoil/effect-vcr";
import { ConfigProvider, Effect, Layer, Option } from "effect";
import { FetchHttpClient } from "effect/http";
import { existsSync } from "node:fs";

import { LinearConnector } from "../src/index";

const canRun =
  existsSync(new URL("./__cassettes__/api.vcr.test.cassette", import.meta.url)) ||
  process.env.LINEAR_API_KEY !== undefined;

const configLayer = ConfigProvider.layer(
  ConfigProvider.fromEnv().pipe(
    ConfigProvider.orElse(
      ConfigProvider.fromUnknown({
        LINEAR_API_KEY: "lin_api_placeholder",
        LINEAR_WEBHOOK_SECRET: "webhook-secret-placeholder",
      }),
    ),
  ),
);

const connectorLayer = LinearConnector.layerConfig(LinearConnector.LinearConfigDef.config).pipe(
  Layer.provide(
    VcrHttpClient.layer({
      vcrName: "producer-linear",
      // The test user's email is real.
      redact: { responseBodyReplacements: { email: "user@example.com" } },
    }).pipe(
      Layer.provide(FileSystemCassetteStore.layer()),
      Layer.provide(Layer.merge(NodeServices.layer, FetchHttpClient.layer)),
    ),
  ),
  Layer.provide(configLayer),
);

const cutoff = "2026-10-16T12:00:00.000Z";
// The seed data was made after this, so changes read all of it.
const since = "2026-10-16T09:00:00.000Z";

describe.skipIf(!canRun)("Linear API (vcr)", () => {
  it.live(
    "checks, backfills, and reads changes for every resource",
    () =>
      Effect.gen(function* () {
        const built = Layer.succeedContext(yield* Layer.build(connectorLayer));
        const connector = yield* LinearConnector.LinearConnector.pipe(Effect.provide(built));
        const check = yield* ConnectorApp.check(LinearConnector.LinearConnector, built, {
          resources: connector.resources.map((resource) => resource.name),
        });

        const results: Record<string, unknown> = {};
        for (const resource of connector.resources) {
          const backfill = yield* Effect.fromOption(Option.fromNullishOr(resource.backfill));
          const changes = yield* Effect.fromOption(Option.fromNullishOr(resource.changes));
          let rows = 0;
          let pageCursor: string | undefined;
          for (;;) {
            const page = yield* backfill.fetch({ cutoff, ...(pageCursor ? { pageCursor } : {}) });
            rows += page.rows.length;
            if (!page.hasMore) break;
            pageCursor = String(page.nextPageCursor);
          }
          const changed = yield* changes.fetch({ cursor: since });
          results[resource.name] = `${rows} backfilled, ${changed.rows.length} changed`;
        }

        const issues = connector.resources.find((resource) => resource.name === "issues");
        const webhook = yield* Effect.fromOption(Option.fromNullishOr(issues?.webhook));
        const reread = yield* Effect.forEach(
          ["0ba5ba1b-fcc2-423c-ad89-fc7a0bf208a9", "00000000-0000-4000-8000-000000000000"],
          (id) =>
            webhook.handler({ payload: { data: { id }, webhookTimestamp: Date.parse(cutoff) } }),
        );

        expect({
          failedChecks: Object.entries(check).flatMap(([name, result]) =>
            result._tag === "ok" ? [] : [name],
          ),
          results,
          webhook: reread.flat().map((row) => ({ id: row.id, _deleted: row._deleted })),
        }).toMatchInlineSnapshot(`
          {
            "failedChecks": [],
            "results": {
              "attachments": "1 backfilled, 1 changed",
              "comments": "3 backfilled, 3 changed",
              "customer_needs": "2 backfilled, 2 changed",
              "customer_statuses": "4 backfilled, 4 changed",
              "customer_tiers": "1 backfilled, 1 changed",
              "customers": "1 backfilled, 1 changed",
              "cycles": "2 backfilled, 2 changed",
              "documents": "4 backfilled, 4 changed",
              "external_users": "1 backfilled, 1 changed",
              "initiative_labels": "1 backfilled, 1 changed",
              "initiative_relations": "0 backfilled, 0 changed",
              "initiative_to_projects": "2 backfilled, 2 changed",
              "initiative_updates": "1 backfilled, 1 changed",
              "initiatives": "2 backfilled, 2 changed",
              "issue_history": "21 backfilled, 21 changed",
              "issue_labels": "4 backfilled, 4 changed",
              "issue_relations": "2 backfilled, 2 changed",
              "issue_to_releases": "0 backfilled, 0 changed",
              "issues": "11 backfilled, 11 changed",
              "project_labels": "1 backfilled, 1 changed",
              "project_milestones": "1 backfilled, 1 changed",
              "project_relations": "1 backfilled, 1 changed",
              "project_statuses": "5 backfilled, 5 changed",
              "project_updates": "1 backfilled, 1 changed",
              "projects": "2 backfilled, 2 changed",
              "release_notes": "0 backfilled, 0 changed",
              "release_pipelines": "0 backfilled, 0 changed",
              "release_stages": "0 backfilled, 0 changed",
              "releases": "0 backfilled, 0 changed",
              "team_memberships": "1 backfilled, 1 changed",
              "teams": "1 backfilled, 1 changed",
              "users": "2 backfilled, 2 changed",
              "workflow_states": "8 backfilled, 8 changed",
            },
            "webhook": [
              {
                "_deleted": false,
                "id": "0ba5ba1b-fcc2-423c-ad89-fc7a0bf208a9",
              },
              {
                "_deleted": true,
                "id": "00000000-0000-4000-8000-000000000000",
              },
            ],
          }
        `);
      }),
    { timeout: 600_000 },
  );
});

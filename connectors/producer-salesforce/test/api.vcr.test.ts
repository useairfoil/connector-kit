import { NodeServices } from "@effect/platform-node";
import { describe, expect, it } from "@effect/vitest";
import { ConnectorApp } from "@useairfoil/connector-kit";
import { FileSystemCassetteStore, VcrHttpClient } from "@useairfoil/effect-vcr";
import { ConfigProvider, Effect, Layer, Option } from "effect";
import { FetchHttpClient } from "effect/http";
import { existsSync } from "node:fs";

import { SalesforceConnector } from "../src/index";

// Recording needs the test org. Skip until there is a cassette or a secret.
const canRun =
  existsSync(new URL("./__cassettes__/api.vcr.test.cassette", import.meta.url)) ||
  process.env.SALESFORCE_CLIENT_SECRET !== undefined;

const configLayer = ConfigProvider.layer(
  ConfigProvider.fromEnv().pipe(
    ConfigProvider.orElse(
      ConfigProvider.fromUnknown({
        SALESFORCE_DOMAIN: "orgfarm-2a5054f9f2-dev-ed.develop.my.salesforce.com",
        SALESFORCE_CLIENT_ID: "salesforce-client-id-placeholder",
        SALESFORCE_CLIENT_SECRET: "salesforce-client-secret-placeholder",
      }),
    ),
  ),
);

const connectorLayer = SalesforceConnector.layerConfig(
  SalesforceConnector.SalesforceConfigDef.config,
).pipe(
  Layer.provide(
    VcrHttpClient.layer({
      vcrName: "producer-salesforce",
      // The `Authorization` header, which also carries the client secret, is
      // redacted by default. The admin user's email and username are real.
      redact: {
        responseHeaders: ["set-cookie"],
        responseBodyReplacements: {
          access_token: "salesforce-access-token-placeholder",
          signature: "salesforce-signature-placeholder",
          Email: "user@example.com",
          Username: "user@example.com",
        },
      },
    }).pipe(
      Layer.provide(FileSystemCassetteStore.layer()),
      Layer.provide(Layer.merge(NodeServices.layer, FetchHttpClient.layer)),
    ),
  ),
  Layer.provide(configLayer),
);

const cutoff = "2026-10-15T11:50:00.000Z";

// Every window is already running, so each request is the same on replay.
const window = JSON.stringify({
  start: "2026-10-15T10:00:00.000Z",
  end: "2026-10-15T11:54:00.000Z",
  _tag: "updated",
});
const fullRead = JSON.stringify({ _tag: "reading", startedAt: cutoff });
// One of each kind: replicated, history, full read, setup, and a
// feature object (Shared Activities). Every describe is about 100 KB, so the
// cassette leaves the rest out.
const resources = new Map([
  ["accounts", window],
  ["contacts", window],
  ["opportunities", window],
  ["account_history", window],
  ["users", window],
  ["permission_set_assignments", fullRead],
  ["task_relations", window],
]);

const checkPicklists = (names: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const connector = yield* SalesforceConnector.SalesforceConnector;

    for (const name of names) {
      const resource = yield* Effect.fromOption(
        Option.fromNullishOr(connector.resources.find((item) => item.name === name)),
      );
      yield* resource.check;
      const backfill = yield* Effect.fromOption(Option.fromNullishOr(resource.backfill));
      const page = yield* backfill.fetch({ cutoff });
      expect(page.rows.length, name).toBeGreaterThan(0);
    }
  }).pipe(Effect.provide(connectorLayer));

describe.skipIf(!canRun)("Salesforce API (vcr)", () => {
  it.live("reads opportunity stages and lead statuses", () =>
    checkPicklists(["opportunity_stages", "lead_statuses"]),
  );

  it.live("reads case, contract, task, and solution picklists", () =>
    checkPicklists([
      "case_statuses",
      "contract_statuses",
      "task_statuses",
      "task_priorities",
      "solution_statuses",
    ]),
  );

  it.live("backfills custom objects and their field history", () =>
    Effect.gen(function* () {
      const connector = yield* SalesforceConnector.SalesforceConnector;
      const resource = yield* Effect.fromOption(
        Option.fromNullishOr(connector.resources.find((item) => item.name === "custom_objects")),
      );
      yield* resource.check;
      const backfill = yield* Effect.fromOption(Option.fromNullishOr(resource.backfill));
      const objects = new Set<string>();
      let pageCursor: string | undefined;
      for (;;) {
        const page = yield* backfill.fetch({ cutoff, ...(pageCursor ? { pageCursor } : {}) });
        for (const row of page.rows) {
          if ("object" in row && typeof row.object === "string") objects.add(row.object);
        }
        if (!page.hasMore) break;
        pageCursor = String(page.nextPageCursor);
      }
      expect(objects).toContain("Airfoil_Test__c");
      expect(objects).toContain("Airfoil_Test__History");
    }).pipe(Effect.provide(connectorLayer)),
  );

  it.live(
    "checks, backfills, and reads changes for every resource",
    () =>
      Effect.gen(function* () {
        // Share one token; a second acquisition would replay the redacted token.
        const built = Layer.succeedContext(yield* Layer.build(connectorLayer));
        const check = yield* ConnectorApp.check(SalesforceConnector.SalesforceConnector, built, {
          resources: [...resources.keys()],
        });
        const connector = yield* SalesforceConnector.SalesforceConnector.pipe(
          Effect.provide(built),
        );

        const results: Record<string, unknown> = {};
        const firstRows: Record<string, unknown> = {};
        for (const resource of connector.resources.filter((item) => resources.has(item.name))) {
          const backfill = yield* Effect.fromOption(Option.fromNullishOr(resource.backfill));
          const changes = yield* Effect.fromOption(Option.fromNullishOr(resource.changes));

          results[resource.name] = yield* Effect.gen(function* () {
            let rows = 0;
            let pageCursor: string | undefined;
            for (;;) {
              const page = yield* backfill.fetch({
                cutoff,
                ...(pageCursor ? { pageCursor } : {}),
              });
              rows += page.rows.length;
              if (pageCursor === undefined && page.rows[0] !== undefined) {
                // The version is the fetch time, which changes on every run.
                firstRows[resource.name] = { ...page.rows[0], version: "<fetch time>" };
              }
              if (!page.hasMore) break;
              pageCursor = String(page.nextPageCursor);
            }
            let changed = 0;
            let deletes = 0;
            let cursor = resources.get(resource.name) ?? window;
            for (;;) {
              const result = yield* changes.fetch({ cursor });
              const deleted = result.rows.filter((row) => row._deleted === true).length;
              changed += result.rows.length - deleted;
              deletes += deleted;
              if (result.hasMore !== true) break;
              cursor = String(result.cursor);
            }
            return { backfillRows: rows, changedRows: changed, deletes };
          }).pipe(Effect.catch((error) => Effect.succeed({ error: error.message })));
        }

        expect({ check, results }).toMatchInlineSnapshot(`
          {
            "check": {
              "account_history": {
                "_tag": "ok",
              },
              "accounts": {
                "_tag": "ok",
              },
              "contacts": {
                "_tag": "ok",
              },
              "opportunities": {
                "_tag": "ok",
              },
              "permission_set_assignments": {
                "_tag": "ok",
              },
              "task_relations": {
                "_tag": "ok",
              },
              "users": {
                "_tag": "ok",
              },
            },
            "results": {
              "account_history": {
                "backfillRows": 3,
                "changedRows": 3,
                "deletes": 2,
              },
              "accounts": {
                "backfillRows": 4,
                "changedRows": 4,
                "deletes": 1,
              },
              "contacts": {
                "backfillRows": 3,
                "changedRows": 3,
                "deletes": 2,
              },
              "opportunities": {
                "backfillRows": 2,
                "changedRows": 2,
                "deletes": 1,
              },
              "permission_set_assignments": {
                "backfillRows": 19,
                "changedRows": 19,
                "deletes": 0,
              },
              "task_relations": {
                "backfillRows": 5,
                "changedRows": 5,
                "deletes": 0,
              },
              "users": {
                "backfillRows": 8,
                "changedRows": 2,
                "deletes": 0,
              },
            },
          }
        `);
        expect(firstRows.accounts).toMatchInlineSnapshot(`
          {
            "_deleted": false,
            "created_at": 2026-10-15T10:26:49.000Z,
            "fields": Map {
              "AnnualRevenue" => "2500000",
              "BillingCity" => "Pune",
              "BillingCountry" => "India",
              "BillingCountryCode" => "IN",
              "CleanStatus" => "Pending",
              "CreatedById" => "005g800000CbOFmAAN",
              "CreatedDate" => "2026-10-15T10:26:49.000+0000",
              "Id" => "001g8000012rrsXAAQ",
              "Industry" => "Finance",
              "IsDeleted" => "false",
              "LastModifiedById" => "005g800000CbOFmAAN",
              "LastModifiedDate" => "2026-10-15T10:59:15.000+0000",
              "Name" => "Airfoil Test Account 1",
              "OwnerId" => "005g800000CbOFmAAN",
              "PhotoUrl" => "/services/images/photo/001g8000012rrsXAAQ",
              "SystemModstamp" => "2026-10-15T10:59:15.000+0000",
            },
            "id": "001g8000012rrsXAAQ",
            "updated_at": 2026-10-15T10:59:15.000Z,
            "version": "<fetch time>",
          }
        `);
      }),
    { timeout: 600_000 },
  );
});

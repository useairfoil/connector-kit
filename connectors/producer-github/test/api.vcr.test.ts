import { NodeServices } from "@effect/platform-node";
import { describe, expect, it } from "@effect/vitest";
import { ConnectorApp } from "@useairfoil/connector-kit";
import { FileSystemCassetteStore, VcrHttpClient } from "@useairfoil/effect-vcr";
import { ConfigProvider, Effect, Layer, Option } from "effect";
import { FetchHttpClient } from "effect/http";
import { generateKeyPairSync } from "node:crypto";
import { existsSync } from "node:fs";

import { GitHubConnector } from "../src/index";

// Recording needs a test installation. Skip until there is a cassette or a key.
const canRun =
  existsSync(new URL("./__cassettes__/api.vcr.test.cassette", import.meta.url)) ||
  process.env.GITHUB_APP_PRIVATE_KEY !== undefined;

// Replays still sign a JWT, but GitHub never sees it.
const replayKey = generateKeyPairSync("rsa", { modulusLength: 2048 })
  .privateKey.export({ type: "pkcs1", format: "pem" })
  .toString();

const configLayer = ConfigProvider.layer(
  ConfigProvider.fromEnv().pipe(
    ConfigProvider.orElse(
      ConfigProvider.fromUnknown({
        GITHUB_APP_CLIENT_ID: "Iv23liReplay",
        GITHUB_APP_PRIVATE_KEY: replayKey,
        // The installation the cassette was recorded with.
        GITHUB_INSTALLATION_ID: "168295910",
        GITHUB_WEBHOOK_SECRET: "replay",
      }),
    ),
  ),
);

const connectorLayer = GitHubConnector.layerConfig(GitHubConnector.GitHubConfigDef.config).pipe(
  Layer.provide(
    VcrHttpClient.layer({
      vcrName: "producer-github",
      // The `Authorization` header is redacted by default. Account names stay in
      // URLs, because requests are built from them.
      redact: {
        responseBodyReplacements: {
          token: "ghs_replay",
          login: "octocat",
          avatar_url: "https://avatars.githubusercontent.com/u/583231",
          email: "octocat@github.com",
          // A signed commit's payload repeats the author's email.
          payload: "",
        },
      },
    }).pipe(
      Layer.provide(FileSystemCassetteStore.layer()),
      Layer.provide(Layer.merge(NodeServices.layer, FetchHttpClient.layer)),
    ),
  ),
  Layer.provide(configLayer),
);

describe.skipIf(!canRun)("GitHub API (vcr)", () => {
  it.live("checks and backfills repository labels and milestones", () =>
    Effect.gen(function* () {
      const connector = yield* GitHubConnector.GitHubConnector;
      for (const name of ["labels", "milestones"]) {
        const resource = yield* Effect.fromOption(
          Option.fromNullishOr(connector.resources.find((item) => item.name === name)),
        );
        yield* resource.check;
        const backfill = yield* Effect.fromOption(Option.fromNullishOr(resource.backfill));
        const changes = yield* Effect.fromOption(Option.fromNullishOr(resource.changes));
        let rows = 0;
        let pageCursor: string | undefined;
        for (;;) {
          const page = yield* backfill.fetch({
            cutoff: "2030-01-01T00:00:00.000Z",
            ...(pageCursor === undefined ? {} : { pageCursor }),
          });
          rows += page.rows.length;
          if (!page.hasMore) break;
          pageCursor = String(page.nextPageCursor);
        }
        const changed = yield* changes.fetch({
          cursor: JSON.stringify({ since: "2026-10-12T00:00:00.000Z", repositoryIds: [] }),
        });
        expect(changed.rows.length, name).toBe(rows);
        if (name === "labels") expect(rows).toBeGreaterThan(0);
      }
    }).pipe(Effect.provide(connectorLayer)),
  );

  // Live clock: GitHub rejects a JWT signed at the test clock's time.
  it.live("checks, backfills, and reads changes for every resource", () =>
    Effect.gen(function* () {
      const connector = yield* GitHubConnector.GitHubConnector;
      const resources = connector.resources.filter(
        ({ name }) => name !== "labels" && name !== "milestones",
      );
      const check = yield* ConnectorApp.check(GitHubConnector.GitHubConnector, connectorLayer, {
        resources: resources.map((resource) => resource.name),
      });

      const results: Record<string, unknown> = {};
      for (const resource of resources) {
        const backfill = yield* Effect.fromOption(Option.fromNullishOr(resource.backfill));
        const changes = yield* Effect.fromOption(Option.fromNullishOr(resource.changes));
        const cutoff = "2026-10-12T00:00:00.000Z";

        let rows = 0;
        let pages = 0;
        let pageCursor: string | undefined;
        for (;;) {
          const page = yield* backfill.fetch({ cutoff, ...(pageCursor ? { pageCursor } : {}) });
          rows += page.rows.length;
          pages += 1;
          if (!page.hasMore) break;
          pageCursor = String(page.nextPageCursor);
        }
        // Every repository is new, so changes read them from the start.
        const changed = yield* changes.fetch({
          cursor: JSON.stringify({ since: cutoff, repositoryIds: [] }),
        });

        results[resource.name] = {
          backfillPages: pages,
          backfillRows: rows,
          changedRows: changed.rows.length,
        };
      }

      expect({ check, results }).toMatchInlineSnapshot(`
        {
          "check": {
            "check_runs": {
              "_tag": "ok",
            },
            "commit_statuses": {
              "_tag": "ok",
            },
            "commits": {
              "_tag": "ok",
            },
            "issue_comments": {
              "_tag": "ok",
            },
            "issues": {
              "_tag": "ok",
            },
            "pull_request_commits": {
              "_tag": "ok",
            },
            "pull_request_review_comments": {
              "_tag": "ok",
            },
            "pull_request_reviews": {
              "_tag": "ok",
            },
            "pull_requests": {
              "_tag": "ok",
            },
            "releases": {
              "_tag": "ok",
            },
            "repositories": {
              "_tag": "ok",
            },
            "workflow_jobs": {
              "_tag": "ok",
            },
            "workflow_runs": {
              "_tag": "ok",
            },
          },
          "results": {
            "check_runs": {
              "backfillPages": 1,
              "backfillRows": 2,
              "changedRows": 2,
            },
            "commit_statuses": {
              "backfillPages": 1,
              "backfillRows": 2,
              "changedRows": 2,
            },
            "commits": {
              "backfillPages": 1,
              "backfillRows": 2,
              "changedRows": 2,
            },
            "issue_comments": {
              "backfillPages": 1,
              "backfillRows": 1,
              "changedRows": 1,
            },
            "issues": {
              "backfillPages": 1,
              "backfillRows": 1,
              "changedRows": 1,
            },
            "pull_request_commits": {
              "backfillPages": 1,
              "backfillRows": 3,
              "changedRows": 3,
            },
            "pull_request_review_comments": {
              "backfillPages": 1,
              "backfillRows": 1,
              "changedRows": 1,
            },
            "pull_request_reviews": {
              "backfillPages": 1,
              "backfillRows": 1,
              "changedRows": 1,
            },
            "pull_requests": {
              "backfillPages": 1,
              "backfillRows": 2,
              "changedRows": 2,
            },
            "releases": {
              "backfillPages": 1,
              "backfillRows": 1,
              "changedRows": 1,
            },
            "repositories": {
              "backfillPages": 1,
              "backfillRows": 1,
              "changedRows": 1,
            },
            "workflow_jobs": {
              "backfillPages": 1,
              "backfillRows": 6,
              "changedRows": 6,
            },
            "workflow_runs": {
              "backfillPages": 1,
              "backfillRows": 6,
              "changedRows": 6,
            },
          },
        }
      `);
    }).pipe(Effect.provide(connectorLayer)),
  );
});

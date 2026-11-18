import { NodeServices } from "@effect/platform-node";
import { describe, expect, it } from "@effect/vitest";
import { ConnectorApp } from "@useairfoil/connector-kit";
import { FileSystemCassetteStore, VcrHttpClient } from "@useairfoil/effect-vcr";
import { ConfigProvider, Effect, Layer, Option } from "effect";
import { FetchHttpClient } from "effect/http";
import { TestClock } from "effect/testing";
import { generateKeyPairSync } from "node:crypto";
import { existsSync } from "node:fs";

import { GoogleAnalyticsConnector } from "../src/index";

const canRun =
  existsSync(new URL("./__cassettes__/api.vcr.test.cassette", import.meta.url)) ||
  process.env.GA_PRIVATE_KEY !== undefined;

// Replay still signs a JWT, so it needs some key. The assertion isn't matched.
const placeholderKey = generateKeyPairSync("rsa", { modulusLength: 2048 })
  .privateKey.export({ type: "pkcs8", format: "pem" })
  .toString();

// Fixed days, so the requests are the same on replay.
const configLayer = ConfigProvider.layer(
  ConfigProvider.fromUnknown({ GA_START_DATE: "2026-10-17", GA_LOOKBACK_DAYS: "3" }).pipe(
    ConfigProvider.orElse(ConfigProvider.fromEnv()),
    ConfigProvider.orElse(
      ConfigProvider.fromUnknown({
        GA_PROPERTY_ID: "559759765",
        GA_CLIENT_EMAIL: "airfoil-ga-reader@airfoil-ga-test.iam.gserviceaccount.com",
        GA_PRIVATE_KEY: placeholderKey,
      }),
    ),
  ),
);

const connectorLayer = GoogleAnalyticsConnector.layerConfig(
  GoogleAnalyticsConnector.GoogleAnalyticsConfigDef.config,
).pipe(
  Layer.provide(
    VcrHttpClient.layer({
      vcrName: "producer-google-analytics",
      // `Authorization` is redacted by default. The token exchange sends a
      // signed JWT and gets an access token back.
      redact: {
        requestBodyReplacements: { assertion: "jwt-placeholder" },
        responseBodyReplacements: { access_token: "google-access-token-placeholder" },
      },
      matchIgnore: { requestBodyKeys: ["assertion"] },
    }).pipe(
      Layer.provide(FileSystemCassetteStore.layer()),
      Layer.provide(Layer.merge(NodeServices.layer, FetchHttpClient.layer)),
    ),
  ),
  Layer.provide(configLayer),
);

// 09:15 on 2026-10-21 in Los Angeles. The seeded events are all on 10-20.
// The token's JWT is signed with this clock too, so set it to the time you
// record, or Google rejects the JWT.
const now = Date.parse("2026-10-21T16:15:00.000Z");
// Backfill reads 10-17 to 10-20; changes read 10-18 to 10-20.
const cutoff = "2026-10-21T16:00:00.000Z";

describe.skipIf(!canRun)("Google Analytics API (vcr)", () => {
  it.effect(
    "checks, backfills, and reads changes for every report",
    () =>
      Effect.gen(function* () {
        yield* TestClock.setTime(now);
        const built = Layer.succeedContext(yield* Layer.build(connectorLayer));
        const connector = yield* GoogleAnalyticsConnector.GoogleAnalyticsConnector.pipe(
          Effect.provide(built),
        );
        const recordedResources = connector.resources.filter(
          ({ name }) =>
            ![
              "transactions",
              "paid_campaigns",
              "stream_screens",
              "cohort_retention",
              "traffic_sources",
              "user_acquisition",
              "ecommerce_items",
            ].includes(name),
        );
        const check = yield* ConnectorApp.check(
          GoogleAnalyticsConnector.GoogleAnalyticsConnector,
          built,
          { resources: recordedResources.map((resource) => resource.name) },
        );

        const results: Record<string, unknown> = {};
        for (const resource of recordedResources) {
          const backfill = yield* Effect.fromOption(Option.fromNullishOr(resource.backfill));
          const changes = yield* Effect.fromOption(Option.fromNullishOr(resource.changes));
          let backfilled = 0;
          let pageCursor: string | undefined;
          for (;;) {
            const page = yield* backfill.fetch({ cutoff, ...(pageCursor ? { pageCursor } : {}) });
            backfilled += page.rows.length;
            if (!page.hasMore) break;
            pageCursor = String(page.nextPageCursor);
          }
          let changed = 0;
          let cursor = cutoff;
          for (;;) {
            const result = yield* changes.fetch({ cursor });
            changed += result.rows.length;
            cursor = String(result.cursor);
            if (result.hasMore !== true) break;
          }
          results[resource.name] = `${backfilled} backfilled, ${changed} changed`;
        }

        expect({
          failedChecks: Object.entries(check).flatMap(([name, result]) =>
            result._tag === "ok" ? [] : [name],
          ),
          results,
        }).toMatchInlineSnapshot(`
          {
            "failedChecks": [],
            "results": {
              "daily_overview": "1 backfilled, 1 changed",
              "devices": "5 backfilled, 5 changed",
              "events": "6 backfilled, 6 changed",
              "landing_pages": "6 backfilled, 6 changed",
              "locations": "5 backfilled, 5 changed",
              "pages": "7 backfilled, 7 changed",
            },
          }
        `);
      }),
    { timeout: 600_000 },
  );
});

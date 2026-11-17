import { NodeServices } from "@effect/platform-node";
import { describe, expect, it } from "@effect/vitest";
import { ConnectorApp } from "@useairfoil/connector-kit";
import { FileSystemCassetteStore, VcrHttpClient } from "@useairfoil/effect-vcr";
import { ConfigProvider, Effect, Layer, Option } from "effect";
import { FetchHttpClient } from "effect/http";
import { TestClock } from "effect/testing";
import { existsSync } from "node:fs";

import { FacebookAdsConnector } from "../src/index";
import { plain } from "./helpers";

// Needs a cassette, or a token to record one. See the README.
const canRun =
  existsSync(new URL("./__cassettes__/api.vcr.test.cassette", import.meta.url)) ||
  process.env.FACEBOOK_ADS_ACCESS_TOKEN !== undefined;

// Fixed days, so the requests are the same on replay. Set them near the
// recording time, across a month end for the monthly tables. The sandbox
// account never delivers, so insights are empty.
const configLayer = ConfigProvider.layer(
  ConfigProvider.fromUnknown({
    FACEBOOK_ADS_START_DATE: "2026-10-30",
    FACEBOOK_ADS_LOOKBACK_DAYS: "3",
  }).pipe(
    ConfigProvider.orElse(ConfigProvider.fromEnv()),
    ConfigProvider.orElse(
      ConfigProvider.fromUnknown({
        FACEBOOK_ADS_ACCESS_TOKEN: "placeholder",
        FACEBOOK_ADS_ACCOUNT_IDS: "1733560591063328",
      }),
    ),
  ),
);

// `Authorization` is redacted by default.
const connectorLayer = FacebookAdsConnector.layerConfig(
  FacebookAdsConnector.FacebookAdsConfigDef.config,
).pipe(
  Layer.provide(
    VcrHttpClient.layer({ vcrName: "producer-facebook-ads" }).pipe(
      Layer.provide(FileSystemCassetteStore.layer()),
      Layer.provide(Layer.merge(NodeServices.layer, FetchHttpClient.layer)),
    ),
  ),
  Layer.provide(configLayer),
);

const now = Date.parse("2026-11-02T18:00:00.000Z");
const cutoff = "2026-11-01T18:00:00.000Z";

describe.skipIf(!canRun)("Facebook Ads API (vcr)", () => {
  it.effect(
    "checks, backfills, and reads changes for every resource",
    () =>
      Effect.gen(function* () {
        yield* TestClock.setTime(now);
        const built = Layer.succeedContext(yield* Layer.build(connectorLayer));
        const connector = yield* FacebookAdsConnector.FacebookAdsConnector.pipe(
          Effect.provide(built),
        );
        const check = yield* ConnectorApp.check(FacebookAdsConnector.FacebookAdsConnector, built, {
          resources: connector.resources.map((resource) => resource.name),
        });

        const results: Record<string, string> = {};
        // One real row per table, to check the field types.
        const samples: Record<string, unknown> = {};
        for (const resource of connector.resources) {
          const backfill = yield* Effect.fromOption(Option.fromNullishOr(resource.backfill));
          const changes = yield* Effect.fromOption(Option.fromNullishOr(resource.changes));
          let backfilled = 0;
          let pageCursor: string | undefined;
          for (;;) {
            const page = yield* backfill.fetch({ cutoff, ...(pageCursor ? { pageCursor } : {}) });
            backfilled += page.rows.length;
            if (page.rows[0] !== undefined) samples[resource.name] ??= plain(page.rows[0]);
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
          samples,
        }).toMatchInlineSnapshot(`
          {
            "failedChecks": [],
            "results": {
              "account_insights_daily": "0 backfilled, 0 changed",
              "account_insights_monthly": "0 backfilled, 0 changed",
              "ad_accounts": "1 backfilled, 1 changed",
              "ad_activities": "29 backfilled, 1 changed",
              "ad_creatives": "0 backfilled, 0 changed",
              "ad_set_insights_daily": "0 backfilled, 0 changed",
              "ad_set_insights_monthly": "0 backfilled, 0 changed",
              "ad_sets": "3 backfilled, 0 changed",
              "ads": "0 backfilled, 0 changed",
              "ads_insights": "0 backfilled, 0 changed",
              "ads_insights_age_gender": "0 backfilled, 0 changed",
              "ads_insights_country": "0 backfilled, 0 changed",
              "ads_insights_platform": "0 backfilled, 0 changed",
              "campaign_insights_daily": "0 backfilled, 0 changed",
              "campaign_insights_monthly": "0 backfilled, 0 changed",
              "campaigns": "4 backfilled, 4 changed",
              "custom_audiences": "1 backfilled, 1 changed",
              "custom_conversions": "1 backfilled, 1 changed",
            },
            "samples": {
              "ad_accounts": {
                "account_status": "1n",
                "amount_spent": "0n",
                "created_time": "2026-10-22T16:18:52.000Z",
                "currency": "INR",
                "disable_reason": "0n",
                "id": "1733560591063328",
                "name": "New Sandbox Ad Account",
                "spend_cap": "0n",
                "timezone_name": "Asia/Kolkata",
                "timezone_offset_hours_utc": 5.5,
                "version": "2026-11-02T18:00:00.000Z",
              },
              "ad_activities": {
                "account_id": "1733560591063328",
                "actor_id": "122108939373530166",
                "application_id": "2181618336066160",
                "event_time": "2026-11-16T21:19:18.000Z",
                "event_type": "create_audience",
                "extra_data": "{"type":4,"name":"Airfoil test visitors"}",
                "id": "6b4b1ca00230d4124175913f642914212fc00b73ed2e0f92b9174e0801a6ebb6",
                "object_id": "120330000135460215",
                "object_name": "Airfoil test visitors",
                "object_type": "CAMPAIGN",
                "tool": "Marketing API",
                "version": "2026-11-02T18:00:00.000Z",
              },
              "ad_sets": {
                "account_id": "1733560591063328",
                "attribution_count_type": "ALL_CONVERSIONS",
                "bid_strategy": "LOWEST_COST_WITHOUT_CAP",
                "billing_event": "IMPRESSIONS",
                "budget_remaining": "500000n",
                "campaign_id": "120330000133333115",
                "created_time": "2026-10-22T16:33:48.000Z",
                "daily_budget": "0n",
                "destination_type": "UNDEFINED",
                "effective_status": "ARCHIVED",
                "end_time": "2026-11-29T18:30:00.000Z",
                "id": "120330000133341115",
                "is_incremental_attribution_enabled": false,
                "lifetime_budget": "500000n",
                "name": "Old audience",
                "optimization_goal": "REACH",
                "start_time": "2026-10-24T18:30:00.000Z",
                "status": "ARCHIVED",
                "targeting": "{"age_max":65,"age_min":18,"geo_locations":{"countries":["IN"],"location_types":["home","recent"]},"targeting_automation":{"advantage_audience":0},"user_age_unknown":true}",
                "updated_time": "2026-10-22T16:34:26.000Z",
                "version": "2026-11-02T18:00:00.000Z",
              },
              "campaigns": {
                "account_id": "1733560591063328",
                "buying_type": "AUCTION",
                "created_time": "2026-10-22T16:33:15.000Z",
                "effective_status": "DELETED",
                "id": "120330000133334115",
                "name": "Deleted test",
                "objective": "OUTCOME_TRAFFIC",
                "special_ad_categories": [],
                "start_time": "1969-12-31T23:59:59.000Z",
                "status": "DELETED",
                "updated_time": "2026-10-22T16:34:28.000Z",
                "version": "2026-11-02T18:00:00.000Z",
              },
              "custom_audiences": {
                "account_id": "1733560591063328",
                "approximate_count_lower_bound": "1000n",
                "approximate_count_upper_bound": "1000n",
                "description": "Connector live test",
                "id": "120330000135460215",
                "name": "Airfoil test visitors",
                "pixel_id": "990019353664009",
                "retention_days": "30n",
                "subtype": "WEBSITE",
                "version": "2026-11-02T18:00:00.000Z",
              },
              "custom_conversions": {
                "account_id": "1733560591063328",
                "creation_time": "2026-11-16T21:19:17.000Z",
                "custom_event_type": "PURCHASE",
                "description": "Connector live test",
                "event_source_type": "pixel",
                "id": "3148794985290898",
                "is_archived": false,
                "is_unavailable": false,
                "name": "Airfoil test purchase",
                "version": "2026-11-02T18:00:00.000Z",
              },
            },
          }
        `);
      }),
    { timeout: 600_000 },
  );
});

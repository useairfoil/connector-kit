import { describe, expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { TestClock } from "effect/testing";

import { FacebookAdsConnector, manifest } from "../src/index";
import { AdInsightsAgeGenderSchema } from "../src/schemas/insights";
import { ageGenderInsight, insight, page } from "./fixtures/graph";
import { type FakeGraph, connectorLayer, encodeRows, makeFakeClient, plain } from "./helpers";

// 10:00 on 2026-10-20 in Los Angeles.
const now = Date.parse("2026-10-20T17:00:00.000Z");
// 22:00 on 2026-10-18 in Los Angeles, though 2026-10-19 in UTC.
const cutoff = "2026-10-19T05:00:00.000Z";

type ResourceName = (typeof manifest.resources)[number]["name"];

const timeZone = { timezone_name: "America/Los_Angeles" };

/** Answers time zone lookups, and insights with `insights`. */
const graph =
  (insights: FakeGraph): FakeGraph =>
  (path, params) =>
    path.endsWith("/insights") ? insights(path, params) : timeZone;

const getResource = (
  name: ResourceName,
  fake: FakeGraph,
  config: Readonly<Record<string, string>> = {},
) =>
  Effect.gen(function* () {
    yield* TestClock.setTime(now);
    const { client, requests } = yield* makeFakeClient(graph(fake));
    const connector = yield* FacebookAdsConnector.FacebookAdsConnector.pipe(
      Effect.provide(connectorLayer(client, config)),
    );
    const resource = yield* Effect.fromOption(
      Option.fromNullishOr(connector.resources.find((item) => item.name === name)),
    );
    return {
      check: resource.check,
      backfill: yield* Effect.fromOption(Option.fromNullishOr(resource.backfill)),
      changes: yield* Effect.fromOption(Option.fromNullishOr(resource.changes)),
      // Only the insights requests.
      requests: requests.pipe(
        Effect.map((all) => all.filter((request) => request.includes("/insights"))),
      ),
    };
  });

describe("insights", () => {
  it.effect("requests native monthly campaign reach and keys it by the campaign", () =>
    Effect.gen(function* () {
      const { backfill } = yield* getResource(
        "campaign_insights_monthly",
        (_, params) => {
          expect(params).toMatchObject({ level: "campaign", time_increment: "all_days" });
          expect(params?.time_range).toBe('{"since":"2026-10-01","until":"2026-10-18"}');
          return page([
            {
              account_id: "1234567890",
              campaign_id: "campaign-one",
              date_start: "2026-10-01",
              date_stop: "2026-10-18",
              reach: "100",
              frequency: "2",
              unique_clicks: "34",
            },
          ]);
        },
        { FACEBOOK_ADS_START_DATE: "2026-10-01" },
      );
      const result = yield* backfill.fetch({ cutoff });
      expect(result.rows).toMatchObject([
        {
          id: JSON.stringify(["1234567890", "campaign-one", "2026-10-01"]),
          reach: 100n,
          frequency: 2,
          unique_clicks: 34n,
        },
      ]);
    }),
  );
  it.effect("turns insights into rows keyed by account, ad, day, and breakdowns", () =>
    Effect.gen(function* () {
      const { backfill } = yield* getResource("ads_insights_age_gender", () =>
        page([ageGenderInsight]),
      );
      const { rows } = yield* backfill.fetch({ cutoff });
      yield* encodeRows(AdInsightsAgeGenderSchema, rows);

      expect(plain(rows[0])).toMatchInlineSnapshot(`
        {
          "account_currency": "USD",
          "account_id": "1234567890",
          "action_values": {
            "purchase": 86.5,
          },
          "actions": {
            "link_click": 37,
            "offsite_conversion.fb_pixel_purchase": 2,
            "purchase": 2,
          },
          "ad_id": "120210000000001",
          "adset_id": "120205000000001",
          "age": "25-34",
          "campaign_id": "120200000000001",
          "clicks": "48n",
          "date": "2026-10-19",
          "gender": "female",
          "id": "["1234567890","120210000000001","2026-10-19","25-34","female"]",
          "impressions": "1520n",
          "inline_link_clicks": "37n",
          "reach": "1310n",
          "spend": 23.41,
          "version": "2026-10-20T17:00:00.000Z",
        }
      `);
    }),
  );

  it.effect("backfills one day at a time through the cutoff's day", () =>
    Effect.gen(function* () {
      const { backfill, requests } = yield* getResource(
        "ads_insights",
        // The first day has a second page.
        (_path, params) =>
          params.time_range?.includes("2026-10-17") && params.after === undefined
            ? page([insight("1", "2026-10-17")], "page2")
            : page([insight("2", "2026-10-17")]),
        { FACEBOOK_ADS_START_DATE: "2026-10-17" },
      );
      const cursors: Array<unknown> = [];
      let pageCursor: string | undefined;
      for (;;) {
        const result = yield* backfill.fetch({ cutoff, ...(pageCursor ? { pageCursor } : {}) });
        cursors.push(result.nextPageCursor);
        if (!result.hasMore) break;
        pageCursor = String(result.nextPageCursor);
      }

      expect({ cursors, requests: yield* requests }).toMatchInlineSnapshot(`
        {
          "cursors": [
            "{"account":"1234567890","day":"2026-10-17","after":"page2"}",
            "{"account":"1234567890","day":"2026-10-18"}",
            undefined,
          ],
          "requests": [
            "/act_1234567890/insights time_range={"since":"2026-10-17","until":"2026-10-17"}",
            "/act_1234567890/insights time_range={"since":"2026-10-17","until":"2026-10-17"} after=page2",
            "/act_1234567890/insights time_range={"since":"2026-10-18","until":"2026-10-18"}",
          ],
        }
      `);
    }),
  );

  it.effect("reads the lookback window through today, for each account", () =>
    Effect.gen(function* () {
      const { changes, requests } = yield* getResource("ads_insights_country", () => page([]), {
        FACEBOOK_ADS_ACCOUNT_IDS: "111,222",
        FACEBOOK_ADS_LOOKBACK_DAYS: "2",
      });
      const run = (first: string) =>
        Effect.gen(function* () {
          const cursors: Array<string> = [];
          let cursor = first;
          for (;;) {
            const result = yield* changes.fetch({ cursor });
            cursor = String(result.cursor);
            cursors.push(cursor);
            if (result.hasMore !== true) return cursors;
          }
        });

      expect({
        // Backfill read up to 10-18, so this run starts there again.
        afterBackfill: yield* run(cutoff),
        requests: yield* requests,
      }).toMatchInlineSnapshot(`
        {
          "afterBackfill": [
            "{"through":{"111":"2026-10-17","222":"2026-10-17"},"pending":{"account":"111","day":"2026-10-19","end":"2026-10-20"}}",
            "{"through":{"111":"2026-10-17","222":"2026-10-17"},"pending":{"account":"111","day":"2026-10-20","end":"2026-10-20"}}",
            "{"through":{"111":"2026-10-20","222":"2026-10-17"},"pending":{"account":"222","day":"2026-10-18","end":"2026-10-20"}}",
            "{"through":{"111":"2026-10-20","222":"2026-10-17"},"pending":{"account":"222","day":"2026-10-19","end":"2026-10-20"}}",
            "{"through":{"111":"2026-10-20","222":"2026-10-17"},"pending":{"account":"222","day":"2026-10-20","end":"2026-10-20"}}",
            "{"through":{"111":"2026-10-20","222":"2026-10-20"}}",
          ],
          "requests": [
            "/act_111/insights time_range={"since":"2026-10-18","until":"2026-10-18"} breakdowns=country",
            "/act_111/insights time_range={"since":"2026-10-19","until":"2026-10-19"} breakdowns=country",
            "/act_111/insights time_range={"since":"2026-10-20","until":"2026-10-20"} breakdowns=country",
            "/act_222/insights time_range={"since":"2026-10-18","until":"2026-10-18"} breakdowns=country",
            "/act_222/insights time_range={"since":"2026-10-19","until":"2026-10-19"} breakdowns=country",
            "/act_222/insights time_range={"since":"2026-10-20","until":"2026-10-20"} breakdowns=country",
          ],
        }
      `);
    }),
  );

  it.effect("checks one row of today", () =>
    Effect.gen(function* () {
      const { check, requests } = yield* getResource("ads_insights_platform", () => page([]));
      yield* check;

      expect(yield* requests).toMatchInlineSnapshot(`
        [
          "/act_1234567890/insights time_range={"since":"2026-10-20","until":"2026-10-20"} breakdowns=publisher_platform,platform_position",
        ]
      `);
    }),
  );
});

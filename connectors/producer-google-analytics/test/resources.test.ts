import { describe, expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { TestClock } from "effect/testing";

import { demo } from "../src/demo";
import { GoogleAnalyticsConnector, manifest } from "../src/index";
import { tableSchemas } from "../src/tables";
import { report, trafficSourceRows } from "./fixtures/reports";
import { type FakeReports, connectorLayer, makeFakeClient, plain } from "./helpers";

// 10:00 on 2026-10-20 in Los Angeles, so yesterday there is 2026-10-19.
const now = Date.parse("2026-10-20T17:00:00.000Z");
// 22:00 on 2026-10-15 in Los Angeles, though 2026-10-16 in UTC.
const cutoff = "2026-10-16T05:00:00.000Z";

type ResourceName = (typeof manifest.resources)[number]["name"];

const getResource = (
  name: ResourceName,
  fake: FakeReports,
  config: Readonly<Record<string, string>> = {},
) =>
  Effect.gen(function* () {
    yield* TestClock.setTime(now);
    const { client, requests } = yield* makeFakeClient(fake);
    const connector = yield* GoogleAnalyticsConnector.GoogleAnalyticsConnector.pipe(
      Effect.provide(connectorLayer(client, config)),
    );
    const resource = yield* Effect.fromOption(
      Option.fromNullishOr(connector.resources.find((item) => item.name === name)),
    );
    return {
      check: resource.check,
      backfill: yield* Effect.fromOption(Option.fromNullishOr(resource.backfill)),
      changes: yield* Effect.fromOption(Option.fromNullishOr(resource.changes)),
      requests,
    };
  });

const empty: FakeReports = (_name, request) => report(request, []);

describe("resources", () => {
  it.effect("matches the manifest and the table schemas", () =>
    Effect.gen(function* () {
      const { client } = yield* makeFakeClient(empty);
      const connector = yield* GoogleAnalyticsConnector.GoogleAnalyticsConnector.pipe(
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

  it.effect("turns report rows into typed rows keyed by property, day, and dimensions", () =>
    Effect.gen(function* () {
      const { backfill } = yield* getResource(
        "traffic_sources",
        (_name, request) => {
          const response = report(request, trafficSourceRows);
          // A truncated report only logs a warning.
          return {
            ...response,
            metadata: {
              ...response.metadata,
              dataTruncationReasons: [
                {
                  dataTruncationType: "DATA_TRUNCATION_TYPE_DATE_RANGE",
                  dataTruncationMessage: "Query date range may not be fully served.",
                },
              ],
            },
          };
        },
        { GA_START_DATE: "2026-10-14" },
      );
      const { rows } = yield* backfill.fetch({ cutoff });

      expect(plain(rows[1])).toMatchInlineSnapshot(`
        {
          "active_users": "5n",
          "currency_code": "USD",
          "date": "2026-10-19",
          "engaged_sessions": "5n",
          "event_count": "37n",
          "id": "["559759765","2026-10-19","newsletter","email","october-2026","october_launch","Email"]",
          "key_events": 2.5,
          "new_users": "2n",
          "property_id": "559759765",
          "screen_page_views": "14n",
          "session_campaign_id": "october-2026",
          "session_campaign_name": "october_launch",
          "session_default_channel_group": "Email",
          "session_medium": "email",
          "session_source": "newsletter",
          "sessions": "5n",
          "total_revenue": 128.5,
          "user_engagement_duration": 190.25,
          "version": "2026-10-20T17:00:00.000Z",
        }
      `);
    }),
  );

  it.effect("backfills one day at a time up to the day before the cutoff", () =>
    Effect.gen(function* () {
      const { backfill, requests } = yield* getResource(
        "events",
        // The first day has a second page.
        (_name, request) =>
          request.startDate === "2026-10-13" && request.offset === 0
            ? report(request, [["20261013", "page_view", "40", "12", "0", "0"]], 2)
            : report(request, [["20261013", "sign_up", "3", "3", "0", "3"]]),
        { GA_START_DATE: "2026-10-13" },
      );
      const cursors: Array<unknown> = [];
      let columns: ReadonlyArray<string> = [];
      let pageCursor: string | undefined;
      for (;;) {
        const page = yield* backfill.fetch({ cutoff, ...(pageCursor ? { pageCursor } : {}) });
        columns = Object.keys(page.rows[0] ?? {});
        cursors.push({ rows: page.rows.length, hasMore: page.hasMore, next: page.nextPageCursor });
        if (!page.hasMore) break;
        pageCursor = String(page.nextPageCursor);
      }

      // No `currency_code`: the events table has no revenue.
      expect({ cursors, columns, requests: yield* requests }).toMatchInlineSnapshot(`
        {
          "columns": [
            "id",
            "version",
            "property_id",
            "date",
            "event_name",
            "event_count",
            "total_users",
            "event_value",
            "key_events",
          ],
          "cursors": [
            {
              "hasMore": true,
              "next": "{"day":"2026-10-13","offset":1}",
              "rows": 1,
            },
            {
              "hasMore": true,
              "next": "{"day":"2026-10-14","offset":0}",
              "rows": 1,
            },
            {
              "hasMore": false,
              "next": undefined,
              "rows": 1,
            },
          ],
          "requests": [
            "events 2026-10-13..2026-10-13 +0",
            "events 2026-10-13..2026-10-13 +1",
            "events 2026-10-14..2026-10-14 +0",
          ],
        }
      `);
    }),
  );

  it.effect("starts the backfill 2 years back by default", () =>
    Effect.gen(function* () {
      const { backfill, requests } = yield* getResource("devices", empty);
      yield* backfill.fetch({ cutoff });

      expect(yield* requests).toMatchInlineSnapshot(`
        [
          "devices 2024-10-14..2024-10-14 +0",
        ]
      `);
    }),
  );

  it.effect("reads the lookback window again, and catches up after downtime", () =>
    Effect.gen(function* () {
      const { changes, requests } = yield* getResource("pages", empty, {
        GA_LOOKBACK_DAYS: "3",
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
        // Backfill read up to 2026-10-14, so this run catches up from 10-15.
        afterBackfill: yield* run(cutoff),
        // Next run: only the last 3 days.
        next: (yield* run(JSON.stringify({ through: "2026-10-19" }))).length,
        requests: yield* requests,
      }).toMatchInlineSnapshot(`
        {
          "afterBackfill": [
            "{"through":"2026-10-14","pending":{"day":"2026-10-16","end":"2026-10-19","offset":0}}",
            "{"through":"2026-10-14","pending":{"day":"2026-10-17","end":"2026-10-19","offset":0}}",
            "{"through":"2026-10-14","pending":{"day":"2026-10-18","end":"2026-10-19","offset":0}}",
            "{"through":"2026-10-14","pending":{"day":"2026-10-19","end":"2026-10-19","offset":0}}",
            "{"through":"2026-10-19"}",
          ],
          "next": 3,
          "requests": [
            "pages 2026-10-15..2026-10-15 +0",
            "pages 2026-10-16..2026-10-16 +0",
            "pages 2026-10-17..2026-10-17 +0",
            "pages 2026-10-18..2026-10-18 +0",
            "pages 2026-10-19..2026-10-19 +0",
            "pages 2026-10-17..2026-10-17 +0",
            "pages 2026-10-18..2026-10-18 +0",
            "pages 2026-10-19..2026-10-19 +0",
          ],
        }
      `);
    }),
  );

  it.effect("checks one row of yesterday", () =>
    Effect.gen(function* () {
      const { check, requests } = yield* getResource("locations", empty);
      yield* check;
      const bad = yield* getResource("locations", empty, { GA_START_DATE: "14/10/2026" });

      expect({
        requests: yield* requests,
        badStartDate: yield* bad.check.pipe(
          Effect.flip,
          Effect.map((error) => error.message),
        ),
      }).toMatchInlineSnapshot(`
        {
          "badStartDate": "GA_START_DATE must be YYYY-MM-DD",
          "requests": [
            "locations 2026-10-19..2026-10-19 +0",
          ],
        }
      `);
    }),
  );

  it.effect("reads a first-session cohort only after the full retention window", () =>
    Effect.gen(function* () {
      const { backfill, requests } = yield* getResource(
        "cohort_retention",
        (_, request) => report(request, [["cohort_0", "0007", "15", "50"]]),
        { GA_START_DATE: "2026-10-07" },
      );
      const page = yield* backfill.fetch({ cutoff });
      expect(plain(page.rows)).toMatchObject([
        {
          date: "2026-10-07",
          day_offset: "0007",
          active_users: "15n",
          total_users: "50n",
        },
      ]);
      expect(page.hasMore).toBe(false);
      expect(yield* requests).toEqual(["cohort_retention 2026-10-07..2026-10-07 +0"]);
    }),
  );
});

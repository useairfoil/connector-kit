import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { TestClock } from "effect/testing";

import { makeMeterSummaries } from "../src/resources/meter-summaries";
import { makeFakeClient } from "./helpers";

it.effect("revisits a closed day for late usage and keeps its scan window on resume", () =>
  Effect.gen(function* () {
    const cutoff = "2026-11-03T12:00:00.000Z";
    const readAt = "2026-11-04T12:00:00.000Z";
    const start = Date.parse("2026-11-02T00:00:00Z") / 1000;
    yield* TestClock.setTime(Date.parse(readAt));
    const { client } = yield* makeFakeClient({
      list: (path, params) => {
        const { starting_after: after } = Object.fromEntries(params);
        if (path === "subscriptions") {
          const subscription = {
            id: "sub_1",
            customer: "cus_1",
            created: start,
            ended_at: null,
            items: { data: [{ price: { recurring: { meter: "meter_1" } } }] },
          };
          return { data: after ? [] : [subscription], has_more: false };
        }
        return {
          data: [
            {
              id: "summary_1",
              meter: "meter_1",
              start_time: start,
              end_time: start + 86_400,
              aggregated_value: after ? 15 : 12,
              livemode: false,
            },
          ],
          has_more: !after,
        };
      },
    });
    const changes = makeMeterSummaries(client).changes!;
    const first = yield* changes.fetch({ cursor: cutoff });
    yield* TestClock.setTime(Date.parse("2026-11-05T12:00:00.000Z"));
    const resumed = yield* changes.fetch({ cursor: first.cursor });
    expect(resumed.rows).toMatchObject([
      {
        id: "summary_1",
        customer: "cus_1",
        aggregated_value: 15,
      },
    ]);
  }),
);

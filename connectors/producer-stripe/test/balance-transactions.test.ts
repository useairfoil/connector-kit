import { describe, expect, it } from "@effect/vitest";
import { Effect, Ref } from "effect";
import { TestClock } from "effect/testing";

import { makeBalanceTransactions } from "../src/resources/balance-transactions";
import { makeFakeClient } from "./helpers";

const cutoff = "2026-10-03T11:00:00.000Z";
const now = Date.parse("2026-10-03T12:00:00.000Z");
const previous = Math.floor(Date.parse(cutoff) / 1000);
const transaction = (id: string, created: number, status: "pending" | "available") => ({
  id,
  created,
  available_on: previous + 60,
  status,
  amount: 1_000,
  fee: 59,
  net: 941,
  fee_details: [],
  currency: "usd",
  exchange_rate: null,
  source: "ch_example",
  type: "charge",
  reporting_category: "charge",
  description: null,
});

describe("balance transactions", () => {
  it.effect("re-lists from the oldest pending entry once a day", () =>
    Effect.gen(function* () {
      yield* TestClock.setTime(now);
      const older = transaction("txn_old", previous - 300, "pending");
      const settled = { ...older, status: "available" };
      const newer = transaction("txn_new", previous + 1, "available");
      const { client, requests } = yield* makeFakeClient({
        list: (_, params) => {
          const query = Object.fromEntries(params);
          if (query["created[gte]"] === String(older.created)) {
            return { data: [settled], has_more: false };
          }
          if (query["created[gte]"] === undefined) return { data: [older], has_more: false };
          return query.starting_after === undefined
            ? { data: [newer], has_more: true }
            : { data: [older], has_more: false };
        },
      });
      const ledger = makeBalanceTransactions(client);
      const history = yield* ledger.backfill!.fetch({ cutoff });
      expect(history.rows[0]).toMatchObject({ id: older.id, status: "pending", net: 941n });

      // The first run looks back 90 days for pending entries.
      const page1 = yield* ledger.changes!.fetch({ cursor: cutoff });
      const page2 = yield* ledger.changes!.fetch({ cursor: page1.cursor });
      expect([page1.hasMore, page2.hasMore]).toEqual([true, false]);
      expect(page2.rows.map(({ id }) => id)).toEqual([older.id]);

      yield* TestClock.setTime(now + 86_400_000);
      const recheck = yield* ledger.changes!.fetch({ cursor: page2.cursor });
      expect(recheck.rows[0]).toMatchObject({ id: older.id, status: "available" });

      const paths = yield* Ref.get(requests);
      expect(paths.slice(1)).toEqual([
        `balance_transactions?limit=100&created[lte]=${previous + 3570}&created[gte]=${previous - 90 * 86_400}`,
        `balance_transactions?limit=100&created[lte]=${previous + 3570}&created[gte]=${previous - 90 * 86_400}&starting_after=${newer.id}`,
        `balance_transactions?limit=100&created[lte]=${previous + 90_000 - 30}&created[gte]=${older.created}`,
      ]);
    }),
  );
});

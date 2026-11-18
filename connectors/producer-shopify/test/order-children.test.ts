import { expect, it } from "@effect/vitest";
import { ConnectorError } from "@useairfoil/connector-kit";
import { Effect, Schema } from "effect";
import { TestClock } from "effect/testing";

import type { ShopifyApiClientService } from "../src/api/client";

import { makeOrderTransactions } from "../src/resources/order-children";

it.effect("reads orders updated in the window, resuming its pages", () =>
  Effect.gen(function* () {
    const queries: Array<unknown> = [];
    const fetchGraphQL: ShopifyApiClientService["fetchGraphQL"] = ({ schema, variables }) =>
      Effect.suspend(() => {
        queries.push(variables);
        return Schema.decodeUnknownEffect(schema)({
          orders:
            variables?.after === undefined
              ? { nodes: [], pageInfo: { hasNextPage: true, endCursor: "next" } }
              : { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } },
        }).pipe(
          Effect.mapError(
            (cause) => new ConnectorError({ message: "Invalid order fixture", cause }),
          ),
        );
      });
    yield* TestClock.setTime(Date.parse("2026-10-03T13:00:00.000Z"));
    const { changes } = makeOrderTransactions({ fetchGraphQL });

    const first = yield* changes!.fetch({ cursor: "2026-10-03T12:00:00.000Z" });
    const last = yield* changes!.fetch({ cursor: first.cursor });

    expect({ queries, cursors: [first.cursor, last.cursor] }).toMatchInlineSnapshot(`
      {
        "cursors": [
          "{"since":"2026-10-03T12:00:00.000Z","until":"2026-10-03T13:00:00.000Z","after":"next"}",
          "{"since":"2026-10-03T13:00:00.000Z"}",
        ],
        "queries": [
          {
            "after": undefined,
            "first": 25,
            "query": "updated_at:>='2026-10-03T11:59:00.000Z' updated_at:<='2026-10-03T13:00:00.000Z'",
          },
          {
            "after": "next",
            "first": 25,
            "query": "updated_at:>='2026-10-03T11:59:00.000Z' updated_at:<='2026-10-03T13:00:00.000Z'",
          },
        ],
      }
    `);
  }),
);

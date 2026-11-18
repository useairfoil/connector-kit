import { ConnectorError, Cursor, Fetch, Resource } from "@useairfoil/connector-kit";
import { DateTime, Effect, Option, Schema } from "effect";

import type { StripeClientService, StripeParams } from "../client/client";

import {
  BalanceTransactionObjectSchema,
  BalanceTransactionSchema,
} from "../schemas/balance-transactions";
import { changesInterval, parseTime, startingAfter } from "./shared";

const path = "balance_transactions";
const pageSize = "100";
const settleSeconds = 30;
const day = 86_400;
// Stripe sends no event when funds become available. The first run looks for
// pending rows this far back, and later runs re-list from the oldest one daily.
const pendingWindow = 90 * day;

const LedgerCursor = Schema.fromJsonString(
  Schema.Struct({
    from: Schema.Int,
    pendingSince: Schema.optional(Schema.Int),
    recheckedAt: Schema.Int,
    window: Schema.optional(
      Schema.Struct({
        start: Schema.Int,
        through: Schema.Int,
        after: Schema.String,
        oldestPending: Schema.optional(Schema.Int),
      }),
    ),
  }),
);

const cutoffSeconds = (value: unknown) =>
  parseTime(String(value), "Stripe ledger cutoff").pipe(
    Effect.map((time) => Math.floor(DateTime.toEpochMillis(time) / 1000)),
  );

const min = (a: number | undefined, b: number | undefined) =>
  a === undefined ? b : b === undefined ? a : Math.min(a, b);

const readPage = (client: StripeClientService, through: number, after?: string, from?: number) =>
  Effect.gen(function* () {
    const params: StripeParams = [
      ["limit", pageSize],
      ["created[lte]", String(through)],
      ...(from === undefined ? [] : [["created[gte]", String(from)] as const]),
      ...startingAfter(Option.fromNullishOr(after)),
    ];
    const page = yield* client.list(BalanceTransactionObjectSchema, path, params);
    return { ...page, next: page.hasMore ? page.items.at(-1)?.id : undefined };
  });

const decodeCursor = (cursor: string) =>
  cursor.startsWith("{")
    ? Schema.decodeUnknownEffect(LedgerCursor)(cursor).pipe(
        Effect.mapError(
          (cause) => new ConnectorError({ message: "Invalid Stripe ledger cursor", cause }),
        ),
      )
    : cutoffSeconds(cursor).pipe(
        Effect.map((through): typeof LedgerCursor.Type => ({
          from: through + 1,
          pendingSince: through - pendingWindow,
          recheckedAt: 0,
        })),
      );

const encodeCursor = (cursor: typeof LedgerCursor.Type) =>
  Schema.encodeEffect(LedgerCursor)(cursor).pipe(
    Effect.mapError(
      (cause) => new ConnectorError({ message: "Could not encode Stripe ledger cursor", cause }),
    ),
  );

export const makeBalanceTransactions = (client: StripeClientService) =>
  Resource.entity({
    name: "balance_transactions",
    rowSchema: BalanceTransactionSchema,
    version: "version",
    check: client.list(BalanceTransactionObjectSchema, path, [["limit", "1"]]).pipe(Effect.asVoid),
    backfill: Fetch.page({
      pageCursor: Cursor.string(),
      cutoff: Cursor.isoDateTime(),
      fetch: ({ cutoff, pageCursor }) =>
        Effect.gen(function* () {
          const through = yield* cutoffSeconds(cutoff);
          const page = yield* readPage(
            client,
            through,
            typeof pageCursor === "string" ? pageCursor : undefined,
          );
          return {
            rows: page.items.map((item) => ({ ...item, version: page.fetchedAt })),
            nextPageCursor: page.next,
            hasMore: page.hasMore,
          };
        }),
    }),
    changes: Fetch.changes({
      cursor: Cursor.string(),
      interval: changesInterval,
      fetch: ({ cursor }) =>
        Effect.gen(function* () {
          const state = yield* decodeCursor(String(cursor));
          const now = Math.floor((yield* DateTime.nowAsDate).getTime() / 1000) - settleSeconds;
          const through = state.window?.through ?? now;
          const due = through - state.recheckedAt >= day ? state.pendingSince : undefined;
          const start = state.window?.start ?? Math.min(due ?? state.from, state.from);
          if (through < start) return { rows: [], cursor: String(cursor), hasMore: false };

          const page = yield* readPage(client, through, state.window?.after, start);
          const oldestPending = page.items.reduce(
            (oldest, item) =>
              item.status === "pending"
                ? min(oldest, Math.floor(item.created.getTime() / 1000))
                : oldest,
            state.window?.oldestPending,
          );
          const rows = page.items.map((item) => ({ ...item, version: page.fetchedAt }));
          if (page.next !== undefined) {
            return {
              rows,
              cursor: yield* encodeCursor({
                ...state,
                window: { start, through, after: page.next, oldestPending },
              }),
              hasMore: true,
            };
          }
          // A window that started before `from` re-listed every pending row.
          const rechecked = start < state.from;
          return {
            rows,
            cursor: yield* encodeCursor({
              from: through + 1,
              pendingSince: rechecked ? oldestPending : min(state.pendingSince, oldestPending),
              recheckedAt: rechecked ? through : state.recheckedAt,
            }),
            hasMore: false,
          };
        }),
    }),
  });

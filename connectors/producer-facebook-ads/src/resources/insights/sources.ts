import { ConnectorError, Cursor, Fetch } from "@useairfoil/connector-kit";
import { DateTime, Duration, Effect, Option, Schema } from "effect";

import type { FacebookAdsClientService } from "../../client/client";
import type { FacebookAdsConfig } from "../../manifest";
import type { TimeZoneOf } from "../accounts";
import type { InsightsItem, InsightsSpec } from "./spec";

import { readDay } from "./read";

// Meta refreshes insights every 15 minutes, but most changes are late
// attribution, so a few runs a day is enough.
const changesInterval = Duration.hours(6);

type InsightsConfig = Pick<FacebookAdsConfig, "startDate" | "lookbackDays">;

export type InsightsContext = {
  readonly client: FacebookAdsClientService;
  readonly config: InsightsConfig;
  readonly accounts: ReadonlyArray<string>;
  readonly timeZoneOf: TimeZoneOf;
};

const Day = Schema.String.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/));

const addDays = (day: string, days: number) =>
  DateTime.formatIsoDateUtc(DateTime.add(DateTime.makeUnsafe(day), { days }));

/** The calendar day of `time` in the account's time zone. */
const dayIn = (zone: DateTime.TimeZone, time: DateTime.DateTime) =>
  DateTime.formatIsoDate(DateTime.setZone(time, zone));

const minDay = (a: string, b: string) => (a < b ? a : b);
const maxDay = (a: string, b: string) => (a > b ? a : b);

const monthStart = (day: string) =>
  DateTime.formatIsoDateUtc(DateTime.startOf(DateTime.makeUnsafe(day), "month"));

const periodEnd = (day: string, end: string, monthly: boolean | undefined) =>
  monthly
    ? minDay(DateTime.formatIsoDateUtc(DateTime.endOf(DateTime.makeUnsafe(day), "month")), end)
    : day;

/**
 * The first day to read. Meta keeps 37 months of insights, so older days
 * move up to the oldest one it allows.
 */
const startDay = (config: InsightsConfig, today: string) =>
  Option.match(config.startDate, {
    onNone: () =>
      Effect.succeed(
        DateTime.formatIsoDateUtc(DateTime.add(DateTime.makeUnsafe(today), { years: -2 })),
      ),
    onSome: (startDate) =>
      Schema.decodeUnknownEffect(Day)(startDate).pipe(
        Effect.mapError(
          (cause) =>
            new ConnectorError({ message: "FACEBOOK_ADS_START_DATE must be YYYY-MM-DD", cause }),
        ),
      ),
  }).pipe(
    Effect.map((day) =>
      maxDay(
        day,
        addDays(
          DateTime.formatIsoDateUtc(DateTime.add(DateTime.makeUnsafe(today), { months: -37 })),
          1,
        ),
      ),
    ),
  );

const cursorError = (cause: Schema.SchemaError) =>
  new ConnectorError({ message: "Invalid Facebook Ads cursor", cause });

const PositionSchema = Schema.Struct({
  account: Schema.String,
  day: Day,
  after: Schema.optional(Schema.String),
});

type Position = Schema.Schema.Type<typeof PositionSchema>;

const PageCursorSchema = Schema.fromJsonString(PositionSchema);

/**
 * `through` is the last day fully read, per account ID. `pending` is set while
 * a run is split: where to go on from, and the last day for that account.
 */
const ChangesCursorSchema = Schema.Struct({
  through: Schema.Record(Schema.String, Day),
  pending: Schema.optional(Schema.Struct({ ...PositionSchema.fields, end: Day })),
});

type ChangesCursor = Schema.Schema.Type<typeof ChangesCursorSchema>;
type Window = NonNullable<ChangesCursor["pending"]>;

// The first cursor is the backfill cutoff, a plain ISO time.
const ChangesCursorCodec = Schema.Union([
  Schema.fromJsonString(ChangesCursorSchema),
  Schema.DateTimeUtcFromString,
]);

const nextInDay = (at: Position, next: Option.Option<string>, until: string, end: string) =>
  Option.match(next, {
    onSome: (after) => Option.some({ account: at.account, day: at.day, after }),
    onNone: () =>
      until < end ? Option.some({ account: at.account, day: addDays(until, 1) }) : Option.none(),
  });

export const insightsCheck = <A extends InsightsItem, Row extends object>(
  context: InsightsContext,
  spec: InsightsSpec<A, Row>,
) =>
  Effect.gen(function* () {
    const account = context.accounts[0] ?? "";
    const today = dayIn(yield* context.timeZoneOf(account), yield* DateTime.now);

    yield* startDay(context.config, today);
    yield* readDay(context.client, spec, account, { day: today, limit: 1 });
  });

/** Reads each account from the start day through the cutoff's day. */
export const insightsBackfill = <A extends InsightsItem, Row extends object>(
  context: InsightsContext,
  spec: InsightsSpec<A, Row>,
) =>
  Fetch.page({
    pageCursor: Cursor.string(),
    cutoff: Cursor.isoDateTime(),
    fetch: ({ pageCursor, cutoff }) =>
      Effect.gen(function* () {
        const cutoffTime = yield* Schema.decodeUnknownEffect(Schema.DateTimeUtcFromString)(
          String(cutoff),
        ).pipe(Effect.mapError(cursorError));
        const lastDay = (account: string) =>
          context.timeZoneOf(account).pipe(Effect.map((zone) => dayIn(zone, cutoffTime)));
        const firstOf = (index: number) =>
          Effect.gen(function* () {
            const account = context.accounts[index];
            if (account === undefined) return Option.none<Position>();

            const day = yield* startDay(context.config, yield* lastDay(account));
            return Option.some({ account, day });
          });

        const at =
          pageCursor === undefined
            ? yield* firstOf(0)
            : Option.some(
                yield* Schema.decodeUnknownEffect(PageCursorSchema)(String(pageCursor)).pipe(
                  Effect.mapError(cursorError),
                ),
              );
        if (Option.isNone(at)) return { rows: [], hasMore: false };

        const position = at.value;
        const index = context.accounts.indexOf(position.account);

        // An account removed from the config isn't read, and backfill starts over.
        const result =
          index === -1
            ? { rows: [], next: yield* firstOf(0) }
            : yield* Effect.gen(function* () {
                const end = yield* lastDay(position.account);
                const until = periodEnd(position.day, end, spec.monthly);
                const page =
                  position.day > end
                    ? { rows: [], next: Option.none<string>() }
                    : yield* readDay(context.client, spec, position.account, {
                        ...position,
                        until,
                      });
                const inDay = nextInDay(position, page.next, until, end);

                return {
                  rows: page.rows,
                  next: Option.isSome(inDay) ? inDay : yield* firstOf(index + 1),
                };
              });
        if (Option.isNone(result.next)) return { rows: result.rows, hasMore: false };

        return {
          rows: result.rows,
          hasMore: true,
          nextPageCursor: yield* Schema.encodeEffect(PageCursorSchema)(result.next.value).pipe(
            Effect.mapError(cursorError),
          ),
        };
      }),
  });

/**
 * Reads the last `lookbackDays` through today again on every run, since Meta
 * keeps updating recent days. After downtime it also reads the days it missed.
 */
export const insightsChanges = <A extends InsightsItem, Row extends object>(
  context: InsightsContext,
  spec: InsightsSpec<A, Row>,
) =>
  Fetch.changes({
    cursor: Cursor.string(),
    interval: changesInterval,
    fetch: ({ cursor }) =>
      Effect.gen(function* () {
        const now = yield* DateTime.now;
        const today = (account: string) =>
          context.timeZoneOf(account).pipe(Effect.map((zone) => dayIn(zone, now)));

        const decoded = yield* Schema.decodeUnknownEffect(ChangesCursorCodec)(String(cursor)).pipe(
          Effect.mapError(cursorError),
        );

        // Backfill read through the cutoff's day, which may have been partial.
        const state: ChangesCursor = DateTime.isDateTime(decoded)
          ? {
              through: Object.fromEntries(
                yield* Effect.forEach(context.accounts, (account) =>
                  context
                    .timeZoneOf(account)
                    .pipe(
                      Effect.map((zone) => [account, addDays(dayIn(zone, decoded), -1)] as const),
                    ),
                ),
              ),
            }
          : decoded;

        /** The days to read for one account. A new account starts from the start day. */
        const windowOf = (index: number) =>
          Effect.gen(function* () {
            const account = context.accounts[index];
            if (account === undefined) return Option.none<Window>();

            const end = yield* today(account);
            const start = yield* startDay(context.config, end);
            const through = state.through[account] ?? addDays(start, -1);
            const day = minDay(addDays(through, 1), addDays(end, 1 - context.config.lookbackDays));
            // Monthly rows are keyed by their first day, so read whole months.
            return Option.some({
              account,
              day: spec.monthly ? maxDay(monthStart(day), start) : day,
              end,
            });
          });

        // A run split on an account removed from the config starts over.
        const pending =
          state.pending !== undefined && context.accounts.includes(state.pending.account)
            ? state.pending
            : Option.getOrUndefined(yield* windowOf(0));
        if (pending === undefined) return { rows: [], cursor: String(cursor) };
        const account = pending.account;

        const until = periodEnd(pending.day, pending.end, spec.monthly);
        const page = yield* readDay(context.client, spec, account, { ...pending, until });
        const inDay = nextInDay(pending, page.next, until, pending.end);
        const next: ChangesCursor = Option.isSome(inDay)
          ? { through: state.through, pending: { ...inDay.value, end: pending.end } }
          : yield* Effect.gen(function* () {
              const through = { ...state.through, [account]: pending.end };
              const following = yield* windowOf(context.accounts.indexOf(account) + 1);

              return Option.match(following, {
                onSome: (window) => ({ through, pending: window }),
                onNone: () => ({ through }),
              });
            });

        return {
          rows: page.rows,
          cursor: yield* Schema.encodeEffect(Schema.fromJsonString(ChangesCursorSchema))(next).pipe(
            Effect.mapError(cursorError),
          ),
          hasMore: next.pending !== undefined,
        };
      }),
  });

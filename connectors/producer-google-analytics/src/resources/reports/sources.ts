import { ConnectorError, Cursor, Fetch } from "@useairfoil/connector-kit";
import { DateTime, Duration, Effect, Option, Schema } from "effect";

import type { GoogleAnalyticsClientService } from "../../client/client";
import type { GoogleAnalyticsConfig } from "../../manifest";
import type { ReportSpec } from "./spec";

import { readDay } from "./read";

// Daily data is ready about 12 hours after the day ends, so polling more often
// mostly reads the same numbers.
const changesInterval = Duration.hours(6);

type ReportConfig = Pick<GoogleAnalyticsConfig, "propertyId" | "startDate" | "lookbackDays">;

const Day = Schema.String.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/));

const addDays = (day: string, days: number) =>
  DateTime.formatIsoDateUtc(DateTime.add(DateTime.makeUnsafe(day), { days }));

/** The calendar day of `time` in the property's time zone. */
const dayIn = (zone: DateTime.TimeZone, time: DateTime.DateTime) =>
  DateTime.formatIsoDate(DateTime.setZone(time, zone));

const minDay = (a: string, b: string) => (a < b ? a : b);

/** Reports cover whole days, so backfill ends the day before the cutoff. */
const lastBackfillDay = (zone: DateTime.TimeZone, cutoff: DateTime.Utc, lag = 0) =>
  addDays(dayIn(zone, cutoff), -1 - lag);

// The API rejects earlier days.
const firstDay = "2015-08-14";

const startDay = (config: ReportConfig, end: string) =>
  Option.match(config.startDate, {
    onNone: () =>
      Effect.succeed(
        DateTime.formatIsoDateUtc(DateTime.add(DateTime.makeUnsafe(end), { years: -2 })),
      ),
    onSome: (startDate) =>
      Schema.decodeUnknownEffect(Day)(startDate).pipe(
        Effect.mapError(
          (cause) => new ConnectorError({ message: "GA_START_DATE must be YYYY-MM-DD", cause }),
        ),
      ),
  }).pipe(Effect.map((day) => (day < firstDay ? firstDay : day)));

const cursorError = (cause: Schema.SchemaError) =>
  new ConnectorError({ message: "Invalid Google Analytics cursor", cause });

const PageCursorSchema = Schema.fromJsonString(Schema.Struct({ day: Day, offset: Schema.Int }));

/**
 * `through` is the last day fully read. `pending` is set while a run is split:
 * the day and offset to go on from, and the last day of that run.
 */
const ChangesCursorSchema = Schema.Struct({
  through: Day,
  pending: Schema.optional(Schema.Struct({ day: Day, end: Day, offset: Schema.Int })),
});

type ChangesCursor = Schema.Schema.Type<typeof ChangesCursorSchema>;

// The first cursor is the backfill cutoff, a plain ISO time.
const ChangesCursorCodec = Schema.Union([
  Schema.fromJsonString(ChangesCursorSchema),
  Schema.DateTimeUtcFromString,
]);

export const reportCheck = <Row extends object>(
  client: GoogleAnalyticsClientService,
  config: ReportConfig,
  spec: ReportSpec<Row>,
) =>
  Effect.gen(function* () {
    const zone = yield* client.timeZone;
    const yesterday = lastBackfillDay(zone, yield* DateTime.now, spec.cohortEndOffset);
    yield* startDay(config, yesterday);
    yield* readDay(client, config.propertyId, spec, { day: yesterday, offset: 0, limit: 1 });
  });

export const reportBackfill = <Row extends object>(
  client: GoogleAnalyticsClientService,
  config: ReportConfig,
  spec: ReportSpec<Row>,
) =>
  Fetch.page({
    pageCursor: Cursor.string(),
    cutoff: Cursor.isoDateTime(),
    fetch: ({ pageCursor, cutoff }) =>
      Effect.gen(function* () {
        const zone = yield* client.timeZone;
        const cutoffTime = yield* Schema.decodeUnknownEffect(Schema.DateTimeUtcFromString)(
          String(cutoff),
        ).pipe(Effect.mapError(cursorError));
        const end = lastBackfillDay(zone, cutoffTime, spec.cohortEndOffset);
        const at =
          pageCursor === undefined
            ? { day: yield* startDay(config, end), offset: 0 }
            : yield* Schema.decodeUnknownEffect(PageCursorSchema)(String(pageCursor)).pipe(
                Effect.mapError(cursorError),
              );
        if (at.day > end) return { rows: [], hasMore: false };

        const page = yield* readDay(client, config.propertyId, spec, at);
        const next = Option.match(page.next, {
          onSome: (offset) => ({ day: at.day, offset }),
          onNone: () => ({ day: addDays(at.day, 1), offset: 0 }),
        });
        if (next.day > end) return { rows: page.rows, hasMore: false };
        return {
          rows: page.rows,
          hasMore: true,
          nextPageCursor: yield* Schema.encodeEffect(PageCursorSchema)(next).pipe(
            Effect.mapError(cursorError),
          ),
        };
      }),
  });

/**
 * Reads the last `lookbackDays` again on every run, since Google keeps
 * updating recent days. After downtime it also reads the days it missed.
 */
export const reportChanges = <Row extends object>(
  client: GoogleAnalyticsClientService,
  config: ReportConfig,
  spec: ReportSpec<Row>,
) =>
  Fetch.changes({
    cursor: Cursor.string(),
    interval: changesInterval,
    fetch: ({ cursor }) =>
      Effect.gen(function* () {
        const zone = yield* client.timeZone;
        const decoded = yield* Schema.decodeUnknownEffect(ChangesCursorCodec)(String(cursor)).pipe(
          Effect.mapError(cursorError),
        );
        const state: ChangesCursor = DateTime.isDateTime(decoded)
          ? { through: lastBackfillDay(zone, decoded, spec.cohortEndOffset) }
          : decoded;
        const yesterday = lastBackfillDay(zone, yield* DateTime.now, spec.cohortEndOffset);
        const window = state.pending ?? {
          day: minDay(addDays(state.through, 1), addDays(yesterday, 1 - config.lookbackDays)),
          end: yesterday,
          offset: 0,
        };

        const page = yield* readDay(client, config.propertyId, spec, window);
        const pending = Option.match(page.next, {
          onSome: (offset) => Option.some({ ...window, offset }),
          onNone: () =>
            window.day < window.end
              ? Option.some({ ...window, day: addDays(window.day, 1), offset: 0 })
              : Option.none(),
        });
        const next: ChangesCursor = Option.match(pending, {
          onSome: (pending) => ({ through: state.through, pending }),
          onNone: () => ({ through: window.end }),
        });
        return {
          rows: page.rows,
          cursor: yield* Schema.encodeEffect(Schema.fromJsonString(ChangesCursorSchema))(next).pipe(
            Effect.mapError(cursorError),
          ),
          hasMore: Option.isSome(pending),
        };
      }),
  });

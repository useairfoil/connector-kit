import { type ConnectorError, Cursor, Fetch } from "@useairfoil/connector-kit";
import { DateTime, Duration, Effect, type Schema } from "effect";

import type { ZendeskClientService } from "../client/client";

const changesInterval = Duration.minutes(5);

const millis = (time: string) => DateTime.toEpochMillis(DateTime.makeUnsafe(time));

// Zendesk leaves out the latest minute. Overlap the cutoff to catch it.
const firstStartTime = (cutoff: string) =>
  String(Math.floor((millis(cutoff) - Duration.toMillis(Duration.minutes(1))) / 1000));

// Only the cutoff is an ISO time. A cursor such as `1` also parses as a date.
const isCutoff = (cursor: string) => /^\d{4}-\d{2}-\d{2}T/.test(cursor);

type ExportOptions<Page, Row> = {
  readonly client: ZendeskClientService;
  readonly path: string;
  readonly schema: Schema.Decoder<Page>;
  readonly params?: Readonly<Record<string, string>>;
  readonly rows: (page: Page) => Effect.Effect<ReadonlyArray<Row>, ConnectorError>;
};

const check = <Page, Row>(options: ExportOptions<Page, Row>): Effect.Effect<void, ConnectorError> =>
  options.client
    .get(options.schema, options.path, { ...options.params, start_time: "0", per_page: "1" })
    .pipe(Effect.asVoid);

export const cursorExport = <
  Page extends { readonly after_cursor: string | null; readonly end_of_stream: boolean },
  Row extends object,
>(
  options: ExportOptions<Page, Row>,
) => {
  const read = (params: Readonly<Record<string, string>>) =>
    options.client
      .get(options.schema, options.path, { ...options.params, ...params })
      .pipe(
        Effect.flatMap((page) => options.rows(page).pipe(Effect.map((rows) => ({ page, rows })))),
      );

  return {
    check: check(options),
    backfill: Fetch.page({
      pageCursor: Cursor.string(),
      cutoff: Cursor.isoDateTime(),
      fetch: ({ pageCursor }) =>
        read(pageCursor === undefined ? { start_time: "0" } : { cursor: String(pageCursor) }).pipe(
          Effect.map(({ page, rows }) =>
            page.end_of_stream || page.after_cursor === null
              ? { rows, hasMore: false }
              : { rows, hasMore: true, nextPageCursor: page.after_cursor },
          ),
        ),
    }),
    changes: Fetch.changes({
      cursor: Cursor.string(),
      interval: changesInterval,
      fetch: ({ cursor }) => {
        const value = String(cursor);
        return read(
          isCutoff(value) ? { start_time: firstStartTime(value) } : { cursor: value },
        ).pipe(
          Effect.map(({ page, rows }) => ({
            rows,
            cursor: page.after_cursor ?? value,
            hasMore: !page.end_of_stream,
          })),
        );
      },
    }),
  };
};

// end_time is the next start_time, and edge rows can repeat. Stop when it
// doesn't move, or Talk loops on its last row.
export const timeExport = <
  Page extends { readonly end_time: number | null; readonly end_of_stream: boolean },
  Row extends object,
>(
  options: ExportOptions<Page, Row>,
) => {
  const read = (startTime: string) =>
    options.client
      .get(options.schema, options.path, { ...options.params, start_time: startTime })
      .pipe(
        Effect.flatMap((page) => options.rows(page).pipe(Effect.map((rows) => ({ page, rows })))),
      );

  return {
    check: check(options),
    backfill: Fetch.page({
      pageCursor: Cursor.string(),
      cutoff: Cursor.isoDateTime(),
      fetch: ({ pageCursor, cutoff }) => {
        const startTime = pageCursor === undefined ? "0" : String(pageCursor);
        return read(startTime).pipe(
          Effect.map(({ page, rows }) => {
            const hasMore =
              !page.end_of_stream &&
              page.end_time !== null &&
              String(page.end_time) !== startTime &&
              page.end_time * 1000 < millis(String(cutoff));
            return {
              rows,
              hasMore,
              ...(hasMore ? { nextPageCursor: String(page.end_time) } : {}),
            };
          }),
        );
      },
    }),
    changes: Fetch.changes({
      cursor: Cursor.string(),
      interval: changesInterval,
      fetch: ({ cursor }) => {
        const value = String(cursor);
        const startTime = isCutoff(value) ? firstStartTime(value) : value;
        return read(startTime).pipe(
          Effect.map(({ page, rows }) => ({
            rows,
            cursor: page.end_time === null ? startTime : String(page.end_time),
            hasMore: !page.end_of_stream && String(page.end_time) !== startTime,
          })),
        );
      },
    }),
  };
};

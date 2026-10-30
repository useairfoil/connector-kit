import { ConnectorError, Cursor, Fetch } from "@useairfoil/connector-kit";
import {
  Array as Arr,
  DateTime,
  Duration,
  Effect,
  Order,
  Schema,
  SchemaTransformation,
} from "effect";

import type { SalesforceClientService } from "../client/client";
import type { ObjectRow } from "../schemas/objects";
import type { Describer, ObjectInfo } from "./describe";

import { DeletedSchema, IdQuerySchema, UpdatedSchema } from "../schemas/api";
import { readBatchSize, readRows } from "./read";

const maxPagesPerRun = 20;
// `getDeleted` only goes back 15 days.
const maxWindow = Duration.days(15);
const fullReadInterval = Duration.hours(1);

export type DeleteRow = {
  readonly id: string;
  readonly version: Date;
  readonly _deleted: true;
};

export const invalid = (message: string) => (cause: unknown) =>
  new ConnectorError({ message, cause });

const idPage = (
  client: SalesforceClientService,
  object: string,
  info: ObjectInfo,
  after: string | undefined,
) => {
  const where = [
    ...(info.hasIsDeleted ? ["IsDeleted = false"] : []),
    ...(after === undefined ? [] : [`Id > '${after}'`]),
  ];
  const q = `SELECT Id FROM ${object}${where.length === 0 ? "" : ` WHERE ${where.join(" AND ")}`} ORDER BY Id LIMIT ${readBatchSize}`;
  // `queryAll` also returns archived tasks and events, which `query` skips.
  return client.get(IdQuerySchema, "/queryAll", { q }).pipe(
    Effect.map(({ body }) => ({
      ids: body.records.map((record) => record.Id),
      // A batch can stop short of the limit before the query is done.
      hasMore: !body.done || body.records.length === readBatchSize,
    })),
  );
};

/** Reads every record, page by page in ID order. The page cursor is the last ID. */
export const objectBackfill = (
  client: SalesforceClientService,
  describer: Describer,
  object: string,
) =>
  Fetch.page({
    pageCursor: Cursor.string(),
    cutoff: Cursor.isoDateTime(),
    // No cutoff filter: some objects have no `CreatedDate`. Changes read
    // records created during the backfill again, which is harmless.
    fetch: ({ pageCursor }) =>
      Effect.gen(function* () {
        const info = yield* describer.describe(object);
        const page = yield* idPage(
          client,
          object,
          info,
          typeof pageCursor === "string" ? pageCursor : undefined,
        );
        return {
          rows: yield* readRows(client, describer, object, page.ids),
          hasMore: page.hasMore,
          ...(page.ids.length === 0 ? {} : { nextPageCursor: page.ids[page.ids.length - 1] }),
        };
      }),
  });

/**
 * Where a replicated object is. `idle` waits to read from `start`. A running
 * window reads updates, after `after`, then deletes. `latest` is the earliest
 * `latestDateCovered` so far, where the next window starts.
 */
const WindowSchema = Schema.TaggedUnion({
  idle: { start: Schema.DateTimeUtcFromString },
  updated: {
    start: Schema.DateTimeUtcFromString,
    end: Schema.DateTimeUtcFromString,
    latest: Schema.optional(Schema.DateTimeUtcFromString),
    after: Schema.optional(Schema.String),
  },
  deleted: {
    start: Schema.DateTimeUtcFromString,
    end: Schema.DateTimeUtcFromString,
    latest: Schema.DateTimeUtcFromString,
  },
});

type Window = Schema.Schema.Type<typeof WindowSchema>;
type Updated = Schema.Schema.Type<typeof WindowSchema.cases.updated>;
type Deleted = Schema.Schema.Type<typeof WindowSchema.cases.deleted>;

/** A full read. `idle` waits an hour after `last`. `reading` goes on after `after`. */
const FullReadSchema = Schema.TaggedUnion({
  idle: { last: Schema.DateTimeUtcFromString },
  reading: { startedAt: Schema.DateTimeUtcFromString, after: Schema.optional(Schema.String) },
});

type FullRead = Schema.Schema.Type<typeof FullReadSchema>;
type Reading = Schema.Schema.Type<typeof FullReadSchema.cases.reading>;

// The first cursor is the backfill cutoff, a plain ISO time.
const WindowCodec = Schema.Union([
  Schema.fromJsonString(WindowSchema),
  Schema.DateTimeUtcFromString.pipe(
    Schema.decodeTo(
      Schema.toType(WindowSchema),
      SchemaTransformation.transform({
        decode: (start): Window => WindowSchema.cases.idle.make({ start }),
        encode: (window) => window.start,
      }),
    ),
  ),
]);

const FullReadCodec = Schema.Union([
  Schema.fromJsonString(FullReadSchema),
  Schema.DateTimeUtcFromString.pipe(
    Schema.decodeTo(
      Schema.toType(FullReadSchema),
      SchemaTransformation.transform({
        decode: (last): FullRead => FullReadSchema.cases.idle.make({ last }),
        encode: FullReadSchema.match({
          idle: (read) => read.last,
          reading: (read) => read.startedAt,
        }),
      }),
    ),
  ),
]);

const decodeCursor = <A>(codec: Schema.Decoder<A>, value: string) =>
  Schema.decodeUnknownEffect(codec)(value).pipe(
    Effect.mapError(invalid("Invalid Salesforce changes cursor")),
  );

const encodeCursor = <A>(schema: Schema.Codec<A, unknown>, cursor: A) =>
  Schema.encodeEffect(Schema.fromJsonString(schema))(cursor).pipe(
    Effect.mapError(invalid("Could not encode Salesforce changes cursor")),
  );

type ChangesStep = {
  readonly rows: ReadonlyArray<ObjectRow | DeleteRow>;
  readonly cursor: string;
  readonly hasMore?: boolean;
};

const earliest = (current: DateTime.Utc | undefined, next: DateTime.Utc) =>
  current === undefined ? next : DateTime.min(current, next);

const replicationParams = (window: Updated | Deleted) => ({
  start: DateTime.formatIso(window.start),
  end: DateTime.formatIso(window.end),
});

/**
 * Reads the IDs from `getUpdated`, then deletes from `getDeleted`. The next
 * window starts at the earliest `latestDateCovered` they report. Salesforce
 * holds it back while a long transaction runs.
 */
const replicationChanges = (
  client: SalesforceClientService,
  describer: Describer,
  object: string,
  deletes: boolean,
  cursor: string,
): Effect.Effect<ChangesStep, ConnectorError> => {
  const path = `/sobjects/${object}`;
  const encode = (window: Window) => encodeCursor(WindowSchema, window);

  const readUpdated = (window: Updated) =>
    Effect.gen(function* () {
      const { body } = yield* client.get(
        UpdatedSchema,
        `${path}/updated/`,
        replicationParams(window),
      );
      const pending = Arr.sort(body.ids, Order.String).filter(
        (id) => window.after === undefined || id > window.after,
      );
      const ids = pending.slice(0, maxPagesPerRun * readBatchSize);
      const rows = yield* readRows(client, describer, object, ids);
      const latest = earliest(window.latest, body.latestDateCovered);
      if (ids.length < pending.length) {
        return {
          rows,
          cursor: yield* encode({ ...window, latest, after: ids[ids.length - 1] }),
          hasMore: true,
        };
      }
      if (!deletes) {
        return { rows, cursor: yield* encode(WindowSchema.cases.idle.make({ start: latest })) };
      }
      const { start, end } = window;
      return {
        rows,
        cursor: yield* encode(WindowSchema.cases.deleted.make({ start, end, latest })),
        hasMore: true,
      };
    });

  const readDeleted = (window: Deleted) =>
    Effect.gen(function* () {
      const { body } = yield* client.get(
        DeletedSchema,
        `${path}/deleted/`,
        replicationParams(window),
      );
      const ids = body.deletedRecords.map((record) => record.id);
      // A record deleted and restored in the window still reads, so it's no delete.
      const live = new Set((yield* readRows(client, describer, object, ids)).map((row) => row.id));
      const version = yield* DateTime.nowAsDate;
      return {
        rows: ids
          .filter((id) => !live.has(id))
          .map((id): DeleteRow => ({ id, version, _deleted: true })),
        cursor: yield* encode(
          WindowSchema.cases.idle.make({ start: earliest(window.latest, body.latestDateCovered) }),
        ),
      };
    });

  const open = (start: DateTime.Utc) =>
    Effect.gen(function* () {
      // Salesforce ignores seconds, so windows are whole minutes.
      const end = DateTime.startOf(yield* DateTime.now, "minute");
      if (DateTime.isLessThan(start, DateTime.subtractDuration(end, maxWindow))) {
        return yield* new ConnectorError({
          message: `Salesforce keeps deletes for 15 days, and ${object} was last read at ${DateTime.formatIso(start)}. Backfill it again.`,
        });
      }
      if (!DateTime.isLessThan(start, end)) return { rows: [], cursor };
      return yield* readUpdated(WindowSchema.cases.updated.make({ start, end }));
    });

  return decodeCursor(WindowCodec, cursor).pipe(
    Effect.flatMap(
      WindowSchema.match({
        idle: ({ start }) => open(start),
        updated: readUpdated,
        deleted: readDeleted,
      }),
    ),
  );
};

/** Objects Salesforce can't replicate are read in full every hour. Deletes aren't seen. */
const fullReadChanges = (
  client: SalesforceClientService,
  describer: Describer,
  object: string,
  info: ObjectInfo,
  cursor: string,
): Effect.Effect<ChangesStep, ConnectorError> => {
  const read = ({ startedAt, after: start }: Reading) =>
    Effect.gen(function* () {
      let after = start;
      let ids: ReadonlyArray<string> = [];
      let hasMore = true;
      for (let page = 0; page < maxPagesPerRun && hasMore; page++) {
        const next = yield* idPage(client, object, info, after);
        ids = [...ids, ...next.ids];
        hasMore = next.hasMore;
        after = next.ids[next.ids.length - 1] ?? after;
      }
      const next = hasMore
        ? FullReadSchema.cases.reading.make({
            startedAt,
            ...(after === undefined ? {} : { after }),
          })
        : FullReadSchema.cases.idle.make({ last: startedAt });
      return {
        rows: yield* readRows(client, describer, object, ids),
        cursor: yield* encodeCursor(FullReadSchema, next),
        hasMore,
      };
    });

  return decodeCursor(FullReadCodec, cursor).pipe(
    Effect.flatMap(
      FullReadSchema.match({
        idle: ({ last }) =>
          Effect.gen(function* () {
            const now = yield* DateTime.now;
            return DateTime.isLessThan(now, DateTime.addDuration(last, fullReadInterval))
              ? { rows: [], cursor }
              : yield* read(FullReadSchema.cases.reading.make({ startedAt: now }));
          }),
        reading: read,
      }),
    ),
  );
};

export const objectChanges = (
  client: SalesforceClientService,
  describer: Describer,
  object: string,
  options: { readonly interval: Duration.Duration; readonly deletes: boolean },
) =>
  Fetch.changes({
    cursor: Cursor.string(),
    interval: options.interval,
    fetch: ({ cursor }) =>
      Effect.gen(function* () {
        const info = yield* describer.describe(object);
        return info.replicateable
          ? yield* replicationChanges(client, describer, object, options.deletes, String(cursor))
          : yield* fullReadChanges(client, describer, object, info, String(cursor));
      }),
  });

export const objectCheck = (describer: Describer, object: string) =>
  describer.describe(object).pipe(Effect.asVoid);

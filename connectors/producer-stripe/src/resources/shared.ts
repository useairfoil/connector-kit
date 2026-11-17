import { ConnectorError, Cursor, Fetch } from "@useairfoil/connector-kit";
import {
  Array as Arr,
  DateTime,
  Duration,
  Effect,
  Option,
  Predicate,
  Result,
  Schema,
  SchemaTransformation,
  Stream,
} from "effect";

import type { StripeClientService, StripeListPage, StripeParams } from "../client/client";

import {
  DeletedObjectSchema,
  type StripeEvent,
  type StripeEventEnvelope,
  StripeEventEnvelopeSchema,
  StripeEventSchema,
} from "../schemas/events";

type HasId = { readonly id: string };

export type StripeResourceSpec<Item extends HasId, Row extends HasId> = {
  /** List path, such as `customers`. Objects are at `${path}/${id}`. */
  readonly path: string;
  readonly objectSchema: Schema.Decoder<Item>;
  /** Turns a Stripe object into a row without its version. */
  readonly toRow: (item: Item) => Effect.Effect<Row, ConnectorError>;
  readonly listParams?: StripeParams;
  readonly retrieveParams?: StripeParams;
  readonly createdFilter?: false;
  readonly eventTypes: readonly [string, ...Array<string>];
  /** Events for objects that can no longer be fetched. */
  readonly deleteEventTypes: ReadonlyArray<string>;
};

export type Versioned<Row> = Row & { readonly version: Date };

export type DeleteRow = {
  readonly id: string;
  readonly version: Date;
  readonly _deleted: true;
};

const pageSize = 100;
const maxEventPagesPerRun = 20;
const fetchConcurrency = 4;
// The newest events are left for the next window.
const eventSettleTime = Duration.seconds(30);
// Stripe keeps events for 30 days. We stop a day early.
const eventRetention = Duration.days(29);
export const changesInterval = Duration.minutes(5);

const toSeconds = (time: DateTime.DateTime): string =>
  String(DateTime.toEpochMillis(DateTime.startOf(time, "second")) / 1000);

export const parseTime = (
  value: string,
  label: string,
): Effect.Effect<DateTime.Utc, ConnectorError> =>
  Option.match(DateTime.make(value), {
    onNone: () => Effect.fail(new ConnectorError({ message: `Invalid ${label}: ${value}` })),
    onSome: (time) => Effect.succeed(DateTime.toUtc(time)),
  });

const withVersion = <Row>(row: Row, version: Date): Versioned<Row> => ({ ...row, version });

export const startingAfter = (after: Option.Option<string>): StripeParams =>
  Option.match(after, { onNone: () => [], onSome: (id) => [["starting_after", id]] });

const lastId = <A extends HasId>(page: StripeListPage<A>): Option.Option<string> =>
  Option.map(Arr.last(page.items), (item) => item.id);

const nextPage = <A extends HasId>(page: StripeListPage<A>): Option.Option<string> =>
  page.hasMore ? lastId(page) : Option.none();

export const listAll = <A extends HasId>(
  client: StripeClientService,
  schema: Schema.Decoder<A>,
  path: string,
  params: StripeParams,
): Effect.Effect<ReadonlyArray<A>, ConnectorError> =>
  Stream.paginate(Option.none<string>(), (after) =>
    client
      .list(schema, path, [["limit", String(pageSize)], ...params, ...startingAfter(after)])
      .pipe(Effect.map((page) => [page.items, Option.map(nextPage(page), Option.some)] as const)),
  ).pipe(Stream.runCollect);

export const checkResource = <Item extends HasId, Row extends HasId>(
  client: StripeClientService,
  spec: StripeResourceSpec<Item, Row>,
): Effect.Effect<void, ConnectorError> =>
  Effect.all(
    [
      client.list(spec.objectSchema, spec.path, [["limit", "1"], ...(spec.listParams ?? [])]),
      client.list(StripeEventSchema, "events", [
        ["limit", "1"],
        ["types[]", spec.eventTypes[0]],
      ]),
    ],
    { discard: true },
  );

export const backfillPages = <Item extends HasId, Row extends HasId>(
  client: StripeClientService,
  spec: StripeResourceSpec<Item, Row>,
) =>
  Fetch.page({
    pageCursor: Cursor.string(),
    cutoff: Cursor.isoDateTime(),
    fetch: ({ pageCursor, cutoff }) =>
      Effect.gen(function* () {
        const cutoffTime = yield* parseTime(String(cutoff), "backfill cutoff");
        const page = yield* client.list(spec.objectSchema, spec.path, [
          ["limit", String(pageSize)],
          ...(spec.createdFilter === false
            ? []
            : [["created[lte]", toSeconds(cutoffTime)] as const]),
          ...(spec.listParams ?? []),
          ...startingAfter(Option.liftPredicate(pageCursor, Predicate.isString)),
        ]);
        const rows = yield* Effect.forEach(
          page.items,
          (item) => spec.toRow(item).pipe(Effect.map((row) => withVersion(row, page.fetchedAt))),
          { concurrency: fetchConcurrency },
        );
        return {
          rows,
          nextPageCursor: Option.getOrUndefined(lastId(page)),
          hasMore: Option.isSome(nextPage(page)),
        };
      }),
  });

/**
 * A delete wins over other events for the same object, because a deleted object
 * can't be fetched. Every other object is fetched once.
 */
export const rowsForEvents = <Item extends HasId, Row extends HasId>(
  client: StripeClientService,
  spec: StripeResourceSpec<Item, Row>,
  events: ReadonlyArray<StripeEvent>,
): Effect.Effect<ReadonlyArray<Versioned<Row> | DeleteRow>, ConnectorError> =>
  Effect.gen(function* () {
    const [deleted, changed] = Arr.partition(events, (event) =>
      spec.deleteEventTypes.includes(event.type)
        ? Result.succeed(event.data.object.id)
        : Result.fail(event.data.object.id),
    );
    const deletedIds = Arr.dedupe(deleted);
    const changedIds = Arr.difference(Arr.dedupe(changed), deletedIds);

    const now = yield* DateTime.nowAsDate;
    const deleteRows = deletedIds.map((id): DeleteRow => ({ id, version: now, _deleted: true }));

    const fetchSchema = Schema.Union([DeletedObjectSchema, spec.objectSchema]);
    const fetched = yield* Effect.forEach(
      changedIds,
      (id) =>
        client.retrieve(fetchSchema, `${spec.path}/${id}`, spec.retrieveParams).pipe(
          // A missing object is gone. Its own delete event writes the row.
          Effect.flatMap((found) =>
            Effect.transposeOption(
              Option.map(
                found,
                ({ item, fetchedAt }): Effect.Effect<Versioned<Row> | DeleteRow, ConnectorError> =>
                  "deleted" in item
                    ? Effect.succeed({ id: item.id, version: fetchedAt, _deleted: true })
                    : spec.toRow(item).pipe(Effect.map((row) => withVersion(row, fetchedAt))),
              ),
            ),
          ),
        ),
      { concurrency: fetchConcurrency },
    );

    return [...deleteRows, ...Arr.getSomes(fetched)];
  });

/**
 * Position in the event list. `from` is where the next window starts. While a
 * window is only partly read, `end` and `after` say where to continue.
 */
const ChangesCursorSchema = Schema.Struct({
  from: Schema.DateTimeUtcFromString,
  end: Schema.optional(Schema.DateTimeUtcFromString),
  after: Schema.optional(Schema.String),
});

type ChangesCursor = Schema.Schema.Type<typeof ChangesCursorSchema>;

const ChangesCursorCodec = Schema.Union([
  Schema.fromJsonString(ChangesCursorSchema),
  // The first cursor is the backfill cutoff, a plain ISO time.
  Schema.DateTimeUtcFromString.pipe(
    Schema.decodeTo(
      Schema.toType(ChangesCursorSchema),
      SchemaTransformation.transform({
        decode: (from): ChangesCursor => ({ from }),
        encode: (cursor) => cursor.from,
      }),
    ),
  ),
]);

const decodeChangesCursor = (value: string): Effect.Effect<ChangesCursor, ConnectorError> =>
  Schema.decodeUnknownEffect(ChangesCursorCodec)(value).pipe(
    Effect.mapError(
      (cause) => new ConnectorError({ message: "Invalid Stripe changes cursor", cause }),
    ),
  );

const encodeChangesCursor = (cursor: ChangesCursor): Effect.Effect<string, ConnectorError> =>
  Schema.encodeEffect(ChangesCursorCodec)(cursor).pipe(
    Effect.mapError(
      (cause) => new ConnectorError({ message: "Could not encode Stripe changes cursor", cause }),
    ),
  );

type EventPages = {
  readonly events: ReadonlyArray<StripeEventEnvelope>;
  /** The last event read, when the window has more. */
  readonly next: Option.Option<string>;
};

const readEventPages = (
  client: StripeClientService,
  params: StripeParams,
  after: Option.Option<string>,
  pages: number,
): Effect.Effect<EventPages, ConnectorError> =>
  Stream.paginate(after, (cursor) =>
    client
      .list(StripeEventEnvelopeSchema, "events", [...params, ...startingAfter(cursor)])
      .pipe(Effect.map((page) => [[page], Option.map(nextPage(page), Option.some)] as const)),
  ).pipe(
    Stream.take(pages),
    Stream.runCollect,
    Effect.map((read) => ({
      events: read.flatMap((page) => page.items),
      next: Option.flatMap(Arr.last(read), nextPage),
    })),
  );

/**
 * Reads events in fixed time windows, up to 20 pages per run, so a busy window
 * takes several runs. It reads every event type: Stripe filters on at most 20,
 * and our resources use more.
 */
export const readEventWindow = (
  client: StripeClientService,
  cursor: string,
): Effect.Effect<
  {
    readonly events: ReadonlyArray<StripeEventEnvelope>;
    readonly cursor: string;
    readonly hasMore: boolean;
  },
  ConnectorError
> =>
  Effect.gen(function* () {
    const state = yield* decodeChangesCursor(cursor);
    const from = state.from;
    const now = yield* DateTime.now;

    if (DateTime.isLessThan(from, DateTime.subtractDuration(now, eventRetention))) {
      return yield* new ConnectorError({
        message: `Stripe no longer has the events after ${DateTime.formatIso(from)}. Run a new backfill.`,
      });
    }

    // Whole seconds, because Stripe event times are in seconds.
    const end =
      state.end ?? DateTime.startOf(DateTime.subtractDuration(now, eventSettleTime), "second");

    if (DateTime.isLessThanOrEqualTo(end, from)) {
      return {
        events: [],
        cursor: yield* encodeChangesCursor({ from }),
        hasMore: false,
      };
    }

    const window = yield* readEventPages(
      client,
      [
        ["limit", String(pageSize)],
        ["created[gte]", toSeconds(from)],
        ["created[lt]", toSeconds(end)],
      ],
      Option.fromNullishOr(state.after),
      maxEventPagesPerRun,
    );
    const next = Option.match(window.next, {
      onNone: (): ChangesCursor => ({ from: end }),
      onSome: (after): ChangesCursor => ({ from, end, after }),
    });

    return {
      events: window.events,
      cursor: yield* encodeChangesCursor(next),
      hasMore: Option.isSome(window.next),
    };
  });

/** Rows for one resource. Only its own events must have an object ID. */
export const rowsForWindow = <Item extends HasId, Row extends HasId>(
  client: StripeClientService,
  spec: StripeResourceSpec<Item, Row>,
  events: ReadonlyArray<StripeEventEnvelope>,
) =>
  Effect.forEach(
    events.filter((event) => spec.eventTypes.includes(event.type)),
    (event) =>
      Schema.decodeUnknownEffect(StripeEventSchema)(event).pipe(
        Effect.mapError(
          (cause) =>
            new ConnectorError({
              message: `Stripe event ${event.id} (${event.type}) has no object ID`,
              cause,
            }),
        ),
      ),
  ).pipe(Effect.flatMap((handled) => rowsForEvents(client, spec, handled)));

export const eventWebhook = <Item extends HasId, Row extends HasId>(
  client: StripeClientService,
  spec: StripeResourceSpec<Item, Row>,
) => ({
  schema: StripeEventSchema,
  handler: ({ payload }: { readonly payload: StripeEvent }) =>
    rowsForEvents(client, spec, [payload]),
});

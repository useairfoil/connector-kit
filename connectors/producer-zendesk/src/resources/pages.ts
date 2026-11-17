import { type ConnectorError, Cursor, Fetch } from "@useairfoil/connector-kit";
import { DateTime, Duration, Effect, Option, Schema, Stream } from "effect";

import type { ZendeskClientService } from "../client/client";

export const hourly = Duration.hours(1);

export const pageSize = { "page[size]": "100" };

type ListOptions<A> = {
  readonly path: string;
  /** The response key that holds the items, such as `groups`. */
  readonly key: string;
  readonly item: Schema.Decoder<A>;
  readonly params?: Readonly<Record<string, string>>;
  /** A `404` gives no items, such as the comments of a deleted ticket. */
  readonly emptyIfMissing?: boolean;
};

export const readPage = <A>(
  client: ZendeskClientService,
  options: ListOptions<A>,
  after: Option.Option<string> = Option.none(),
) => {
  const schema = Schema.Struct({
    items: Schema.Array(options.item),
    meta: Schema.optional(
      Schema.Struct({ has_more: Schema.Boolean, after_cursor: Schema.NullOr(Schema.String) }),
    ),
  }).pipe(Schema.encodeKeys({ items: options.key }));
  const params = {
    ...(options.params ?? pageSize),
    ...Option.match(after, {
      onNone: () => ({}),
      onSome: (cursor) => ({ "page[after]": cursor }),
    }),
  };
  const page = options.emptyIfMissing
    ? client
        .find(schema, options.path, params)
        .pipe(Effect.map(Option.getOrElse(() => ({ items: [], meta: undefined }))))
    : client.get(schema, options.path, params);
  return page.pipe(
    Effect.map(({ items, meta }) => ({
      items,
      next: meta?.has_more ? Option.fromNullishOr(meta.after_cursor) : Option.none<string>(),
    })),
  );
};

export const listAll = <A>(
  client: ZendeskClientService,
  options: ListOptions<A>,
): Effect.Effect<ReadonlyArray<A>, ConnectorError> =>
  Stream.paginate(Option.none<string>(), (after) =>
    readPage(client, options, after).pipe(
      Effect.map(({ items, next }) => [items, Option.map(next, Option.some)] as const),
    ),
  ).pipe(Stream.runCollect);

export const listSources = <Row extends object>(
  read: Effect.Effect<ReadonlyArray<Row>, ConnectorError>,
  interval = hourly,
) => ({
  check: read.pipe(Effect.asVoid),
  backfill: Fetch.page({
    pageCursor: Cursor.string(),
    cutoff: Cursor.isoDateTime(),
    fetch: () => read.pipe(Effect.map((rows) => ({ rows, hasMore: false }))),
  }),
  changes: Fetch.changes({
    cursor: Cursor.string(),
    interval,
    fetch: () =>
      Effect.all([read, DateTime.now]).pipe(
        Effect.map(([rows, now]) => ({ rows, cursor: DateTime.formatIso(now) })),
      ),
  }),
});

import { ConnectorError, Cursor, Fetch } from "@useairfoil/connector-kit";
import {
  Array as Arr,
  DateTime,
  Duration,
  Effect,
  Exit,
  Option,
  Order,
  Schema,
  SchemaTransformation,
  Stream,
} from "effect";

import { type GitHubClientService, withParams } from "../client/client";
import { type RepositoryRef, RepositoryRefSchema } from "../schemas/repositories";

type Timestamps = { readonly created_at: Date; readonly updated_at: Date };

export const timestamps = {
  createdAt: (item: Timestamps) => item.created_at,
  updatedAt: (item: Timestamps) => item.updated_at,
};

export type DeleteRow = {
  readonly id: bigint;
  readonly version: Date;
  readonly _deleted: true;
};

export const pageSize = "100";
export const changesInterval = Duration.minutes(15);
// A run stops after this many pages and the next one starts right away.
const maxChangesPagesPerRun = 20;
// Updates can show up in a list late, so each changes read starts a bit early.
const changesOverlap = Duration.minutes(5);
const repositoryListTtl = Duration.minutes(5);

export const installationRepositoriesPath = "/installation/repositories";

export const repositoryPage = <A>(item: Schema.Decoder<A>) =>
  Schema.Struct({ repositories: Schema.Array(item) });

/** Some lists wrap their items, such as `{ total_count, workflow_runs: [...] }`. */
export const wrappedList = <A>(
  key: string,
  item: Schema.Decoder<A>,
): Schema.Decoder<ReadonlyArray<A>> =>
  Schema.Struct({ [key]: Schema.Array(item) }).pipe(
    Schema.decodeTo(
      Schema.Array(Schema.toType(item)),
      SchemaTransformation.transform({
        decode: (page) => page[key],
        encode: (items) => ({ [key]: items }),
      }),
    ),
  );

export const readPages = <A>(
  client: GitHubClientService,
  pageSchema: Schema.Decoder<ReadonlyArray<A>>,
  url: string,
  keepGoing: (items: ReadonlyArray<A>) => boolean = () => true,
): Effect.Effect<ReadonlyArray<A>, ConnectorError> =>
  Stream.paginate(url, (current) =>
    client
      .get(pageSchema, current)
      .pipe(
        Effect.map(
          (page) => [page.body, keepGoing(page.body) ? page.next : Option.none()] as const,
        ),
      ),
  ).pipe(Stream.runCollect);

/** Every repository the installation can read, ordered by ID. */
export const listRepositories = <A extends { readonly id: number | bigint }>(
  client: GitHubClientService,
  schema: Schema.Decoder<A>,
): Effect.Effect<ReadonlyArray<A>, ConnectorError> =>
  readPages(
    client,
    wrappedList("repositories", schema),
    withParams(installationRepositoriesPath, { per_page: pageSize }),
  ).pipe(
    Effect.map(Arr.sort(Order.mapInput(Order.Number, (repository: A) => Number(repository.id)))),
  );

export const cachedRepositoryRefs = (client: GitHubClientService) =>
  listRepositories(client, RepositoryRefSchema).pipe(
    Effect.cachedWithTTL((exit) => (Exit.isSuccess(exit) ? repositoryListTtl : 0)),
  );

/**
 * `since` is when the last run started, and `repositoryIds` are the
 * repositories it read. Any other repository is new and is read from the start.
 * `pending` is set while a run is split.
 */
const ChangesCursorSchema = Schema.Struct({
  since: Schema.DateTimeUtcFromString,
  repositoryIds: Schema.optional(Schema.Array(Schema.Number)),
  pending: Schema.optional(
    Schema.Struct({
      until: Schema.DateTimeUtcFromString,
      repositoryIds: Schema.Array(Schema.Number),
      repositoryId: Schema.Number,
      url: Schema.optional(Schema.String),
    }),
  ),
});

type ChangesCursor = Schema.Schema.Type<typeof ChangesCursorSchema>;

const ChangesCursorCodec = Schema.Union([
  Schema.fromJsonString(ChangesCursorSchema),
  // The first cursor is the backfill cutoff, a plain ISO time. Every repository
  // the installation has then counts as read.
  Schema.DateTimeUtcFromString.pipe(
    Schema.decodeTo(
      Schema.toType(ChangesCursorSchema),
      SchemaTransformation.transform({
        decode: (since): ChangesCursor => ({ since }),
        encode: (cursor) => cursor.since,
      }),
    ),
  ),
]);

const cursorError = (cause: Schema.SchemaError) =>
  new ConnectorError({ message: "Invalid GitHub cursor", cause });

const decodeChangesCursor = (value: string) =>
  Schema.decodeUnknownEffect(ChangesCursorCodec)(value).pipe(Effect.mapError(cursorError));

const encodeChangesCursor = (cursor: ChangesCursor) =>
  Schema.encodeEffect(Schema.fromJsonString(ChangesCursorSchema))(cursor).pipe(
    Effect.mapError(cursorError),
  );

/** When to read a repository's changes from. None means from the start. */
const readFrom = (state: ChangesCursor, repositoryId: number): Option.Option<Date> =>
  state.repositoryIds === undefined || state.repositoryIds.includes(repositoryId)
    ? Option.some(DateTime.toDateUtc(DateTime.subtractDuration(state.since, changesOverlap)))
    : Option.none();

export const isSince = (time: Option.Option<Date>, date: Date) =>
  Option.match(time, { onNone: () => true, onSome: (since) => date.getTime() >= since.getTime() });

export const readChanges = <A extends { readonly id: number | bigint }, Row>(
  cursor: string,
  repositories: Effect.Effect<ReadonlyArray<A>, ConnectorError>,
  toRows: (
    repositories: ReadonlyArray<{ readonly repository: A; readonly since: Option.Option<Date> }>,
  ) => ReadonlyArray<Row>,
) =>
  Effect.gen(function* () {
    const state = yield* decodeChangesCursor(cursor);
    const runStart = yield* DateTime.now;
    const listed = yield* repositories;
    return {
      rows: toRows(
        listed.map((repository) => ({
          repository,
          since: readFrom(state, Number(repository.id)),
        })),
      ),
      cursor: yield* encodeChangesCursor({
        since: runStart,
        repositoryIds: listed.map((repository) => Number(repository.id)),
      }),
    };
  });

export type RepoResourceSpec<Item, Row extends object> = {
  readonly path: string;
  readonly pageSchema: Schema.Decoder<ReadonlyArray<Item>>;
  readonly params: Readonly<Record<string, string>>;
  /** Whether the list takes `since`. */
  readonly since: boolean;
  /**
   * `sorted` lists take `sort` and `direction`, so changes stop at the first
   * older item. `newest` lists come newest first, so backfill reads every page.
   */
  readonly order: "sorted" | "newest";
  /**
   * On a `newest` list, changes stop at the first page created this long
   * before `since`. Without it, they read every page.
   */
  readonly recentFor?: Duration.Duration;
  readonly createdAt?: (item: Item) => Date;
  readonly updatedAt?: (item: Item) => Date;
  /** Items the resource keeps. The issues list also returns pull requests. */
  readonly keep: (item: Item) => boolean;
  /** GitHub returns 404 for pull requests and comments when the feature is off. */
  readonly enabled: (repository: RepositoryRef) => boolean;
  /** Rows for one page. A child resource reads its children here. */
  readonly rows: (
    items: ReadonlyArray<Item>,
    repository: RepositoryRef,
    readAt: Date,
  ) => Effect.Effect<ReadonlyArray<Row>, ConnectorError>;
};

export const rowsOf =
  <Item, Row>(toRow: (item: Item, repositoryId: bigint) => Row) =>
  (items: ReadonlyArray<Item>, repository: RepositoryRef) =>
    Effect.succeed(items.map((item) => toRow(item, BigInt(repository.id))));

export const repoPath = (repository: RepositoryRef, path: string) =>
  `/repos/${repository.full_name}/${path}`;

/**
 * `rows` for a child resource, such as reviews of pull requests. Parents are
 * read one at a time, as GitHub asks. `readAt` is the version for children
 * without an update time.
 */
export const childRows =
  <Parent, Child, Row>(
    client: GitHubClientService,
    child: {
      readonly path: (parent: Parent) => string;
      readonly pageSchema: Schema.Decoder<ReadonlyArray<Child>>;
      readonly params?: Readonly<Record<string, string>>;
      readonly toRow: (child: Child, parent: Parent, repositoryId: bigint, readAt: Date) => Row;
    },
  ) =>
  (parents: ReadonlyArray<Parent>, repository: RepositoryRef) =>
    Effect.gen(function* () {
      const readAt = yield* DateTime.nowAsDate;
      const rows = yield* Effect.forEach(parents, (parent) =>
        readPages(
          client,
          child.pageSchema,
          withParams(repoPath(repository, child.path(parent)), {
            ...child.params,
            per_page: pageSize,
          }),
        ).pipe(
          Effect.map((children) =>
            children.map((item) => child.toRow(item, parent, BigInt(repository.id), readAt)),
          ),
        ),
      );
      return rows.flat();
    });

/** Lists one item, then reads its rows, so a child resource checks its own call too. */
export const checkRepoResource = <Item, Row extends object>(
  client: GitHubClientService,
  spec: RepoResourceSpec<Item, Row>,
): Effect.Effect<void, ConnectorError> =>
  Effect.gen(function* () {
    const page = yield* client.get(
      repositoryPage(RepositoryRefSchema),
      withParams(installationRepositoriesPath, { per_page: pageSize }),
    );
    // An installation without such a repository has nothing to check yet.
    const repository = Arr.findFirst(page.body.repositories, spec.enabled);
    if (Option.isSome(repository)) {
      const readAt = yield* DateTime.nowAsDate;
      const items = yield* client.get(
        spec.pageSchema,
        withParams(repoPath(repository.value, spec.path), { ...spec.params, per_page: "1" }),
      );
      yield* spec.rows(items.body.filter(spec.keep), repository.value, readAt);
    }
  });

const BackfillCursorSchema = Schema.fromJsonString(
  Schema.Struct({
    repositoryId: Schema.Number,
    next: Schema.optional(Schema.String),
  }),
);

type BackfillCursor = Schema.Schema.Type<typeof BackfillCursorSchema>;

const decodeBackfillCursor = (value: string) =>
  Schema.decodeUnknownEffect(BackfillCursorSchema)(value).pipe(Effect.mapError(cursorError));

const encodeBackfillCursor = (cursor: BackfillCursor) =>
  Schema.encodeEffect(BackfillCursorSchema)(cursor).pipe(Effect.mapError(cursorError));

export const parseCutoff = (value: string): Date => DateTime.toDateUtc(DateTime.makeUnsafe(value));

/**
 * Reads one repository at a time up to the cutoff, oldest first when the list
 * can sort. The cursor keeps the `next` URL, because the issues list pages
 * with a cursor.
 */
export const backfillRepoResource = <Item, Row extends object>(
  client: GitHubClientService,
  repositories: Effect.Effect<ReadonlyArray<RepositoryRef>, ConnectorError>,
  spec: RepoResourceSpec<Item, Row>,
) =>
  Fetch.page({
    pageCursor: Cursor.string(),
    cutoff: Cursor.isoDateTime(),
    fetch: ({ pageCursor, cutoff }) =>
      Effect.gen(function* () {
        const cutoffDate = parseCutoff(String(cutoff));
        const listed = (yield* repositories).filter(spec.enabled);
        const position =
          typeof pageCursor === "string"
            ? Option.some(yield* decodeBackfillCursor(pageCursor))
            : Option.none();
        // A repository removed from the installation is skipped.
        const repository = Option.match(position, {
          onNone: () => listed[0],
          onSome: ({ repositoryId }) => listed.find((item) => item.id >= repositoryId),
        });
        if (repository === undefined) return { rows: [], hasMore: false };

        const url = Option.flatMap(position, ({ repositoryId, next }) =>
          repositoryId === repository.id ? Option.fromNullishOr(next) : Option.none(),
        ).pipe(
          Option.getOrElse(() =>
            withParams(repoPath(repository, spec.path), {
              ...spec.params,
              ...(spec.order === "sorted" ? { sort: "created", direction: "asc" } : {}),
              per_page: pageSize,
            }),
          ),
        );
        const readAt = yield* DateTime.nowAsDate;
        const page = yield* client.get(spec.pageSchema, url);
        const beforeCutoff = page.body.filter(
          (item) =>
            spec.createdAt === undefined || spec.createdAt(item).getTime() <= cutoffDate.getTime(),
        );
        const rows = yield* spec.rows(beforeCutoff.filter(spec.keep), repository, readAt);
        // A sorted list is past the cutoff at the first newer item.
        const pastCutoff = spec.order === "sorted" && beforeCutoff.length < page.body.length;

        if (!pastCutoff && Option.isSome(page.next)) {
          return {
            rows,
            nextPageCursor: yield* encodeBackfillCursor({
              repositoryId: repository.id,
              next: page.next.value,
            }),
            hasMore: true,
          };
        }
        const following = listed.find((item) => item.id > repository.id);
        if (following === undefined) return { rows, hasMore: false };
        return {
          rows,
          nextPageCursor: yield* encodeBackfillCursor({ repositoryId: following.id }),
          hasMore: true,
        };
      }),
  });

type ChangesPage<Row> = {
  readonly repository: RepositoryRef;
  readonly rows: ReadonlyArray<Row>;
  readonly next: Option.Option<string>;
};

/**
 * One repository's changes, newest first, so an edit during the read repeats a
 * row instead of skipping one.
 */
const changesPages = <Item, Row extends object>(
  client: GitHubClientService,
  spec: RepoResourceSpec<Item, Row>,
  repository: RepositoryRef,
  since: Option.Option<Date>,
  url: Option.Option<string>,
): Stream.Stream<ChangesPage<Row>, ConnectorError> => {
  const first = withParams(repoPath(repository, spec.path), {
    ...spec.params,
    ...(spec.order === "sorted" ? { sort: "updated", direction: "desc" } : {}),
    per_page: pageSize,
    // Never send an old `since` to mean everything: GitHub then returns nothing.
    ...(spec.since && Option.isSome(since) ? { since: since.value.toISOString() } : {}),
  });
  const isRecent = (item: Item) =>
    spec.updatedAt === undefined || isSince(since, spec.updatedAt(item));
  const { order, recentFor } = spec;
  const createdFrom = Option.map(since, (date) =>
    DateTime.toDateUtc(
      DateTime.subtractDuration(DateTime.fromDateUnsafe(date), recentFor ?? Duration.zero),
    ),
  );
  const goOn = (items: ReadonlyArray<Item>) => {
    if (order === "sorted") return items.every(isRecent);
    const createdAt = spec.createdAt;
    if (recentFor === undefined || createdAt === undefined) return true;
    return items.every((item) => isSince(createdFrom, createdAt(item)));
  };
  return Stream.paginate(
    Option.getOrElse(url, () => first),
    (current) =>
      Effect.gen(function* () {
        const readAt = yield* DateTime.nowAsDate;
        const page = yield* client.get(spec.pageSchema, current);
        const next = goOn(page.body) ? page.next : Option.none();
        const rows = yield* spec.rows(
          page.body.filter((item) => isRecent(item) && spec.keep(item)),
          repository,
          readAt,
        );
        return [[{ repository, rows, next }], next] as const;
      }),
  );
};

export const changesRepoResource = <Item, Row extends object>(
  client: GitHubClientService,
  spec: RepoResourceSpec<Item, Row>,
) =>
  Fetch.changes({
    cursor: Cursor.string(),
    interval: changesInterval,
    fetch: ({ cursor }) =>
      Effect.gen(function* () {
        const state = yield* decodeChangesCursor(String(cursor));
        const listed = yield* listRepositories(client, RepositoryRefSchema);
        const pending = state.pending;
        const until = pending?.until ?? (yield* DateTime.now);
        // Only repositories with the feature on count as read. One that turns it on
        // later is read in full, because GitHub keeps the hidden items.
        const repositoryIds =
          pending?.repositoryIds ?? listed.filter(spec.enabled).map((repository) => repository.id);
        const repositories = listed.filter(
          (repository) =>
            spec.enabled(repository) &&
            repositoryIds.includes(repository.id) &&
            repository.id >= (pending?.repositoryId ?? 0),
        );

        const pages = yield* Stream.fromIterable(repositories).pipe(
          Stream.flatMap((repository) =>
            changesPages(
              client,
              spec,
              repository,
              readFrom(state, repository.id),
              Option.fromNullishOr(
                pending?.repositoryId === repository.id ? pending.url : undefined,
              ),
            ),
          ),
          Stream.take(maxChangesPagesPerRun),
          Stream.runCollect,
        );
        const rows = pages.flatMap((page) => page.rows);

        const position = Option.flatMap(Arr.last(pages), ({ repository, next }) =>
          Option.match(next, {
            onSome: (url) => Option.some({ repositoryId: repository.id, url }),
            onNone: () =>
              Arr.findFirst(repositories, (item) => item.id > repository.id).pipe(
                Option.map((item) => ({ repositoryId: item.id })),
              ),
          }),
        );
        if (pages.length === maxChangesPagesPerRun && Option.isSome(position)) {
          return {
            rows,
            cursor: yield* encodeChangesCursor({
              ...state,
              pending: { until, repositoryIds, ...position.value },
            }),
            hasMore: true,
          };
        }
        return {
          rows,
          cursor: yield* encodeChangesCursor({ since: until, repositoryIds }),
          hasMore: false,
        };
      }),
  });

/** Schemas check that the URL ends in a number. */
export const numberAtEnd = (url: string): bigint => BigInt(url.slice(url.lastIndexOf("/") + 1));

export const deleteRow = (id: bigint): Effect.Effect<DeleteRow> =>
  DateTime.nowAsDate.pipe(Effect.map((version): DeleteRow => ({ id, version, _deleted: true })));

export const decodeEvent = <A>(schema: Schema.Decoder<A>, payload: unknown) =>
  Schema.decodeUnknownEffect(schema)(payload).pipe(
    Effect.mapError(
      (cause) => new ConnectorError({ message: "GitHub webhook payload does not decode", cause }),
    ),
  );

import { ConnectorError, Cursor, Fetch, Resource } from "@useairfoil/connector-kit";
import { Array as Arr, DateTime, Effect, Order, Schema, SchemaTransformation } from "effect";

import type { SalesforceClientService } from "../client/client";
import type { ObjectRow } from "../schemas/objects";
import type { Describer } from "./describe";
import type { DeleteRow } from "./sources";

import { CustomObjectSchema } from "../schemas/objects";
import { changesInterval } from "./resource";
import { invalid, objectBackfill, objectChanges } from "./sources";

const PageCursorSchema = Schema.fromJsonString(
  Schema.Struct({ object: Schema.String, after: Schema.optional(Schema.String) }),
);

/**
 * Each object's place. An object found after the backfill is read in full
 * first, then by its own changes cursor.
 */
const ObjectStateSchema = Schema.TaggedUnion({
  backfill: { startedAt: Schema.String, after: Schema.optional(Schema.String) },
  changes: { cursor: Schema.String },
});

type ObjectState = Schema.Schema.Type<typeof ObjectStateSchema>;

type Step = {
  readonly rows: ReadonlyArray<ObjectRow | DeleteRow>;
  readonly state: ObjectState;
  readonly hasMore: boolean;
};

/** `initial` is set only on the first run, so objects the backfill read start there. */
const ChangesCursorSchema = Schema.Struct({
  objects: Schema.Record(Schema.String, ObjectStateSchema),
  initial: Schema.optional(Schema.String),
});

type ChangesCursor = Schema.Schema.Type<typeof ChangesCursorSchema>;

const ChangesCursorCodec = Schema.Union([
  Schema.fromJsonString(ChangesCursorSchema),
  // The first cursor is the backfill cutoff, a plain ISO time.
  Schema.String.pipe(
    Schema.decodeTo(
      Schema.toType(ChangesCursorSchema),
      SchemaTransformation.transform({
        decode: (cutoff): ChangesCursor => ({ objects: {}, initial: cutoff }),
        encode: (cursor) => cursor.initial ?? "",
      }),
    ),
  ),
]);

/** Custom objects Salesforce can replicate, sorted by name. */
export const customObjectNames = (describer: Describer) =>
  describer.objects.pipe(
    Effect.map((objects) =>
      Arr.sort(
        objects
          .filter(
            (object) =>
              object.custom &&
              object.replicateable &&
              object.queryable &&
              object.name.endsWith("__c"),
          )
          .map((object) => object.name),
        Order.String,
      ),
    ),
  );

const withObject =
  (object: string) =>
  <Row extends ObjectRow | DeleteRow>(row: Row) => ({ ...row, object });

/** Records of every custom object in one table, each object with its own cursor. */
export const makeCustomObjects = (client: SalesforceClientService, describer: Describer) => {
  const names = customObjectNames(describer);
  const backfillOf = (object: string) => objectBackfill(client, describer, object);
  const changesOf = (object: string) =>
    objectChanges(client, describer, object, { interval: changesInterval, deletes: true });

  const step = (object: string, state: ObjectState): Effect.Effect<Step, ConnectorError> =>
    ObjectStateSchema.match(state, {
      changes: ({ cursor }) =>
        changesOf(object)
          .fetch({ cursor })
          .pipe(
            Effect.map((result) => ({
              rows: result.rows,
              state: ObjectStateSchema.cases.changes.make({ cursor: String(result.cursor) }),
              hasMore: result.hasMore === true,
            })),
          ),
      backfill: ({ startedAt, after }) =>
        backfillOf(object)
          .fetch({ cutoff: startedAt, ...(after === undefined ? {} : { pageCursor: after }) })
          .pipe(
            Effect.map((page) => ({
              rows: page.rows,
              state: page.hasMore
                ? ObjectStateSchema.cases.backfill.make({
                    startedAt,
                    after: String(page.nextPageCursor),
                  })
                : // The full read started at `startedAt`, so changes go on from there.
                  ObjectStateSchema.cases.changes.make({ cursor: startedAt }),
              hasMore: page.hasMore,
            })),
          ),
    });

  return Resource.entity({
    name: "custom_objects",
    rowSchema: CustomObjectSchema,
    version: "version",

    check: names.pipe(
      Effect.flatMap((list) =>
        Effect.forEach(list, (object) => describer.describe(object), { discard: true }),
      ),
    ),

    backfill: Fetch.page({
      pageCursor: Cursor.string(),
      cutoff: Cursor.isoDateTime(),
      fetch: ({ pageCursor, cutoff }) =>
        Effect.gen(function* () {
          const list = yield* names;
          const at =
            typeof pageCursor === "string"
              ? yield* Schema.decodeUnknownEffect(PageCursorSchema)(pageCursor).pipe(
                  Effect.mapError(invalid("Invalid Salesforce custom objects page cursor")),
                )
              : undefined;
          // Objects are sorted, so an object deleted during the backfill is
          // skipped and the next one goes on.
          const index = at === undefined ? 0 : list.findIndex((object) => object >= at.object);
          const object = list[index];
          if (object === undefined) return { rows: [], hasMore: false };
          const after = at?.object === object ? at.after : undefined;

          const page = yield* backfillOf(object).fetch({
            cutoff,
            ...(after === undefined ? {} : { pageCursor: after }),
          });
          const nextObject = list[index + 1];
          const next = page.hasMore
            ? { object, after: String(page.nextPageCursor) }
            : nextObject === undefined
              ? undefined
              : { object: nextObject };
          return {
            rows: page.rows.map(withObject(object)),
            hasMore: next !== undefined,
            ...(next === undefined
              ? {}
              : {
                  nextPageCursor: yield* Schema.encodeEffect(PageCursorSchema)(next).pipe(
                    Effect.mapError(
                      invalid("Could not encode Salesforce custom objects page cursor"),
                    ),
                  ),
                }),
          };
        }),
    }),

    changes: Fetch.changes({
      cursor: Cursor.string(),
      interval: changesInterval,
      fetch: ({ cursor }) =>
        Effect.gen(function* () {
          const current = yield* Schema.decodeUnknownEffect(ChangesCursorCodec)(
            String(cursor),
          ).pipe(Effect.mapError(invalid("Invalid Salesforce custom objects changes cursor")));
          const now = DateTime.formatIso(yield* DateTime.now);
          const runs = yield* Effect.forEach(yield* names, (object) =>
            Effect.gen(function* () {
              const state =
                current.objects[object] ??
                (current.initial === undefined
                  ? ObjectStateSchema.cases.backfill.make({ startedAt: now })
                  : ObjectStateSchema.cases.changes.make({ cursor: current.initial }));
              return { object, ...(yield* step(object, state)) };
            }),
          );
          // Removed objects drop out.
          const next: ChangesCursor = {
            objects: Object.fromEntries(runs.map(({ object, state }) => [object, state])),
          };
          return {
            rows: runs.flatMap(({ object, rows }) => rows.map(withObject(object))),
            cursor: yield* Schema.encodeEffect(Schema.fromJsonString(ChangesCursorSchema))(
              next,
            ).pipe(
              Effect.mapError(invalid("Could not encode Salesforce custom objects changes cursor")),
            ),
            hasMore: runs.some((run) => run.hasMore),
          };
        }),
    }),
  });
};

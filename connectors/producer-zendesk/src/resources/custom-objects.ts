import { ConnectorError, Cursor, Fetch, Resource } from "@useairfoil/connector-kit";
import { Effect, Option, Schema } from "effect";

import type { ZendeskClientService } from "../client/client";

import {
  CustomObjectFieldObjectSchema,
  CustomObjectFieldSchema,
  CustomObjectObjectSchema,
  CustomObjectRecordObjectSchema,
  CustomObjectRecordSchema,
  CustomObjectSchema,
} from "../schemas/custom-objects";
import { hourly, listAll, listSources, readPage } from "./pages";

// It has no paging. Accounts have a few objects.
const listObjects = (client: ZendeskClientService) =>
  listAll(client, {
    path: "/custom_objects",
    key: "custom_objects",
    item: CustomObjectObjectSchema,
    params: {},
  });

export const makeCustomObjects = (client: ZendeskClientService) =>
  Resource.entity({
    name: "custom_objects",
    rowSchema: CustomObjectSchema,
    version: "version",
    ...listSources(
      listObjects(client).pipe(
        Effect.map((objects) =>
          objects.map((object) => ({ ...object, version: object.updated_at })),
        ),
      ),
    ),
  });

export const makeCustomObjectFields = (client: ZendeskClientService) =>
  Resource.entity({
    name: "custom_object_fields",
    rowSchema: CustomObjectFieldSchema,
    version: "version",
    ...listSources(
      listObjects(client).pipe(
        Effect.flatMap((objects) =>
          Effect.forEach(objects, ({ key }) =>
            listAll(client, {
              path: `/custom_objects/${key}/fields`,
              key: "custom_object_fields",
              item: CustomObjectFieldObjectSchema,
              emptyIfMissing: true,
            }).pipe(
              Effect.map((fields) =>
                fields.map((field) => ({
                  ...field,
                  version: field.updated_at,
                  custom_object_key: key,
                })),
              ),
            ),
          ),
        ),
        Effect.map((fields) => fields.flat()),
      ),
    ),
  });

// Records are read one object at a time. The cursor holds the objects still
// to read and the page in the first one.
const RecordCursor = Schema.fromJsonString(
  Schema.Struct({ keys: Schema.Array(Schema.String), after: Schema.optional(Schema.String) }),
);

const readRecords = (client: ZendeskClientService, cursor: string | undefined) =>
  Effect.gen(function* () {
    const { keys, after } =
      cursor === undefined
        ? { keys: (yield* listObjects(client)).map(({ key }) => key), after: undefined }
        : yield* Schema.decodeEffect(RecordCursor)(cursor).pipe(
            Effect.mapError(
              (cause) =>
                new ConnectorError({ message: "Invalid custom object record cursor", cause }),
            ),
          );
    const [key, ...rest] = keys;
    if (key === undefined) return { rows: [], next: undefined };
    const page = yield* readPage(
      client,
      {
        path: `/custom_objects/${key}/records`,
        key: "custom_object_records",
        item: CustomObjectRecordObjectSchema,
        emptyIfMissing: true,
      },
      Option.fromNullishOr(after),
    );
    const next = Option.match(page.next, {
      onNone: () => (rest.length === 0 ? undefined : { keys: rest }),
      onSome: (after) => ({ keys, after }),
    });
    return {
      rows: page.items.map((record) => ({ ...record, version: record.updated_at })),
      next: next === undefined ? undefined : Schema.encodeSync(RecordCursor)(next),
    };
  });

// Changes read every record again each hour. Deleted records are not caught.
export const makeCustomObjectRecords = (client: ZendeskClientService) =>
  Resource.entity({
    name: "custom_object_records",
    rowSchema: CustomObjectRecordSchema,
    version: "version",
    check: readRecords(client, undefined).pipe(Effect.asVoid),
    backfill: Fetch.page({
      pageCursor: Cursor.string(),
      cutoff: Cursor.isoDateTime(),
      fetch: ({ pageCursor }) =>
        readRecords(client, pageCursor === undefined ? undefined : String(pageCursor)).pipe(
          Effect.map(({ rows, next }) => ({
            rows,
            nextPageCursor: next,
            hasMore: next !== undefined,
          })),
        ),
    }),
    changes: Fetch.changes({
      cursor: Cursor.string(),
      interval: hourly,
      // The first cursor is the backfill cutoff.
      fetch: ({ cursor }) =>
        readRecords(client, String(cursor).startsWith("{") ? String(cursor) : undefined).pipe(
          Effect.map(({ rows, next }) => ({
            rows,
            cursor: next ?? "",
            hasMore: next !== undefined,
          })),
        ),
    }),
  });

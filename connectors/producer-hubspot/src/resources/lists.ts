import { type ConnectorError, Cursor, Fetch, Resource } from "@useairfoil/connector-kit";
import { DateTime, Duration, Effect, Option, Schema, Stream } from "effect";

import { HUBSPOT_API_VERSION, type HubSpotClientService } from "../client/client";
import { listPage } from "../schemas/api";
import {
  type List,
  ListFiltersObjectSchema,
  ListMemberObjectSchema,
  type ListObject,
  ListObjectSchema,
  ListSchema,
  type SegmentMembership,
  SegmentMembershipSchema,
} from "../schemas/lists";

const searchPath = `/crm/lists/${HUBSPOT_API_VERSION}/search`;
const pageSize = 500;
// Lists have no updated-since filter, so changes read them all.
const changesInterval = Duration.hours(1);

const ListSearchSchema = Schema.Struct({
  lists: Schema.Array(ListObjectSchema),
  offset: Schema.Number,
  hasMore: Schema.Boolean,
});

const search = (client: HubSpotClientService, offset: number, count: number) =>
  client.post(ListSearchSchema, searchPath, {
    offset,
    count,
    processingTypes: [],
    listIds: [],
    additionalProperties: ["hs_list_size"],
  });

const toRow = (list: ListObject, fetchedAt: Date): List => ({
  id: list.listId,
  version: fetchedAt,
  name: list.name,
  object_type_id: list.objectTypeId,
  processing_type: list.processingType,
  processing_status: list.processingStatus,
  size: list.additionalProperties.hs_list_size,
  created_at: list.createdAt,
  updated_at: list.updatedAt,
  filters_updated_at: list.filtersUpdatedAt,
});

// Rows use the fetch time, so each hourly read replaces them.
const listAll = (
  client: HubSpotClientService,
): Effect.Effect<ReadonlyArray<List>, ConnectorError> =>
  Stream.paginate(0, (offset: number) =>
    search(client, offset, pageSize).pipe(
      Effect.map(
        ({ body, fetchedAt }) =>
          [
            body.lists.map((list) => toRow(list, fetchedAt)),
            body.hasMore ? Option.some(body.offset) : Option.none(),
          ] as const,
      ),
    ),
  ).pipe(Stream.runCollect);

export const makeLists = (client: HubSpotClientService) =>
  Resource.entity({
    name: "lists",
    rowSchema: ListSchema,
    version: "version",

    check: search(client, 0, 1).pipe(Effect.asVoid),
    backfill: Fetch.page({
      pageCursor: Cursor.string(),
      cutoff: Cursor.isoDateTime(),
      fetch: () => listAll(client).pipe(Effect.map((rows) => ({ rows, hasMore: false }))),
    }),
    changes: Fetch.changes({
      cursor: Cursor.string(),
      interval: changesInterval,
      fetch: () =>
        Effect.all([listAll(client), DateTime.now]).pipe(
          Effect.map(([rows, now]) => ({ rows, cursor: DateTime.formatIso(now) })),
        ),
    }),
  });

const listsPath = `/crm/lists/${HUBSPOT_API_VERSION}`;
const MemberPageSchema = listPage(ListMemberObjectSchema);
// Each list row holds every member, so a page reads few lists.
const segmentPageSize = 5;

const members = (client: HubSpotClientService, listId: string) =>
  Stream.paginate(Option.none<string>(), (after) =>
    client
      .get(MemberPageSchema, `${listsPath}/${listId}/memberships`, {
        limit: "100",
        ...Option.match(after, { onNone: () => ({}), onSome: (value) => ({ after: value }) }),
      })
      .pipe(
        Effect.map(
          ({ body }) =>
            [
              body.results.map((member) => ({
                record_id: member.recordId,
                membership_timestamp: member.membershipTimestamp,
              })),
              Option.map(Option.fromNullishOr(body.paging?.next.after), Option.some),
            ] as const,
        ),
      ),
  ).pipe(Stream.runCollect);

const readSegment = (client: HubSpotClientService, list: ListObject) =>
  Effect.gen(function* () {
    const { body, fetchedAt } = yield* client.get(
      ListFiltersObjectSchema,
      `${listsPath}/${list.listId}`,
      { includeFilters: "true" },
    );
    return {
      id: list.listId,
      version: fetchedAt,
      object_type_id: list.objectTypeId,
      filter: body.list.filterBranch ?? null,
      members: yield* members(client, list.listId),
    } satisfies SegmentMembership;
  });

const readSegments = (client: HubSpotClientService, offset: number) =>
  search(client, offset, segmentPageSize).pipe(
    Effect.flatMap(({ body }) =>
      Effect.forEach(body.lists, (list) => readSegment(client, list)).pipe(
        Effect.map((rows) => ({ rows, next: body.hasMore ? body.offset : undefined })),
      ),
    ),
  );

export const makeSegmentMemberships = (client: HubSpotClientService) =>
  Resource.entity({
    name: "segment_memberships",
    rowSchema: SegmentMembershipSchema,
    version: "version",

    check: search(client, 0, 1).pipe(
      Effect.flatMap(({ body }) =>
        Effect.forEach(body.lists, ({ listId }) =>
          client.get(MemberPageSchema, `${listsPath}/${listId}/memberships`, { limit: "1" }),
        ),
      ),
      Effect.asVoid,
    ),
    backfill: Fetch.page({
      pageCursor: Cursor.string(),
      cutoff: Cursor.isoDateTime(),
      fetch: ({ pageCursor }) =>
        readSegments(client, typeof pageCursor === "string" ? Number(pageCursor) : 0).pipe(
          Effect.map(({ rows, next }) => ({
            rows,
            nextPageCursor: next === undefined ? undefined : String(next),
            hasMore: next !== undefined,
          })),
        ),
    }),
    // The first cursor is the backfill cutoff.
    changes: Fetch.changes({
      cursor: Cursor.string(),
      interval: Duration.days(1),
      fetch: ({ cursor }) =>
        readSegments(
          client,
          String(cursor).startsWith("offset:") ? Number(String(cursor).slice(7)) : 0,
        ).pipe(
          Effect.map(({ rows, next }) => ({
            rows,
            cursor: next === undefined ? "" : `offset:${next}`,
            hasMore: next !== undefined,
          })),
        ),
    }),
  });

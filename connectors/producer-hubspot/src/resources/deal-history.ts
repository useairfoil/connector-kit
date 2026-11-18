import { Cursor, Fetch, Resource } from "@useairfoil/connector-kit";
import { Duration, Effect } from "effect";

import type { HubSpotClientService } from "../client/client";

import { DealHistoryPageSchema, type PropertyChange } from "../schemas/api";
import { type DealPropertyHistory, DealPropertyHistorySchema } from "../schemas/crm";
import { objectsPath } from "./crm/read";

const dealsPath = objectsPath("deals");
// HubSpot returns history for at most 50 records per page.
const pageSize = "50";
// History has no updated-since filter, so changes read every deal once a day.
const changesInterval = Duration.days(1);

const toChanges = (changes: ReadonlyArray<PropertyChange> = []) =>
  changes.map((change) => ({
    value: change.value,
    timestamp: change.timestamp,
    source_type: change.sourceType,
    source_id: change.sourceId,
  }));

const readHistory = (client: HubSpotClientService, limit: string, after?: string) =>
  client
    .get(DealHistoryPageSchema, dealsPath, {
      limit,
      propertiesWithHistory: "dealstage,hubspot_owner_id",
      ...(after === undefined ? {} : { after }),
    })
    .pipe(
      Effect.map(({ body, fetchedAt }) => ({
        rows: body.results.map(
          ({ id, propertiesWithHistory }): DealPropertyHistory => ({
            id,
            version: fetchedAt,
            dealstage: toChanges(propertiesWithHistory.dealstage),
            hubspot_owner_id: toChanges(propertiesWithHistory.hubspot_owner_id),
          }),
        ),
        next: body.paging?.next.after,
      })),
    );

export const makeDealPropertyHistory = (client: HubSpotClientService) =>
  Resource.entity({
    name: "deal_property_history",
    rowSchema: DealPropertyHistorySchema,
    version: "version",

    check: readHistory(client, "1").pipe(Effect.asVoid),
    backfill: Fetch.page({
      pageCursor: Cursor.string(),
      cutoff: Cursor.isoDateTime(),
      fetch: ({ pageCursor }) =>
        readHistory(client, pageSize, typeof pageCursor === "string" ? pageCursor : undefined).pipe(
          Effect.map(({ rows, next }) => ({
            rows,
            nextPageCursor: next,
            hasMore: next !== undefined,
          })),
        ),
    }),
    // The first cursor is the backfill cutoff.
    changes: Fetch.changes({
      cursor: Cursor.string(),
      interval: changesInterval,
      fetch: ({ cursor }) =>
        readHistory(
          client,
          pageSize,
          String(cursor).startsWith("after:") ? String(cursor).slice(6) : undefined,
        ).pipe(
          Effect.map(({ rows, next }) => ({
            rows,
            cursor: next === undefined ? "" : `after:${next}`,
            hasMore: next !== undefined,
          })),
        ),
    }),
  });

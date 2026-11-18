import { Cursor, Fetch, Resource } from "@useairfoil/connector-kit";
import { DateTime, Duration, Effect } from "effect";

import type { SalesforceClientService } from "../client/client";

import { IdQuerySchema } from "../schemas/api";
import { FileLinkSchema as Link, FileLinksSchema } from "../schemas/file-links";
import { queryRecords } from "./read";

export { FileLinksSchema } from "../schemas/file-links";

const pageSize = 100;
// The first changes cursor is the backfill cutoff, so file IDs carry a prefix.
const cursorPrefix = "file:";

/**
 * Reads files in ID order with all their links. `ContentDocumentLink` can only
 * be queried by file or record IDs, so every file is read again.
 */
const readPage = (client: SalesforceClientService, after: string | undefined) =>
  Effect.gen(function* () {
    const { body } = yield* client.get(IdQuerySchema, "/query", {
      q: `SELECT Id FROM ContentDocument${after === undefined ? "" : ` WHERE Id > '${after}'`} ORDER BY Id LIMIT ${pageSize}`,
    });
    const ids = body.records.map((record) => record.Id);
    if (ids.length === 0) return { rows: [], next: undefined };
    const links = yield* queryRecords(
      client,
      Link,
      `SELECT ${Object.keys(Link.fields).join(", ")} FROM ContentDocumentLink WHERE ContentDocumentId IN (${ids.map((id) => `'${id}'`).join(",")})`,
    );
    const byFile = Object.groupBy(links, (link) => link.ContentDocumentId);
    const version = yield* DateTime.nowAsDate;
    return {
      rows: ids.map((id) => ({ id, version, links: byFile[id] ?? [] })),
      next: ids.length === pageSize ? ids[ids.length - 1] : undefined,
    };
  });

export const makeFileLinks = (client: SalesforceClientService) =>
  Resource.entity({
    name: "content_document_links",
    rowSchema: FileLinksSchema,
    version: "version",

    check: client
      .get(IdQuerySchema, "/query", { q: "SELECT Id FROM ContentDocument LIMIT 1" })
      .pipe(Effect.asVoid),
    backfill: Fetch.page({
      pageCursor: Cursor.string(),
      cutoff: Cursor.isoDateTime(),
      fetch: ({ pageCursor }) =>
        readPage(client, typeof pageCursor === "string" ? pageCursor : undefined).pipe(
          Effect.map(({ rows, next }) => ({
            rows,
            nextPageCursor: next,
            hasMore: next !== undefined,
          })),
        ),
    }),
    changes: Fetch.changes({
      cursor: Cursor.string(),
      interval: Duration.days(1),
      fetch: ({ cursor }) => {
        const value = String(cursor);
        return readPage(
          client,
          value.startsWith(cursorPrefix) ? value.slice(cursorPrefix.length) : undefined,
        ).pipe(
          Effect.map(({ rows, next }) => ({
            rows,
            cursor: next === undefined ? "" : `${cursorPrefix}${next}`,
            hasMore: next !== undefined,
          })),
        );
      },
    }),
  });

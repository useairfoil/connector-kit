import { Cursor, Fetch, Resource } from "@useairfoil/connector-kit";
import { Duration, Effect, Schema } from "effect";

import type { SalesforceClientService } from "../client/client";
import type { Describer } from "./describe";

import { IdQuerySchema } from "../schemas/api";
import { objectSchema } from "../schemas/objects";
import { queryRecords, readRows } from "./read";

const object = "Knowledge__kav";
const pageSize = 50;
// The first changes cursor is the backfill cutoff, so article IDs carry a prefix.
const cursorPrefix = "knowledge:";

const IdRecord = Schema.Struct({ Id: Schema.String });

export const KnowledgeVersionSchema = objectSchema(object);

/**
 * Reads articles in ID order with all their versions and translations.
 * Archived versions only come back when asked for by article, so every
 * article is read again each hour.
 */
const readPage = (
  client: SalesforceClientService,
  describer: Describer,
  after: string | undefined,
) =>
  Effect.gen(function* () {
    const { body } = yield* client.get(IdQuerySchema, "/query", {
      q: `SELECT Id FROM Knowledge__ka${after === undefined ? "" : ` WHERE Id > '${after}'`} ORDER BY Id LIMIT ${pageSize}`,
    });
    const ids = body.records.map((record) => record.Id);
    if (ids.length === 0) return { rows: [], next: undefined };
    const articles = `KnowledgeArticleId IN (${ids.map((id) => `'${id}'`).join(",")})`;
    const current = yield* queryRecords(
      client,
      IdRecord,
      `SELECT Id FROM ${object} WHERE ${articles}`,
    );
    const archived = yield* queryRecords(
      client,
      IdRecord,
      `SELECT Id FROM ${object} WHERE ${articles} AND PublishStatus = 'Archived' AND IsLatestVersion = false`,
    );
    const versionIds = [...new Set([...current, ...archived].map((record) => record.Id))];
    return {
      rows: yield* readRows(client, describer, object, versionIds),
      next: ids.length === pageSize ? ids[ids.length - 1] : undefined,
    };
  });

export const makeKnowledgeVersions = (client: SalesforceClientService, describer: Describer) =>
  Resource.entity({
    name: "knowledge_article_versions",
    rowSchema: KnowledgeVersionSchema,
    version: "version",

    check: describer.describe(object).pipe(Effect.asVoid),
    backfill: Fetch.page({
      pageCursor: Cursor.string(),
      cutoff: Cursor.isoDateTime(),
      fetch: ({ pageCursor }) =>
        readPage(client, describer, typeof pageCursor === "string" ? pageCursor : undefined).pipe(
          Effect.map(({ rows, next }) => ({
            rows,
            nextPageCursor: next,
            hasMore: next !== undefined,
          })),
        ),
    }),
    changes: Fetch.changes({
      cursor: Cursor.string(),
      interval: Duration.hours(1),
      fetch: ({ cursor }) => {
        const value = String(cursor);
        return readPage(
          client,
          describer,
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

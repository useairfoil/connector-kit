import { ConnectorError, Cursor, Fetch, Resource } from "@useairfoil/connector-kit";
import { Duration, Effect, Schema } from "effect";

import type { HubSpotClientService } from "../client/client";

import { listPage } from "../schemas/api";
import { type CommerceLink, CommerceLinkSchema, PeerLinkSchema } from "../schemas/links";
import { objectsPath, readAssociations } from "./crm/read";

type Route = { readonly from: string; readonly targets: ReadonlyArray<string> };

const commerceRoutes: ReadonlyArray<Route> = [
  { from: "quotes", targets: ["line_items"] },
  { from: "orders", targets: ["line_items"] },
  { from: "invoices", targets: ["line_items"] },
  { from: "subscriptions", targets: ["line_items"] },
  { from: "commerce_payments", targets: ["orders", "invoices"] },
];

const peerRoutes: ReadonlyArray<Route> = [
  { from: "companies", targets: ["companies"] },
  { from: "contacts", targets: ["contacts"] },
];

// Links have no updated-since filter, so changes read them all once a day.
const changesInterval = Duration.days(1);
const IdPageSchema = listPage(Schema.Struct({ id: Schema.String }));

const PositionSchema = Schema.fromJsonString(
  Schema.Struct({ route: Schema.Int, after: Schema.optional(Schema.String) }),
);

const cursorError = (cause: unknown) =>
  new ConnectorError({ message: "Invalid HubSpot links cursor", cause });

const readPage = (
  client: HubSpotClientService,
  routes: ReadonlyArray<Route>,
  cursor: string | undefined,
  limit = "100",
) =>
  Effect.gen(function* () {
    const position = cursor
      ? yield* Schema.decodeUnknownEffect(PositionSchema)(cursor).pipe(Effect.mapError(cursorError))
      : { route: 0, after: undefined };
    const route = routes[position.route];
    if (route === undefined) return { rows: [], next: undefined };
    const { body, fetchedAt } = yield* client.get(IdPageSchema, objectsPath(route.from), {
      limit,
      ...(position.after === undefined ? {} : { after: position.after }),
    });
    const ids = body.results.map(({ id }) => id);
    const found =
      ids.length === 0
        ? []
        : yield* Effect.forEach(route.targets, (target) =>
            readAssociations(client, route.from, target, ids).pipe(
              Effect.map((links) => ({ target, links })),
            ),
          );
    const rows = ids.map(
      (id): CommerceLink => ({
        id: `${route.from}:${id}`,
        version: fetchedAt,
        object_type: route.from,
        object_id: id,
        links: found.flatMap(({ target, links }) =>
          (links[id] ?? []).map((link) => ({
            object_type: target,
            object_id: link.toObjectId,
            labels: (link.associationTypes ?? []).map((type) => ({
              type_id: type.typeId,
              category: type.category,
              label: type.label,
            })),
          })),
        ),
      }),
    );
    const after = body.paging?.next.after;
    const nextRoute = after === undefined ? position.route + 1 : position.route;
    const next =
      nextRoute < routes.length
        ? yield* Schema.encodeEffect(PositionSchema)({ route: nextRoute, after }).pipe(
            Effect.mapError(cursorError),
          )
        : undefined;
    return { rows, next };
  });

const linkResource = (
  client: HubSpotClientService,
  name: string,
  rowSchema: typeof CommerceLinkSchema,
  routes: ReadonlyArray<Route>,
) =>
  Resource.entity({
    name,
    rowSchema,
    version: "version",

    // Reads one record and its links per route, since links need both scopes.
    check: Effect.forEach(
      routes,
      (_, route) =>
        Schema.encodeEffect(PositionSchema)({ route }).pipe(
          Effect.mapError(cursorError),
          Effect.flatMap((cursor) => readPage(client, routes, cursor, "1")),
        ),
      { discard: true },
    ),
    backfill: Fetch.page({
      pageCursor: Cursor.string(),
      cutoff: Cursor.isoDateTime(),
      fetch: ({ pageCursor }) =>
        readPage(client, routes, typeof pageCursor === "string" ? pageCursor : undefined).pipe(
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
        readPage(client, routes, String(cursor).startsWith("{") ? String(cursor) : undefined).pipe(
          Effect.map(({ rows, next }) => ({
            rows,
            cursor: next ?? "",
            hasMore: next !== undefined,
          })),
        ),
    }),
  });

export const makeCommerceLinks = (client: HubSpotClientService) =>
  linkResource(client, "commerce_links", CommerceLinkSchema, commerceRoutes);

export const makePeerLinks = (client: HubSpotClientService) =>
  linkResource(client, "peer_links", PeerLinkSchema, peerRoutes);

import type { IcebergCatalog } from "@useairfoil/effect-iceberg";

import { CatalogManager } from "@useairfoil/api";
import { Effect, Schema } from "effect";

import { EngineUri } from "./options";

const NamespaceSegments = Schema.NonEmptyArray(Schema.NonEmptyString);
const TableSegments = Schema.Array(Schema.NonEmptyString).check(Schema.isMinLength(2));

export const parseNamespaceIdentifier = (name: string) =>
  Schema.decodeUnknownEffect(NamespaceSegments)(name.split(".")).pipe(
    Effect.map((namespace) => ({ namespace: Array.from(namespace) })),
  );

export const parseTableIdentifier = (qualifiedName: string) =>
  Schema.decodeUnknownEffect(TableSegments)(qualifiedName.split(".")).pipe(
    Effect.map((segments) => ({
      namespace: segments.slice(0, -1),
      name: segments[segments.length - 1]!,
    })),
  );

export const getIcebergCatalog = Effect.fn("getIcebergCatalog")(function* (catalogId: string) {
  const baseUrl = yield* EngineUri;
  const manager = yield* CatalogManager.make({ baseUrl });

  return yield* manager.getIcebergCatalog(catalogId);
});

export const listAllNamespaces = Effect.fn("listAllNamespaces")(function* (
  iceberg: IcebergCatalog.Service,
) {
  let page = yield* iceberg.listNamespaces();
  const namespaces = [...page.namespaces];

  while (page.nextPageToken !== undefined) {
    page = yield* iceberg.listNamespaces({ pageToken: page.nextPageToken });
    namespaces.push(...page.namespaces);
  }

  return namespaces;
});

export const listAllTables = Effect.fn("listAllTables")(function* (
  iceberg: IcebergCatalog.Service,
  namespace: Parameters<IcebergCatalog.Service["listTables"]>[0],
) {
  let page = yield* iceberg.listTables(namespace);
  const identifiers = [...page.identifiers];

  while (page.nextPageToken !== undefined) {
    page = yield* iceberg.listTables(namespace, { pageToken: page.nextPageToken });
    identifiers.push(...page.identifiers);
  }

  return identifiers;
});

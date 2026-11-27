import { describe, expect, it } from "@effect/vitest";
import { TestEngine } from "@useairfoil/testing";
import { tableFromArrays } from "apache-arrow";
import { Effect } from "effect";
import { FetchHttpClient } from "effect/http";

import { CatalogManager } from "../src";

describe("CatalogManager", () => {
  it.effect(
    "manages a catalog and exposes its Iceberg REST client",
    () =>
      Effect.gen(function* () {
        const engine = yield* TestEngine.Instance;
        const uri = yield* engine.uri;
        const icebergRestUri = yield* engine.icebergRestUri;
        const engineIcebergRestUri = yield* engine.engineIcebergRestUri;
        const manager = yield* CatalogManager.make({ engineUri: uri });
        const catalogId = "0196f8f0-0000-7000-8000-000000000001";
        const request = {
          id: catalogId,
          rest: {
            uri: icebergRestUri,
            warehouse: "s3://default-catalog",
            properties: { scope: "integration", stale: "remove-me" },
          },
        };

        expect(yield* manager.createCatalog(request)).toBeUndefined();

        const catalog = yield* manager.getCatalog(request.id);
        expect(catalog).toMatchInlineSnapshot(
          {
            rest: { uri: expect.any(String) },
          },
          `
          {
            "id": "0196f8f0-0000-7000-8000-000000000001",
            "rest": {
              "properties": {
                "scope": "integration",
                "stale": "remove-me",
              },
              "uri": Any<String>,
              "warehouse": "s3://default-catalog",
            },
          }
        `,
        );

        expect(
          yield* manager.updateCatalog(request.id, {
            rest: {
              properties: {
                scope: "updated",
                added: "value",
                stale: null,
              },
            },
          }),
        ).toBeUndefined();

        const updatedCatalog = yield* manager.getCatalog(request.id);
        expect(updatedCatalog.rest.properties).toEqual({
          scope: "updated",
          added: "value",
        });

        const reservedError = yield* Effect.flip(
          manager.updateCatalog(request.id, {
            rest: { properties: { uri: "http://other.example" } },
          }),
        );
        expect(reservedError.status).toBe(400);

        const iceberg = yield* manager.getIcebergCatalog(request.id);
        const config = yield* iceberg.loadConfig();
        expect(config).toMatchInlineSnapshot(`
          {
            "defaults": {
              "warehouse": "s3://default-catalog",
            },
            "overrides": {
              "prefix": "default-catalog",
            },
          }
        `);

        yield* iceberg.createNamespaceIfNotExists({ namespace: ["default"] });
        const createdTable = yield* iceberg.createTable(
          { namespace: ["default"] },
          {
            name: "events",
            schema: {
              type: "struct",
              fields: [{ id: 1, name: "id", type: "double", required: false }],
            },
            properties: { "format-version": "3" },
          },
        );
        // Both registrations refer to the same catalog, from different networks.
        const ingestionCatalog = "0196f8f0-0000-7000-8000-000000000002";
        yield* manager.createCatalog({
          id: ingestionCatalog,
          rest: { ...request.rest, uri: engineIcebergRestUri },
        });

        const unresolvedError = yield* Effect.flip(
          manager.getTableStatus(ingestionCatalog, createdTable["table-uuid"]),
        );
        expect(unresolvedError.status).toBe(404);

        const ingestor = yield* manager.ingestor({
          catalog: ingestionCatalog,
          namespace: ["default"],
          table: "events",
        });
        yield* ingestor.push(tableFromArrays({ id: [1] }).batches[0]!);

        const status = yield* manager.getTableStatus(ingestionCatalog, createdTable["table-uuid"]);
        expect(status).toMatchObject({
          table_uuid: createdTable["table-uuid"],
          table_ident: { namespace: ["default"], name: "events" },
          lifecycle: "active",
          health: "healthy",
          ingestion: {
            wal: {
              accepted_next_sequence: 1,
            },
          },
          maintenance: {
            deletion: { state: "idle", failure: null },
          },
        });

        yield* manager.deleteCatalog(ingestionCatalog);
        yield* manager.deleteCatalog(request.id);

        const error = yield* Effect.flip(manager.getCatalog(request.id));
        expect(error.status).toBe(404);
      }).pipe(
        Effect.provide(FetchHttpClient.layer),
        Effect.provide(TestEngine.container),
        Effect.scoped,
      ),
    { timeout: 120_000 },
  );
});

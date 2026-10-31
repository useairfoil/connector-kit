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
        const manager = yield* CatalogManager.make({ baseUrl: uri });
        const request = {
          id: "integration-test",
          rest: {
            uri: icebergRestUri,
            warehouse: "s3://default-catalog",
            properties: { scope: "integration" },
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
            "id": "integration-test",
            "rest": {
              "properties": {
                "scope": "integration",
              },
              "uri": Any<String>,
              "warehouse": "s3://default-catalog",
            },
          }
        `,
        );

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
        yield* iceberg.createTable(
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
        const ingestionCatalog = "integration-ingestion";
        yield* manager.createCatalog({
          id: ingestionCatalog,
          rest: { ...request.rest, uri: engineIcebergRestUri },
        });
        const ingestor = yield* manager.ingestor({
          catalog: ingestionCatalog,
          namespace: ["default"],
          table: "events",
        });
        yield* ingestor.push(tableFromArrays({ id: [1] }).batches[0]!);

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

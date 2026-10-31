import { describe, expect, it } from "@effect/vitest";
import { CatalogManager } from "@useairfoil/api";
import { TestEngine } from "@useairfoil/testing";
import { Effect, Schema } from "effect";
import { FetchHttpClient } from "effect/http";

import { Connector, Iceberg, Ingestor, Resource } from "../src";

const Row = Schema.Struct({
  id: Schema.String.pipe(Iceberg.field(1)),
  version: Schema.BigInt.pipe(Iceberg.field(2)),
  name: Schema.String.pipe(Iceberg.field(3)),
}).pipe(Iceberg.identifier("id"));
const source = Connector.define({
  name: "current-engine",
  resources: [
    Resource.entity({ name: "events", rowSchema: Row, version: "version", check: Effect.void }),
  ],
});

describe("Arrow Flight storage-engine connector ingestion", () => {
  it.live(
    "creates namespace and v3 schema, ingests, materializes, and publishes an upsert table",
    () =>
      Effect.gen(function* () {
        const engine = yield* TestEngine.Instance;
        const uri = yield* engine.uri;
        const upstream = yield* engine.icebergRestUri;
        const engineUpstream = yield* engine.engineIcebergRestUri;
        const manager = yield* CatalogManager.make({ baseUrl: uri });
        const id = "connector-startup";
        yield* manager.createCatalog({
          id,
          rest: {
            uri: engineUpstream,
            warehouse: "s3://default-catalog",
            properties: {
              "s3.endpoint": "http://seaweedfs:8333",
              "s3.region": "us-east-1",
              "s3.access-key-id": engine.accessKeyId,
              "s3.secret-access-key": engine.secretAccessKey,
              "s3.path-style-access": "true",
            },
          },
        });
        const hostCatalogId = `${id}-host`;
        yield* manager.createCatalog({
          id: hostCatalogId,
          rest: { uri: upstream, warehouse: "s3://default-catalog" },
        });
        const catalog = yield* manager.getIcebergCatalog(hostCatalogId);
        const identifier = { namespace: ["startup"], name: "events" };
        yield* Ingestor.Ingestor.use((ingestor) =>
          ingestor.ingest({
            resource: "events",
            source: "backfill",
            batch: { rows: [{ id: "event-1", version: 1n, name: "First" }] },
          }),
        ).pipe(
          Effect.provide(
            Ingestor.layerArrowFlight({
              connector: source,
              catalog: id,
              tables: { events: identifier },
            }),
          ),
          Effect.provideService(CatalogManager.CatalogManager, {
            ...manager,
            // Table preparation runs on the host; ingestion resolves the engine registration.
            getIcebergCatalog: () => Effect.succeed(catalog),
          }),
        );
        yield* engine.materializeAndCommit(id, identifier);
        const metadata = yield* catalog.loadTable(identifier);
        expect(metadata["format-version"]).toBe(3);
        expect(
          metadata.schemas.find(
            (schema) => schema["schema-id"] === metadata["current-schema-id"],
          )?.["identifier-field-ids"],
        ).toEqual([1]);
        expect(metadata.snapshots?.at(-1)?.summary?.["total-records"]).toBe("1");
      }).pipe(
        Effect.provide(FetchHttpClient.layer),
        Effect.provide(TestEngine.container),
        Effect.scoped,
      ),
    { timeout: 120_000 },
  );
});

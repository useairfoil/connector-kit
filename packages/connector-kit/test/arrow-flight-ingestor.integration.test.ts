import { NodeServices } from "@effect/platform-node";
import { describe, expect, it } from "@effect/vitest";
import { CatalogManager } from "@useairfoil/api";
import { TestEngine } from "@useairfoil/testing";
import { ConfigProvider, Effect, Schema } from "effect";
import { Command } from "effect/cli";
import { FetchHttpClient } from "effect/http";
import { getCurrentSchema } from "iceberg-js";

import { Connector, Iceberg, Ingestor, Resource } from "../src";
import { makeDemoCommand, makeSetupCommand } from "../src/connector-app";
import * as Demo from "../src/demo";

const Row = Schema.Struct({
  id: Schema.String,
  version: Schema.BigInt,
  name: Schema.String,
  at: Schema.Date,
  flag: Schema.NullOr(Schema.Boolean),
  attributes: Schema.ReadonlyMap(Schema.String, Schema.String),
}).pipe(Iceberg.identifier("id"));
const source = Connector.define({
  name: "current-engine",
  resources: [
    Resource.entity({ name: "events", rowSchema: Row, version: "version", check: Effect.void }),
  ],
});

describe("Arrow Flight storage-engine connector ingestion", () => {
  it.live(
    "sets up tables and publishes rows through Arrow Flight",
    () =>
      Effect.gen(function* () {
        const engine = yield* TestEngine.Instance;
        const uri = yield* engine.uri;
        const upstream = yield* engine.icebergRestUri;
        const engineUpstream = yield* engine.engineIcebergRestUri;
        const manager = yield* CatalogManager.make({ engineUri: uri });
        const id = "connector-startup";
        const storageProperties = {
          "s3.endpoint": "http://seaweedfs:8333",
          "s3.region": "us-east-1",
          "s3.access-key-id": engine.accessKeyId,
          "s3.secret-access-key": engine.secretAccessKey,
          "s3.path-style-access": "true",
        };
        yield* manager.createCatalog({
          id,
          rest: {
            uri: engineUpstream,
            warehouse: "s3://default-catalog",
            properties: storageProperties,
          },
        });
        const hostCatalogId = `${id}-host`;
        yield* manager.createCatalog({
          id: hostCatalogId,
          rest: {
            uri: upstream,
            warehouse: "s3://default-catalog",
            properties: storageProperties,
          },
        });
        const catalog = yield* manager.getIcebergCatalog(hostCatalogId);
        const identifier = { namespace: ["startup"], name: "events" };
        const setup = (table: typeof identifier) =>
          Command.runWith(makeSetupCommand({ events: Row }), {
            version: "1.0.0",
            renderErrors: false,
          })(["--checkpoint-interval-sec", "0"]).pipe(
            Effect.provide(NodeServices.layer),
            Effect.provide(
              ConfigProvider.layer(
                ConfigProvider.fromUnknown({
                  ENGINE_URI: uri,
                  AIRFOIL_CATALOG: hostCatalogId,
                  AIRFOIL_TABLE_BINDINGS: JSON.stringify({ events: table }),
                }),
              ),
            ),
          );
        yield* setup(identifier);

        yield* Ingestor.Ingestor.use((ingestor) =>
          ingestor.ingest({
            resource: "events",
            source: "backfill",
            batch: {
              rows: [
                {
                  id: "event-1",
                  version: 1n,
                  name: "First",
                  at: new Date("2026-10-01"),
                  attributes: new Map([["key", "value"]]),
                },
              ],
            },
          }),
        ).pipe(
          Effect.provide(Ingestor.layerArrowFlightConfig(source)),
          Effect.provide(
            ConfigProvider.layer(
              ConfigProvider.fromUnknown({
                ENGINE_URI: uri,
                FLIGHT_URI: uri,
                AIRFOIL_CATALOG: id,
                AIRFOIL_TABLE_BINDINGS: JSON.stringify({ events: identifier }),
              }),
            ),
          ),
        );
        yield* engine.materializeAndCommit(id, identifier);
        const metadata = yield* catalog.loadTable(identifier);
        expect(metadata["format-version"]).toBe(3);
        const storedSchema = getCurrentSchema(metadata);
        expect(
          storedSchema?.fields
            .filter((field) => storedSchema["identifier-field-ids"]?.includes(field.id))
            .map((field) => field.name),
        ).toEqual(["id"]);
        expect(metadata.snapshots?.at(-1)?.summary?.["total-records"]).toBe("1");

        const demo = Demo.define({
          name: "checkpoint-test",
          setup: {
            tables: [Demo.table({ name: "events", rowSchema: Row, version: "version" })],
            rows: () => ({
              events: Array.from({ length: 5 }, (_, index) => ({
                id: `demo-${index}`,
                version: 1n,
                name: "Demo",
              })),
            }),
          },
          group: { tables: [], rows: () => ({}) },
        });
        const table = { namespace: ["startup"], name: "demo" };
        yield* setup(table);
        const runDemo = (batchSize = 2) =>
          Command.runWith(makeDemoCommand(demo), { version: "1.0.0", renderErrors: false })([
            "--size",
            "1B",
            "--batch-size",
            String(batchSize),
          ]).pipe(
            Effect.provide(NodeServices.layer),
            Effect.provide(
              ConfigProvider.layer(
                ConfigProvider.fromUnknown({
                  ENGINE_URI: uri,
                  FLIGHT_URI: uri,
                  AIRFOIL_CATALOG: id,
                  AIRFOIL_TABLE_BINDINGS: JSON.stringify({ events: table }),
                }),
              ),
            ),
          );
        for (const invalid of [0, -1, 1.5]) {
          const error = yield* runDemo(invalid).pipe(Effect.flip);
          expect(error).toMatchObject({
            _tag: "ShowHelp",
            errors: [{ _tag: "InvalidValue", option: "batch-size" }],
          });
        }
        yield* runDemo();
        yield* engine.materializeAndCommit(id, table);
        const stored = yield* catalog.loadTable(table);
        expect(stored.snapshots?.at(-1)?.summary?.["total-records"]).toBe("5");

        const missing = yield* Ingestor.Ingestor.use((ingestor) =>
          ingestor.ingest({
            resource: "events",
            source: "demo",
            batch: { rows: [{ id: "missing", version: 1n }] },
          }),
        ).pipe(
          Effect.provide(
            Ingestor.layerArrowFlight({
              connector: source,
              catalog: id,
              tables: { events: { ...identifier, name: "missing" } },
            }),
          ),
          Effect.provideService(CatalogManager.CatalogManager, manager),
          Effect.flip,
        );
        expect(missing.message).toContain("Failed to ingest rows");
      }).pipe(
        Effect.provide(FetchHttpClient.layer),
        Effect.provide(TestEngine.container),
        Effect.scoped,
      ),
    { timeout: 120_000 },
  );
});

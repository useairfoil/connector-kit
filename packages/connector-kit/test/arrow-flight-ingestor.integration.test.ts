import { NodeServices } from "@effect/platform-node";
import { describe, expect, it } from "@effect/vitest";
import { CatalogManager } from "@useairfoil/api";
import { TestEngine } from "@useairfoil/testing";
import { ConfigProvider, Effect, Schema } from "effect";
import { Command } from "effect/cli";
import { FetchHttpClient } from "effect/http";
import { createServer } from "node:http";

import { Connector, Iceberg, Ingestor, Resource } from "../src";
import { makeDemoCommand } from "../src/connector-app";
import * as Demo from "../src/demo";

const Row = Schema.Struct({
  id: Schema.String,
  version: Schema.BigInt,
  name: Schema.String,
}).pipe(Iceberg.identifier("id"));
const source = Connector.define({
  name: "current-engine",
  resources: [
    Resource.entity({ name: "events", rowSchema: Row, version: "version", check: Effect.void }),
  ],
});

describe("Arrow Flight storage-engine connector ingestion", () => {
  it.live(
    "creates and publishes an upsert table with separate catalog discovery and Flight endpoints",
    () =>
      Effect.gen(function* () {
        const engine = yield* TestEngine.Instance;
        const uri = yield* engine.uri;
        const upstream = yield* engine.icebergRestUri;
        const engineUpstream = yield* engine.engineIcebergRestUri;
        const manager = yield* CatalogManager.make({ engineUri: uri });
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
        const discovery = yield* Effect.acquireRelease(
          Effect.tryPromise(async () => {
            const server = createServer((request, response) => {
              if (request.url !== `/catalogs/${id}`) {
                response.writeHead(404).end();
                return;
              }
              response.setHeader("content-type", "application/json");
              response.end(
                JSON.stringify({ id, rest: { uri: upstream, warehouse: "s3://default-catalog" } }),
              );
            });
            await new Promise<void>((resolve, reject) => {
              server.once("error", reject);
              server.listen(0, "127.0.0.1", resolve);
            });
            return server;
          }),
          (server) =>
            Effect.promise(() => new Promise<void>((resolve) => server.close(() => resolve()))),
        );
        const address = discovery.address();
        if (address === null || typeof address === "string")
          throw new Error("Missing discovery server address");

        yield* Ingestor.Ingestor.use((ingestor) =>
          ingestor.ingest({
            resource: "events",
            source: "backfill",
            batch: { rows: [{ id: "event-1", version: 1n, name: "First" }] },
          }),
        ).pipe(
          Effect.provide(Ingestor.layerArrowFlightConfig(source)),
          Effect.provide(
            ConfigProvider.layer(
              ConfigProvider.fromUnknown({
                ENGINE_URI: `http://127.0.0.1:${address.port}`,
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
        expect(
          metadata.schemas.find(
            (schema) => schema["schema-id"] === metadata["current-schema-id"],
          )?.["identifier-field-ids"],
        ).toEqual([1]);
        expect(metadata.snapshots?.at(-1)?.summary?.["total-records"]).toBe("1");

        const demo = Demo.define({
          name: "checkpoint-test",
          setup: {
            tables: [Demo.table({ name: "events", rowSchema: Row, version: "version" })],
            rows: () => ({ events: [{ id: "demo-1", version: 1n, name: "Demo" }] }),
          },
          group: { tables: [], rows: () => ({}) },
        });
        for (const seconds of [undefined, 0, 17, 900]) {
          const table = { namespace: ["startup"], name: `demo_${seconds ?? "default"}` };
          const run = (interval?: number) =>
            Command.runWith(makeDemoCommand(demo), { version: "1.0.0", renderErrors: false })([
              "--size",
              "1B",
              ...(interval === undefined ? [] : ["--checkpoint-interval-sec", String(interval)]),
            ]).pipe(
              Effect.provide(NodeServices.layer),
              Effect.provide(
                ConfigProvider.layer(
                  ConfigProvider.fromUnknown({
                    ENGINE_URI: `http://127.0.0.1:${address.port}`,
                    FLIGHT_URI: uri,
                    AIRFOIL_CATALOG: id,
                    AIRFOIL_TABLE_BINDINGS: JSON.stringify({ events: table }),
                  }),
                ),
              ),
            );

          if (seconds === undefined) {
            for (const invalid of [-1, 901, 1.5]) {
              const error = yield* run(invalid).pipe(Effect.flip);
              expect(error).toMatchObject({
                _tag: "ShowHelp",
                errors: [{ _tag: "InvalidValue", option: "checkpoint-interval-sec" }],
              });
            }
          }
          yield* run(seconds);
          // A later run must not change the properties of an existing table.
          yield* run(seconds === 900 ? 0 : 900);
          if (seconds === 0) yield* engine.materializeAndCommit(id, table);
          const stored = yield* catalog.loadTable(table);
          expect(stored.properties?.["airfoil.checkpoint.interval-sec"]).toBe(
            seconds === undefined ? undefined : String(seconds),
          );
          if (seconds === 0) {
            expect(stored.snapshots?.at(-1)?.summary?.["total-records"]).toBe("1");
          }
        }
      }).pipe(
        Effect.provide(FetchHttpClient.layer),
        Effect.provide(TestEngine.container),
        Effect.scoped,
      ),
    { timeout: 120_000 },
  );
});

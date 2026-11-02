import { NodeServices } from "@effect/platform-node";
import { describe, expect, it } from "@effect/vitest";
import { CatalogManager } from "@useairfoil/api";
import { TestEngine } from "@useairfoil/testing";
import { ConfigProvider, Effect, Schema } from "effect";
import { Command } from "effect/cli";
import { FetchHttpClient } from "effect/http";
import { getCurrentSchema } from "iceberg-js";

import { makeSetupCommand } from "../src/connector-app";
import * as Iceberg from "../src/iceberg";

const Row = Schema.Struct({ id: Schema.String, version: Schema.BigInt }).pipe(
  Iceberg.identifier("id"),
);

const fixture = Effect.gen(function* () {
  const engine = yield* TestEngine.Instance;
  const uri = yield* engine.uri;
  const manager = yield* CatalogManager.make({ engineUri: uri });
  yield* manager.createCatalog({
    id: "setup",
    rest: {
      uri: yield* engine.icebergRestUri,
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
  const catalog = yield* manager.getIcebergCatalog("setup");
  const identifier = { namespace: ["setup"], name: "events" };
  const run = (
    args: string[] = [],
    schemas: Readonly<Record<string, Schema.Top>> = { events: Row, unused: Row },
    table = identifier,
  ) =>
    Command.runWith(makeSetupCommand(schemas), { version: "1.0.0", renderErrors: false })(
      args,
    ).pipe(
      Effect.provide(NodeServices.layer),
      Effect.provide(
        ConfigProvider.layer(
          ConfigProvider.fromUnknown({
            ENGINE_URI: uri,
            AIRFOIL_CATALOG: "setup",
            AIRFOIL_TABLE_BINDINGS: JSON.stringify({ events: table }),
          }),
        ),
      ),
    );
  return { run, catalog, identifier };
});

describe("setup command", () => {
  it.live(
    "creates only bound tables and preserves them on reruns",
    () =>
      Effect.gen(function* () {
        const { run, catalog, identifier } = yield* fixture;
        yield* run();
        const created = yield* catalog.loadTable(identifier);
        yield* run(["--retry-interval", "1 millis", "--retries", "0"]);
        const rerun = yield* catalog.loadTable(identifier);
        expect(created["format-version"]).toBe(3);
        expect(getCurrentSchema(created)?.fields.map((field) => field.name)).toEqual([
          "id",
          "version",
        ]);
        expect(rerun["table-uuid"]).toBe(created["table-uuid"]);
        const missing = yield* catalog
          .loadTable({ ...identifier, name: "unused" })
          .pipe(Effect.flip);
        expect(missing.status).toBe(404);
      }).pipe(
        Effect.provide(FetchHttpClient.layer),
        Effect.provide(TestEngine.container),
        Effect.scoped,
      ),
    { timeout: 120_000 },
  );

  it.live(
    "rejects schema changes without modifying the table",
    () =>
      Effect.gen(function* () {
        const { run, catalog, identifier } = yield* fixture;
        yield* run();
        const before = yield* catalog.loadTable(identifier);
        const changed = Schema.Struct({
          id: Schema.String,
          version: Schema.BigInt,
          extra: Schema.String,
        }).pipe(Iceberg.identifier("id"));
        const error = yield* run([], { events: changed }).pipe(Effect.flip);
        expect(error.message).toContain("Table schema does not match");
        const after = yield* catalog.loadTable(identifier);
        expect(after["table-uuid"]).toBe(before["table-uuid"]);
        expect(getCurrentSchema(after)).toEqual(getCurrentSchema(before));
      }).pipe(
        Effect.provide(FetchHttpClient.layer),
        Effect.provide(TestEngine.container),
        Effect.scoped,
      ),
    { timeout: 120_000 },
  );

  it.live(
    "sets checkpoint properties on new tables and preserves them on reruns",
    () =>
      Effect.gen(function* () {
        const { run, catalog, identifier } = yield* fixture;
        for (const seconds of [undefined, 0, 17, 900]) {
          const table = { ...identifier, name: `events_${seconds ?? "default"}` };
          yield* run(
            seconds === undefined ? [] : ["--checkpoint-interval-sec", String(seconds)],
            { events: Row },
            table,
          );
          const created = yield* catalog.loadTable(table);
          expect(created.properties?.["airfoil.checkpoint.interval-sec"]).toBe(
            seconds === undefined ? undefined : String(seconds),
          );
          yield* run(
            ["--checkpoint-interval-sec", seconds === 900 ? "0" : "900"],
            { events: Row },
            table,
          );
          const rerun = yield* catalog.loadTable(table);
          expect(rerun["table-uuid"]).toBe(created["table-uuid"]);
          expect(rerun.properties).toEqual(created.properties);
        }
      }).pipe(
        Effect.provide(FetchHttpClient.layer),
        Effect.provide(TestEngine.container),
        Effect.scoped,
      ),
    { timeout: 120_000 },
  );

  it.live("rejects invalid flags before loading configuration", () =>
    Effect.gen(function* () {
      for (const args of [
        ["--retries", "-1"],
        ["--retry-interval", "0 seconds"],
        ["--retry-interval", "Infinity"],
        ["--retry-interval", "invalid"],
        ["--checkpoint-interval-sec", "-1"],
        ["--checkpoint-interval-sec", "901"],
        ["--checkpoint-interval-sec", "1.5"],
      ]) {
        const error = yield* Command.runWith(makeSetupCommand({ events: Row }), {
          version: "1.0.0",
          renderErrors: false,
        })(args).pipe(Effect.flip);
        expect(error).toMatchObject({ _tag: "ShowHelp", errors: [{ _tag: "InvalidValue" }] });
      }
    }).pipe(
      Effect.provide(NodeServices.layer),
      Effect.provide(FetchHttpClient.layer),
      Effect.provide(ConfigProvider.layer(ConfigProvider.fromUnknown({}))),
      Effect.scoped,
    ),
  );
});

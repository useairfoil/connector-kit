import { NodeServices } from "@effect/platform-node";
import { describe, expect, it } from "@effect/vitest";
import { CatalogManager } from "@useairfoil/api";
import { TestEngine } from "@useairfoil/testing";
import { ConfigProvider, Effect, Schema } from "effect";
import { Command } from "effect/cli";
import { FetchHttpClient } from "effect/http";
import { getCurrentSchema } from "iceberg-js";

import { Iceberg } from "../src";
import { makeCreateTableCommand } from "../src/connector-app";

describe("Iceberg REST table creation", () => {
  it.effect(
    "creates tables from plain schemas through the CLI and verifies reruns",
    () =>
      Effect.gen(function* () {
        const engine = yield* TestEngine.Instance;
        const uri = yield* engine.uri;
        const icebergRestUri = yield* engine.icebergRestUri;
        const manager = yield* CatalogManager.make({ engineUri: uri });
        const catalogId = "catalog-field-ids";
        const namespace = ["schema_ids"];
        const identifier = { namespace, name: "events" };

        yield* manager.createCatalog({
          id: catalogId,
          rest: {
            uri: icebergRestUri,
            warehouse: "s3://default-catalog",
          },
        });

        const catalog = yield* manager.getIcebergCatalog(catalogId);

        const Row = Schema.Struct({
          id: Schema.String,
          nested: Schema.Struct({
            value: Schema.String,
          }),
          items: Schema.Array(Schema.String),
          labels: Schema.ReadonlyMap(Schema.String, Schema.String),
        }).pipe(Iceberg.identifier("id"));
        const location = "s3://default-catalog/schema_ids/events";
        const prepare = (row: Schema.Top) =>
          Command.runWith(makeCreateTableCommand({ source_events: row }), {
            version: "1.0.0",
            renderErrors: false,
          })([
            "schema_ids.events",
            "--catalog",
            catalogId,
            "--resource",
            "source_events",
            "--location",
            location,
          ]).pipe(
            Effect.provide(NodeServices.layer),
            Effect.provide(ConfigProvider.layer(ConfigProvider.fromUnknown({ ENGINE_URI: uri }))),
          );
        yield* prepare(Row);
        const created = yield* catalog.loadTable(identifier);
        yield* prepare(Row);
        const reused = yield* catalog.loadTable(identifier);
        expect(reused["table-uuid"]).toBe(created["table-uuid"]);
        const schema = getCurrentSchema(reused);

        const ChangedRow = Schema.Struct({
          id: Schema.String,
        }).pipe(Iceberg.identifier("id"));
        const mismatch = yield* prepare(ChangedRow).pipe(Effect.flip);
        expect(mismatch.message).toContain("Table schema does not match");
        expect((yield* catalog.loadTable(identifier))["table-uuid"]).toBe(created["table-uuid"]);

        const fields = [
          { name: "id", required: true, type: "string" },
          {
            name: "nested",
            type: { type: "struct", fields: [{ name: "value", type: "string" }] },
          },
          { name: "items", type: { type: "list", element: "string" } },
          { name: "labels", type: { type: "map", key: "string", value: "string" } },
        ];
        expect(schema).toMatchObject({ fields });
        expect(schema?.["identifier-field-ids"]).toEqual([schema?.fields[0]?.id]);

        const derivedIdentifier = { namespace, name: "derived" };
        const request = yield* Iceberg.makeCreateTableRequest(Row, {
          name: derivedIdentifier.name,
        });
        yield* catalog.createTable({ namespace }, request);
        const derived = yield* catalog.loadTable(derivedIdentifier);

        expect(derived.location).toMatch(/^s3:\/\/default-catalog\//);
        expect(getCurrentSchema(derived)).toMatchObject({ fields });
      }).pipe(
        Effect.provide(FetchHttpClient.layer),
        Effect.provide(TestEngine.container),
        Effect.scoped,
      ),
    { timeout: 120_000 },
  );
});

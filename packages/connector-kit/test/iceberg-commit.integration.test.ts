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

describe("Iceberg table creation commits", () => {
  it.effect(
    "creates missing namespaces and tables through the CLI, verifies reruns, and preserves IDs",
    () =>
      Effect.gen(function* () {
        const engine = yield* TestEngine.Instance;
        const uri = yield* engine.uri;
        const icebergRestUri = yield* engine.icebergRestUri;
        const manager = yield* CatalogManager.make({ baseUrl: uri });
        const catalogId = "explicit-field-ids";
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
          id: Schema.String.pipe(Iceberg.field(1)),
          nested: Schema.Struct({
            value: Schema.String.pipe(Iceberg.field(101)),
          }).pipe(Iceberg.field(2)),
          items: Schema.Array(Schema.String.annotate({ fieldId: 201 })).pipe(Iceberg.field(3)),
          labels: Schema.ReadonlyMap(
            Schema.String.annotate({ fieldId: 301 }),
            Schema.String.annotate({ fieldId: 302 }),
          ).pipe(Iceberg.field(4)),
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
          id: Schema.String.pipe(Iceberg.field(99)),
        }).pipe(Iceberg.identifier("id"));
        const mismatch = yield* prepare(ChangedRow).pipe(Effect.flip);
        expect(mismatch.message).toContain("Table schema does not match");
        expect((yield* catalog.loadTable(identifier))["table-uuid"]).toBe(created["table-uuid"]);

        const fields = [
          { id: 1, name: "id" },
          {
            id: 2,
            name: "nested",
            type: { type: "struct", fields: [{ id: 101, name: "value" }] },
          },
          { id: 3, name: "items", type: { type: "list", "element-id": 201 } },
          { id: 4, name: "labels", type: { type: "map", "key-id": 301, "value-id": 302 } },
        ];
        expect(schema).toMatchObject({ fields, "identifier-field-ids": [1] });

        const request = yield* Iceberg.makeCreateTableCommitRequest(Row, { location });
        const withoutLocation = {
          ...request,
          updates: request.updates.filter((update) => update.action !== "set-location"),
        };
        expect(withoutLocation.requirements).toEqual([{ type: "assert-create" }]);

        const derivedIdentifier = { namespace, name: "derived" };
        yield* catalog.commitTable(derivedIdentifier, withoutLocation);
        const derived = yield* catalog.loadTable(derivedIdentifier);

        expect(derived.location).toMatch(/^s3:\/\/default-catalog\//);
        expect(getCurrentSchema(derived)).toMatchObject({ fields, "identifier-field-ids": [1] });
      }).pipe(
        Effect.provide(FetchHttpClient.layer),
        Effect.provide(TestEngine.container),
        Effect.scoped,
      ),
    { timeout: 120_000 },
  );
});

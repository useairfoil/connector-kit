import type { StructField, TableMetadata, TableSchema } from "iceberg-js";

import { describe, expect, it } from "@effect/vitest";
import { Effect, Schema } from "effect";

import { ensureTable } from "../src/catalog/table";
import * as Iceberg from "../src/iceberg";

type Catalog = Parameters<typeof ensureTable>[1]["catalog"];

const unexpectedCatalog: Catalog = {
  loadTable: () => Effect.die("Unexpected load"),
  createTable: () => Effect.die("Unexpected create"),
  createNamespaceIfNotExists: () => Effect.die("Unexpected namespace creation"),
};

const Row = Schema.Struct({
  id: Schema.String,
  details: Schema.Struct({
    value: Schema.String,
  }),
  items: Schema.Array(Schema.String),
  labels: Schema.ReadonlyMap(Schema.String, Schema.NullOr(Schema.String)),
}).pipe(Iceberg.identifier("id"));

const identifier = { namespace: ["default"], name: "rows" };
const location = "s3://warehouse/default/rows";

const metadata = (schema: TableSchema): TableMetadata => ({
  "format-version": 3,
  "table-uuid": "test",
  schemas: [{ ...schema, "schema-id": 0 }],
  "current-schema-id": 0,
  "partition-specs": [
    { "spec-id": 0, fields: [] },
    {
      "spec-id": 1,
      fields: [{ "source-id": 1, "field-id": 1000, name: "id_partition", transform: "identity" }],
    },
  ],
  "default-spec-id": 0,
  "sort-orders": [],
  properties: {},
});

describe("Iceberg table creation", () => {
  it.effect("shows the schema path when a field type is unsupported", () =>
    Effect.gen(function* () {
      const invalid = Schema.Struct({ id: Schema.Unknown });

      const error = yield* ensureTable(invalid, { catalog: unexpectedCatalog, identifier }).pipe(
        Effect.flip,
      );
      expect(error.message).toContain("$.id: A Unknown schema does not work here");
    }),
  );

  it.effect("rejects unsupported table versions, partitions, and encryption before ingestion", () =>
    Effect.gen(function* () {
      const request = yield* Iceberg.makeCreateTableRequest(Row, {
        name: identifier.name,
        location,
      });
      const stored = metadata(request.schema);
      const cases: ReadonlyArray<{ readonly table: TableMetadata; readonly message: string }> = [
        { table: { ...stored, "format-version": 2 }, message: "Iceberg format v3" },
        { table: { ...stored, "default-spec-id": 1 }, message: "must be unpartitioned" },
        {
          table: { ...stored, properties: { "encryption.key-id": "synthetic-key" } },
          message: "must be unencrypted",
        },
      ];
      for (const { table, message } of cases) {
        const catalog: Catalog = {
          ...unexpectedCatalog,
          loadTable: () => Effect.succeed(table),
        };
        const error = yield* ensureTable(Row, { catalog, identifier }).pipe(Effect.flip);
        expect(error.message).toContain(message);
        expect(error.message).not.toContain("synthetic-key");
      }
    }),
  );

  it.effect("rejects a mismatched existing table before writing", () =>
    Effect.gen(function* () {
      const request = yield* Iceberg.makeCreateTableRequest(Row, {
        name: identifier.name,
        location,
      });
      const schema = request.schema;
      const changed = (name: string, changes: Partial<StructField>) =>
        metadata({
          ...schema,
          fields: schema.fields.map((field) =>
            field.name === name ? { ...field, ...changes } : field,
          ),
        });
      const tables = [
        changed("id", { type: "double" }),
        changed("details", {
          type: { type: "list", "element-id": 101, element: "string", "element-required": true },
        }),
        changed("items", {
          type: { type: "list", "element-id": 80, element: "string", "element-required": false },
        }),
        changed("labels", {
          type: {
            type: "map",
            "key-id": 81,
            key: "string",
            "value-id": 82,
            value: "long",
            "value-required": false,
          },
        }),
        metadata({ ...schema, "identifier-field-ids": [] }),
      ];

      const errors = yield* Effect.forEach(tables, (table) => {
        const catalog: Catalog = {
          ...unexpectedCatalog,
          loadTable: () => Effect.succeed(table),
        };

        return ensureTable(Row, { catalog, identifier, location }).pipe(Effect.flip);
      });
      expect(errors.map((error) => error.message)).toMatchInlineSnapshot(`
        [
          "Table schema does not match at $.id. Migrate the table or revert the schema change.",
          "Table schema does not match at $.details. Migrate the table or revert the schema change.",
          "Table schema does not match at $.items. Migrate the table or revert the schema change.",
          "Table schema does not match at $.labels.value. Migrate the table or revert the schema change.",
          "Table identifier fields do not match. Recreate the table or revert the schema change.",
        ]
      `);
    }),
  );
});

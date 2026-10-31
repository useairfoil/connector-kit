import type { CreateTableRequest, StructField, TableMetadata, TableSchema } from "iceberg-js";

import { describe, expect, it } from "@effect/vitest";
import { Effect, Ref, Schema } from "effect";

import { ensureTable } from "../src/catalog/table";
import * as Iceberg from "../src/iceberg";

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
      const catalog = {
        loadTable: () => Effect.die("Unexpected load"),
      } as unknown as Parameters<typeof ensureTable>[1]["catalog"];

      const error = yield* ensureTable(invalid, { catalog, identifier }).pipe(Effect.flip);
      expect(error.message).toContain("$.id: A Unknown schema does not work here");
    }),
  );

  it.effect("creates a missing table and reuses catalog-assigned IDs on the next startup", () =>
    Effect.gen(function* () {
      const stored = yield* Ref.make<TableMetadata | undefined>(undefined);
      const commits = yield* Ref.make(0);
      const catalog = {
        loadTable: () =>
          Ref.get(stored).pipe(
            Effect.flatMap((value) =>
              value
                ? Effect.succeed(value)
                : Effect.fail({ status: 404, message: "Table not found" }),
            ),
          ),
        createNamespaceIfNotExists: () => Effect.void,
        createTable: (_namespace: { namespace: string[] }, request: CreateTableRequest) =>
          Ref.set(
            stored,
            metadata({
              ...request.schema,
              fields: [
                { id: 19, name: "id", type: "string", required: true },
                {
                  id: 7,
                  name: "details",
                  required: false,
                  type: {
                    type: "struct",
                    fields: [{ id: 42, name: "value", type: "string", required: true }],
                  },
                },
                {
                  id: 21,
                  name: "items",
                  required: false,
                  type: {
                    type: "list",
                    "element-id": 6,
                    element: "string",
                    "element-required": true,
                  },
                },
                {
                  id: 33,
                  name: "labels",
                  required: false,
                  type: {
                    type: "map",
                    "key-id": 9,
                    key: "string",
                    "value-id": 40,
                    value: "string",
                    "value-required": false,
                  },
                },
              ],
              "identifier-field-ids": [19],
            }),
          ).pipe(Effect.andThen(Ref.update(commits, (count) => count + 1))),
      } as unknown as Parameters<typeof ensureTable>[1]["catalog"];

      const created = yield* ensureTable(Row, { catalog, identifier });
      const reused = yield* ensureTable(Row, { catalog, identifier });

      expect(yield* Ref.get(commits)).toBe(1);
      expect(reused).toEqual(created);
      expect(created["identifier-field-ids"]).toEqual([19]);
      expect(created.fields[1]?.type).toMatchObject({ fields: [{ id: 42 }] });
      expect(created.fields[2]?.type).toMatchObject({ "element-id": 6 });
      expect(created.fields[3]?.type).toMatchObject({ "key-id": 9, "value-id": 40 });
    }),
  );

  it.effect("rejects unsupported table versions, partitions, and encryption before ingestion", () =>
    Effect.gen(function* () {
      const request = yield* Iceberg.makeCreateTableRequest(Row, {
        name: identifier.name,
        location,
      });
      const stored = metadata(request.schema);
      const cases = [
        { table: { ...stored, "format-version": 2 }, message: "Iceberg format v3" },
        { table: { ...stored, "default-spec-id": 1 }, message: "must be unpartitioned" },
        {
          table: { ...stored, properties: { "encryption.key-id": "synthetic-key" } },
          message: "must be unencrypted",
        },
      ];
      for (const { table, message } of cases) {
        const catalog = {
          loadTable: () => Effect.succeed(table),
          createTable: () => Effect.die("Unexpected create"),
        } as unknown as Parameters<typeof ensureTable>[1]["catalog"];
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
        const catalog = {
          loadTable: () => Effect.succeed(table),
          createTable: () => Effect.die("Unexpected create"),
        } as unknown as Parameters<typeof ensureTable>[1]["catalog"];

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

  it.effect("loads a table created by another instance", () =>
    Effect.gen(function* () {
      const request = yield* Iceberg.makeCreateTableRequest(Row, {
        name: identifier.name,
        location,
      });
      const created = metadata(request.schema);
      const loads = yield* Ref.make(0);
      const catalog = {
        loadTable: () =>
          Ref.getAndUpdate(loads, (count) => count + 1).pipe(
            Effect.flatMap((count) =>
              count === 0
                ? Effect.fail({ status: 404, message: "Table not found" })
                : Effect.succeed(created),
            ),
          ),
        createNamespaceIfNotExists: () => Effect.void,
        createTable: () => Effect.fail({ status: 409, message: "Table already exists" }),
      } as unknown as Parameters<typeof ensureTable>[1]["catalog"];

      yield* ensureTable(Row, { catalog, identifier, location });
      expect(yield* Ref.get(loads)).toBe(2);
    }),
  );
});

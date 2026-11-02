import { describe, expect, it } from "@effect/vitest";
import { Iceberg } from "@useairfoil/connector-kit";
import { Effect } from "effect";

import { objects } from "../src/manifest";
import { tableSchemas } from "../src/tables";

type CreateRequest = Effect.Success<ReturnType<typeof Iceberg.makeCreateTableRequest>>;
type TableSchema = CreateRequest["schema"];
type IcebergType = TableSchema["fields"][number]["type"];

const tableSchema = (request: CreateRequest): TableSchema => request.schema;

const undocumented = (type: IcebergType): ReadonlyArray<string> => {
  if (typeof type === "string") return [];
  switch (type.type) {
    case "struct":
      return type.fields.flatMap((field) => [
        ...(field.doc ? [] : [field.name]),
        ...undocumented(field.type),
      ]);
    case "list":
      return undocumented(type.element);
    case "map":
      return [...undocumented(type.key), ...undocumented(type.value)];
  }
};

const describeType = (type: IcebergType): string => {
  if (typeof type === "string") return type;
  switch (type.type) {
    case "struct":
      return `struct<${type.fields.map((field) => `${field.name}${field.required ? "" : "?"}: ${describeType(field.type)}`).join(", ")}>`;
    case "list":
      return `list<${describeType(type.element)}>`;
    case "map":
      return `map<${describeType(type.key)}, ${describeType(type.value)}>`;
  }
};

describe("Iceberg schemas", () => {
  it.effect("compiles every table with documented fields", () =>
    Effect.gen(function* () {
      const missingDocs: Array<string> = [];
      const tables: Record<string, ReadonlyArray<string>> = {};
      for (const [name, schema] of Object.entries(tableSchemas)) {
        const fields = tableSchema(
          yield* Iceberg.makeCreateTableRequest(schema, {
            name: "rows",
            location: `s3://warehouse/salesforce-${name}`,
          }),
        );
        missingDocs.push(...undocumented(fields).map((field) => `${name}.${field}`));
        tables[name] = [
          `identifier: ${fields.fields
            .filter((field) => fields["identifier-field-ids"]?.includes(field.id))
            .map((field) => field.name)
            .join(", ")}`,
          ...fields.fields.map(
            (field) => `${field.name}${field.required ? "" : "?"}: ${describeType(field.type)}`,
          ),
        ];
      }

      // Every standard object table has the same fields.
      const differing = objects
        .map((spec) => spec.name)
        .filter((name) => JSON.stringify(tables[name]) !== JSON.stringify(tables.accounts));

      expect({
        tables: Object.keys(tables).length,
        missingDocs,
        differing,
        accounts: tables.accounts,
        custom_objects: tables.custom_objects,
        object_fields: tables.object_fields,
      }).toMatchInlineSnapshot(`
        {
          "accounts": [
            "identifier: id",
            "id: string",
            "version?: timestamptz",
            "created_at?: timestamptz",
            "updated_at?: timestamptz",
            "fields?: map<string, string>",
            "_deleted?: boolean",
          ],
          "custom_objects": [
            "identifier: id",
            "id: string",
            "version?: timestamptz",
            "created_at?: timestamptz",
            "updated_at?: timestamptz",
            "fields?: map<string, string>",
            "_deleted?: boolean",
            "object?: string",
          ],
          "differing": [],
          "missingDocs": [],
          "object_fields": [
            "identifier: id",
            "id: string",
            "version?: timestamptz",
            "object?: string",
            "name?: string",
            "label?: string",
            "type?: string",
            "custom?: boolean",
            "calculated?: boolean",
            "nillable?: boolean",
            "length?: long",
            "precision?: long",
            "scale?: long",
            "reference_to?: list<string>",
            "picklist_values?: list<struct<value: string, label?: string, active: boolean>>",
          ],
          "tables": 89,
        }
      `);
    }),
  );
});

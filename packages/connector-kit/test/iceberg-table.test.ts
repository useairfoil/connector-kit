import { describe, expect, it } from "@effect/vitest";
import { Effect, Option, Schema, SchemaTransformation } from "effect";

import * as Iceberg from "../src/iceberg";

const requestOf = (schema: Schema.Top) =>
  Iceberg.makeCreateTableRequest(schema, { name: "rows", location: "s3://warehouse/rows" });

const errorOf = (schema: Schema.Top) => requestOf(schema).pipe(Effect.flip);

describe("Iceberg table creation requests", () => {
  it.effect("compiles plain schemas, nested types, nullability, and documentation", () => {
    const Details = Schema.Struct({
      createdAt: Schema.Date.pipe(Schema.annotateKey({ description: "Creation time." })),
      payload: Schema.Uint8Array,
      score: Schema.Finite,
      labels: Schema.Array(Schema.NullOr(Schema.String)),
      attributes: Schema.ReadonlyMap(Schema.String, Schema.NullOr(Schema.Int)),
    });
    const Row = Schema.Struct({
      id: Schema.String.pipe(
        Schema.annotateKey({ title: "ID", description: "Provider identifier.", examples: ["a"] }),
      ),
      version: Schema.BigInt,
      active: Schema.optional(Schema.Boolean),
      state: Schema.Literals(["open", "closed"]),
      details: Schema.NullOr(Details),
    }).annotate({ title: "Rows", description: "Connector rows.", examples: [] });

    return Effect.gen(function* () {
      expect(yield* requestOf(Row)).toMatchInlineSnapshot(`
        {
          "location": "s3://warehouse/rows",
          "name": "rows",
          "properties": {
            "comment": "Connector rows.",
            "format-version": "3",
          },
          "schema": {
            "fields": [
              {
                "doc": "Provider identifier.",
                "id": 1,
                "name": "id",
                "required": true,
                "type": "string",
              },
              {
                "id": 2,
                "name": "version",
                "required": true,
                "type": "long",
              },
              {
                "id": 3,
                "name": "active",
                "required": false,
                "type": "boolean",
              },
              {
                "id": 4,
                "name": "state",
                "required": true,
                "type": "string",
              },
              {
                "id": 5,
                "name": "details",
                "required": false,
                "type": {
                  "fields": [
                    {
                      "doc": "Creation time.",
                      "id": 6,
                      "name": "createdAt",
                      "required": true,
                      "type": "timestamptz",
                    },
                    {
                      "id": 7,
                      "name": "payload",
                      "required": true,
                      "type": "binary",
                    },
                    {
                      "id": 8,
                      "name": "score",
                      "required": true,
                      "type": "double",
                    },
                    {
                      "id": 9,
                      "name": "labels",
                      "required": true,
                      "type": {
                        "element": "string",
                        "element-id": 10,
                        "element-required": false,
                        "type": "list",
                      },
                    },
                    {
                      "id": 11,
                      "name": "attributes",
                      "required": true,
                      "type": {
                        "key": "string",
                        "key-id": 12,
                        "type": "map",
                        "value": "double",
                        "value-id": 13,
                        "value-required": false,
                      },
                    },
                  ],
                  "type": "struct",
                },
              },
            ],
            "type": "struct",
          },
        }
      `);
    });
  });

  it.effect("uses the decoded side of transformations", () => {
    const Input = Schema.Struct({ id: Schema.String });
    const Row = Input.pipe(
      Schema.decodeTo(
        Schema.Struct({ ...Input.fields, version: Schema.String }),
        SchemaTransformation.transform({
          decode: ({ id }) => ({ id, version: "initial" }),
          encode: ({ id }) => ({ id }),
        }),
      ),
    );

    return Effect.gen(function* () {
      const request = yield* requestOf(Row);
      expect(request.schema.fields.map(({ name }) => name)).toEqual(["id", "version"]);
    });
  });

  it.effect("makes an upsert table from identifier fields", () => {
    const Input = Schema.Struct({
      id: Schema.String,
      updatedAt: Schema.String,
      details: Schema.Struct({ label: Schema.String }),
    });
    const Row = Input.pipe(
      Schema.extendTo({ version: Schema.String }, { version: (row) => Option.some(row.updatedAt) }),
      Iceberg.identifier("id"),
    );

    return Effect.gen(function* () {
      const upsert = (yield* requestOf(Row)).schema;
      const append = (yield* requestOf(Input)).schema;
      expect(upsert["identifier-field-ids"]).toEqual([1]);
      expect(upsert.fields.map(({ name, required }) => ({ name, required })))
        .toMatchInlineSnapshot(`
          [
            {
              "name": "id",
              "required": true,
            },
            {
              "name": "updatedAt",
              "required": false,
            },
            {
              "name": "details",
              "required": false,
            },
            {
              "name": "version",
              "required": false,
            },
          ]
        `);
      expect(upsert.fields[2]?.type).toMatchObject({ fields: [{ name: "label", required: true }] });
      expect(append["identifier-field-ids"]).toBeUndefined();
      expect(append.fields.every((field) => field.required)).toBe(true);
    });
  });

  it.effect("rejects invalid identifier fields", () => {
    const Row = Schema.Struct({
      id: Schema.String,
      note: Schema.optional(Schema.String),
      label: Schema.NullOr(Schema.String),
      score: Schema.Finite,
    });
    // Set the annotation directly, since the type rejects some of these.
    const keyedBy = (name: string) => Row.annotate({ icebergIdentifierFields: [name] });

    return Effect.gen(function* () {
      const errors = yield* Effect.forEach(
        ["missing", "note", "label", "score"].map(keyedBy),
        errorOf,
      );
      expect(errors.map(({ path, message }) => ({ path, message }))).toMatchInlineSnapshot(`
        [
          {
            "message": "Iceberg.identifier names a field that does not exist",
            "path": "$.missing",
          },
          {
            "message": "An identifier field cannot be optional or null",
            "path": "$.note",
          },
          {
            "message": "An identifier field cannot be optional or null",
            "path": "$.label",
          },
          {
            "message": "An identifier field must be a primitive type other than float or double",
            "path": "$.score",
          },
        ]
      `);
    });
  });

  it.effect("preserves location and properties and requests format v3", () =>
    Effect.gen(function* () {
      const Row = Schema.Struct({ id: Schema.String }).annotate({ description: "Rows." });
      const request = yield* Iceberg.makeCreateTableRequest(Row, {
        name: "rows",
        location: "s3://warehouse/rows",
        properties: { comment: "Override.", owner: "connectors" },
      });
      expect(request.location).toBe("s3://warehouse/rows");
      expect(request.properties).toEqual({
        "format-version": "3",
        comment: "Override.",
        owner: "connectors",
      });
      const withoutLocation = yield* Iceberg.makeCreateTableRequest(Row, { name: "rows" });
      expect(withoutLocation).not.toHaveProperty("location");
      expect(withoutLocation.properties?.comment).toBe("Rows.");
    }),
  );

  it.effect("rejects recursive references", () => {
    interface Node {
      readonly children: ReadonlyArray<Node>;
    }
    const Node: Schema.Codec<Node> = Schema.Struct({
      children: Schema.Array(Schema.suspend((): Schema.Codec<Node> => Node)),
    }).annotate({ identifier: "Node" });

    return Effect.gen(function* () {
      const { path, message } = yield* errorOf(Schema.Struct({ node: Node }));
      expect({ path, message }).toEqual({
        path: "$.node.children.element",
        message: "Iceberg cannot store a schema that contains itself",
      });
    });
  });

  it.effect("rejects unsupported schemas with precise paths", () => {
    const cases: ReadonlyArray<Schema.Top> = [
      Schema.String,
      Schema.Struct({ price: Schema.Number }),
      Schema.Struct({ value: Schema.Union([Schema.String, Schema.Finite]) }),
      Schema.Struct({ value: Schema.Tuple([Schema.String]) }),
      Schema.Struct({ value: Schema.Unknown }),
      Schema.Struct({ value: Schema.ReadonlyMap(Schema.NullOr(Schema.String), Schema.String) }),
    ];

    return Effect.gen(function* () {
      const errors = yield* Effect.forEach(cases, errorOf);
      expect(errors.map(({ path, message }) => ({ path, message }))).toMatchInlineSnapshot(`
        [
          {
            "message": "The top level of a table must be a Schema.Struct",
            "path": "$",
          },
          {
            "message": "Plain Schema.Number does not work here; use Schema.Finite or Schema.Int",
            "path": "$.price",
          },
          {
            "message": "A union only works when every member is a literal",
            "path": "$.value",
          },
          {
            "message": "A tuple does not work here; use a Schema.Array where every item has the same type",
            "path": "$.value",
          },
          {
            "message": "A Unknown schema does not work here",
            "path": "$.value",
          },
          {
            "message": "Map keys cannot be null",
            "path": "$.value.key",
          },
        ]
      `);
    });
  });
});

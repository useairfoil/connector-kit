import { describe, expect, it } from "@effect/vitest";
import { Iceberg } from "@useairfoil/connector-kit";
import { Effect } from "effect";

import { CartSchema } from "../src/resources/carts/row";
import { ProductSchema } from "../src/resources/products/row";
import { tableSchemas } from "../src/tables";

type CreateRequest = Effect.Success<ReturnType<typeof Iceberg.makeCreateTableRequest>>;
type TableSchema = CreateRequest["schema"];
type StructField = TableSchema["fields"][number];
type IcebergType = StructField["type"];

const tableSchema = (request: CreateRequest): TableSchema => request.schema;

const fieldAt = (schema: TableSchema, name: string): StructField => {
  const field = schema.fields.find((field) => field.name === name);
  if (field === undefined) throw new Error(`Missing field ${name}`);
  return field;
};

const describeType = (type: IcebergType): unknown => {
  if (typeof type === "string") return type;
  switch (type.type) {
    case "struct":
      return { type: type.type, fields: type.fields.map(describeField) };
    case "list":
      return {
        type: type.type,
        "element-required": type["element-required"],
        element: describeType(type.element),
      };
    case "map":
      return {
        type: type.type,
        key: describeType(type.key),
        "value-required": type["value-required"],
        value: describeType(type.value),
      };
  }
};

const describeField = ({ name, required, doc, type }: StructField) => ({
  name,
  required,
  doc,
  type: describeType(type),
});

const expectDocs = (type: IcebergType): void => {
  if (typeof type === "string") return;

  switch (type.type) {
    case "struct":
      for (const field of type.fields) {
        expect(field.doc).toBeTruthy();
        expectDocs(field.type);
      }
      return;
    case "list":
      expectDocs(type.element);
      return;
    case "map":
      expectDocs(type.key);
      expectDocs(type.value);
      return;
  }
};

describe("Shopify Iceberg schemas", () => {
  it.effect("compiles every table with field docs", () =>
    Effect.gen(function* () {
      const productRequest = yield* Iceberg.makeCreateTableRequest(ProductSchema, {
        name: "rows",
        location: "s3://warehouse/products",
      });
      const cartRequest = yield* Iceberg.makeCreateTableRequest(CartSchema, {
        name: "rows",
        location: "s3://warehouse/carts",
      });
      const product = tableSchema(productRequest);
      const cart = tableSchema(cartRequest);

      for (const [name, schema] of Object.entries(tableSchemas)) {
        const request = yield* Iceberg.makeCreateTableRequest(schema, {
          name: "rows",
          location: `s3://warehouse/${name}`,
        });
        const fields = request.schema;
        expect(
          fields.fields
            .filter((field) => fields["identifier-field-ids"]?.includes(field.id))
            .map((field) => field.name),
        ).toEqual(["id"]);
        expectDocs(fields);
      }
      expect(productRequest.properties).toMatchObject({ comment: "Products in a Shopify store." });
      expect(cartRequest.properties).toMatchObject({
        comment: "Latest state of each cart in a Shopify store.",
      });

      expect(
        product.fields
          .filter((field) => ["createdAt", "featuredMedia"].includes(field.name))
          .map(describeField),
      ).toMatchInlineSnapshot(`
        [
          {
            "doc": "Time when the product was created.",
            "name": "createdAt",
            "required": false,
            "type": "timestamptz",
          },
          {
            "doc": "Featured media for the product.",
            "name": "featuredMedia",
            "required": false,
            "type": {
              "fields": [
                {
                  "doc": "Image for the featured media.",
                  "name": "image",
                  "required": false,
                  "type": {
                    "fields": [
                      {
                        "doc": "URL of the image.",
                        "name": "url",
                        "required": true,
                        "type": "string",
                      },
                      {
                        "doc": "Alternative text for the image.",
                        "name": "altText",
                        "required": false,
                        "type": "string",
                      },
                    ],
                    "type": "struct",
                  },
                },
              ],
              "type": "struct",
            },
          },
        ]
      `);

      const lineItems = fieldAt(cart, "lineItems").type;
      if (typeof lineItems === "string" || lineItems.type !== "list") {
        throw new Error("lineItems is not a list");
      }
      if (typeof lineItems.element === "string" || lineItems.element.type !== "struct") {
        throw new Error("lineItems element is not a struct");
      }

      expect(
        lineItems.element.fields
          .filter((field) => ["id", "properties"].includes(field.name))
          .map(describeField),
      ).toMatchInlineSnapshot(`
        [
          {
            "doc": "Unique cart line identifier.",
            "name": "id",
            "required": true,
            "type": "string",
          },
          {
            "doc": "Custom line properties stored as JSON.",
            "name": "properties",
            "required": false,
            "type": "string",
          },
        ]
      `);
    }),
  );
});

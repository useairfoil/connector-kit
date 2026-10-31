import { describe, expect, it } from "@effect/vitest";
import { Iceberg } from "@useairfoil/connector-kit";
import { Effect } from "effect";

import { CheckoutSchema } from "../src/resources/checkouts";
import { CustomerSchema } from "../src/resources/customers";
import { DiscountSchema } from "../src/resources/discounts";
import { OrderSchema } from "../src/resources/orders";
import { ProductSchema } from "../src/resources/products";
import { RefundSchema } from "../src/resources/refunds";
import { SubscriptionSchema } from "../src/resources/subscriptions";

type CreateRequest = Effect.Success<ReturnType<typeof Iceberg.makeCreateTableRequest>>;
type TableSchema = CreateRequest["schema"];
type StructField = TableSchema["fields"][number];
type IcebergType = StructField["type"];

const tableSchema = (request: CreateRequest): TableSchema => request.schema;

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

describe("Polar Iceberg schemas", () => {
  it.effect("compiles every table with field docs", () =>
    Effect.gen(function* () {
      const schemas = [
        CustomerSchema,
        CheckoutSchema,
        OrderSchema,
        SubscriptionSchema,
        RefundSchema,
        ProductSchema,
        DiscountSchema,
      ];

      for (const [index, schema] of schemas.entries()) {
        const request = yield* Iceberg.makeCreateTableRequest(schema, {
          name: "rows",
          location: `s3://warehouse/polar-${index}`,
        });

        expect(request.properties?.comment).toBeTruthy();
        const fields = request.schema;
        expect(
          fields.fields
            .filter((field) => fields["identifier-field-ids"]?.includes(field.id))
            .map((field) => field.name),
        ).toEqual(["id"]);
        expectDocs(fields);
      }

      const customer = tableSchema(
        yield* Iceberg.makeCreateTableRequest(CustomerSchema, {
          name: "rows",
          location: "s3://warehouse/customers",
        }),
      );
      const order = tableSchema(
        yield* Iceberg.makeCreateTableRequest(OrderSchema, {
          name: "rows",
          location: "s3://warehouse/orders",
        }),
      );

      expect(
        customer.fields
          .filter((field) => ["id", "created_at", "metadata", "version"].includes(field.name))
          .map(describeField),
      ).toMatchInlineSnapshot(`
        [
          {
            "doc": "Unique customer identifier.",
            "name": "id",
            "required": true,
            "type": "string",
          },
          {
            "doc": "Time when the customer was created.",
            "name": "created_at",
            "required": false,
            "type": "timestamptz",
          },
          {
            "doc": "Customer metadata stored as JSON.",
            "name": "metadata",
            "required": false,
            "type": "string",
          },
          {
            "doc": "Time used to order customer changes.",
            "name": "version",
            "required": false,
            "type": "timestamptz",
          },
        ]
      `);

      const items = order.fields.find((field) => field.name === "items")?.type;
      expect(typeof items === "object" && items.type).toBe("list");
    }),
  );
});

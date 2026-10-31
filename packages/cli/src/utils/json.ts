import type { IcebergType, TableField } from "iceberg-js";

import { CatalogManager } from "@useairfoil/api";
import { Schema } from "effect";

const RestCatalogConfigJson = Schema.fromJsonString(CatalogManager.RestCatalogConfig);

const DefaultValue = Schema.Union([Schema.Boolean, Schema.Number, Schema.String]);

const IcebergTypeSchema: Schema.Codec<IcebergType> = Schema.suspend(() =>
  Schema.Union([
    Schema.String,
    Schema.Struct({
      type: Schema.Literal("struct"),
      fields: Schema.mutable(Schema.Array(TableFieldSchema)),
    }),
    Schema.Struct({
      type: Schema.Literal("list"),
      "element-id": Schema.Int,
      element: IcebergTypeSchema,
      "element-required": Schema.Boolean,
    }),
    Schema.Struct({
      type: Schema.Literal("map"),
      "key-id": Schema.Int,
      key: IcebergTypeSchema,
      "value-id": Schema.Int,
      value: IcebergTypeSchema,
      "value-required": Schema.Boolean,
    }),
  ]),
);

const TableFieldSchema: Schema.Codec<TableField> = Schema.Struct({
  id: Schema.Int,
  name: Schema.NonEmptyString,
  type: IcebergTypeSchema,
  required: Schema.Boolean,
  doc: Schema.optional(Schema.String),
  "initial-default": Schema.optional(DefaultValue),
  "write-default": Schema.optional(DefaultValue),
});

const TableFieldsJson = Schema.fromJsonString(Schema.mutable(Schema.Array(TableFieldSchema)));

export const parseRestCatalogConfig = Schema.decodeUnknownEffect(RestCatalogConfigJson);

export const parseTableFields = Schema.decodeUnknownEffect(TableFieldsJson);

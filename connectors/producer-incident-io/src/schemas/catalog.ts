import { Iceberg } from "@useairfoil/connector-kit";
import { Schema } from "effect";

import { Long, Optional, Timestamp, common } from "./shared";

export const CatalogTypeSchema = Schema.Struct({
  ...common("Catalog type"),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Catalog type name." })),
  description: Schema.String.pipe(Schema.annotateKey({ description: "Catalog type description." })),
  type_name: Schema.String.pipe(
    Schema.annotateKey({ description: 'Name used in expressions, such as Custom["Service"].' }),
  ),
  engine_resource_type: Schema.String.pipe(
    Schema.annotateKey({ description: "Type used by the workflow engine." }),
  ),
  ranked: Schema.Boolean.pipe(Schema.annotateKey({ description: "Whether entries have a rank." })),
  is_editable: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether entries can be edited in the app." }),
  ),
  categories: Schema.Array(Schema.String).pipe(
    Schema.annotateKey({ description: "Categories, such as service or team." }),
  ),
  color: Schema.String.pipe(Schema.annotateKey({ description: "Color in the app." })),
  icon: Schema.String.pipe(Schema.annotateKey({ description: "Icon in the app." })),
  annotations: Schema.ReadonlyMap(Schema.String, Schema.String).pipe(
    Schema.annotateKey({ description: "Annotations by key." }),
  ),
  attributes: Schema.Array(
    Schema.Struct({
      attribute_id: Schema.String.pipe(Schema.annotateKey({ description: "Attribute." })),
      name: Schema.String.pipe(Schema.annotateKey({ description: "Attribute name." })),
      type: Schema.String.pipe(
        Schema.annotateKey({ description: "Value type, such as String or another catalog type." }),
      ),
      array: Schema.Boolean.pipe(Schema.annotateKey({ description: "Whether it holds a list." })),
      mode: Schema.String.pipe(
        Schema.annotateKey({ description: "Where values come from, such as api or dashboard." }),
      ),
    }),
  ).pipe(Schema.annotateKey({ description: "Attributes that entries of this type have." })),
  schema_version: Long.pipe(
    Schema.annotateKey({ description: "Version of the attribute schema." }),
  ),
  last_synced_at: Optional(Timestamp).pipe(
    Schema.annotateKey({ description: "Time entries last synced from a source." }),
  ),
  estimated_count: Optional(Long).pipe(
    Schema.annotateKey({ description: "Rough number of entries." }),
  ),
  owning_team_ids: Schema.Array(Schema.String).pipe(
    Schema.annotateKey({ description: "Teams that own it." }),
  ),
})
  .annotate({ description: "incident.io catalog types, such as services and teams." })
  .pipe(Iceberg.identifier("id"));

export type CatalogType = Schema.Schema.Type<typeof CatalogTypeSchema>;

export const CatalogTypeObjectSchema = Schema.Struct({
  id: Schema.String,
  created_at: Timestamp,
  updated_at: Timestamp,
  name: Schema.String,
  description: Schema.String,
  type_name: Schema.String,
  engine_resource_type: Schema.String,
  ranked: Schema.Boolean,
  is_editable: Schema.Boolean,
  categories: Schema.Array(Schema.String),
  color: Schema.String,
  icon: Schema.String,
  annotations: Schema.Record(Schema.String, Schema.String),
  schema: Schema.Struct({
    version: Long,
    attributes: Schema.Array(
      Schema.Struct({
        id: Schema.String,
        name: Schema.String,
        type: Schema.String,
        array: Schema.Boolean,
        mode: Schema.String,
      }),
    ),
  }),
  last_synced_at: Optional(Timestamp),
  estimated_count: Optional(Long),
  owning_team_ids: Optional(Schema.Array(Schema.String)),
});

export type CatalogTypeObject = Schema.Schema.Type<typeof CatalogTypeObjectSchema>;

const BindingValueSchema = Schema.Struct({
  label: Schema.String,
  literal: Optional(Schema.String),
});

const bindingValue = Schema.Struct({
  label: Schema.String.pipe(Schema.annotateKey({ description: "Value as shown." })),
  literal: Optional(Schema.String).pipe(
    Schema.annotateKey({ description: "Value as stored, such as an ID." }),
  ),
});

export const CatalogEntrySchema = Schema.Struct({
  ...common("Catalog entry"),
  catalog_type_id: Schema.String.pipe(Schema.annotateKey({ description: "Catalog type." })),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Entry name." })),
  external_id: Optional(Schema.String).pipe(
    Schema.annotateKey({ description: "ID in the system it came from." }),
  ),
  rank: Long.pipe(Schema.annotateKey({ description: "Rank, for ranked types." })),
  aliases: Schema.Array(Schema.String).pipe(
    Schema.annotateKey({ description: "Other names that match the entry." }),
  ),
  archived_at: Optional(Timestamp).pipe(
    Schema.annotateKey({ description: "Time the entry was archived." }),
  ),
  attribute_values: Schema.ReadonlyMap(
    Schema.String,
    Schema.Struct({
      value: Optional(bindingValue).pipe(Schema.annotateKey({ description: "Single value." })),
      array_value: Schema.Array(bindingValue).pipe(
        Schema.annotateKey({ description: "List value." }),
      ),
    }),
  ).pipe(Schema.annotateKey({ description: "Attribute values by attribute ID." })),
})
  .annotate({ description: "incident.io catalog entries of every type." })
  .pipe(Iceberg.identifier("id"));

export type CatalogEntry = Schema.Schema.Type<typeof CatalogEntrySchema>;

export const CatalogEntryObjectSchema = Schema.Struct({
  id: Schema.String,
  created_at: Timestamp,
  updated_at: Timestamp,
  catalog_type_id: Schema.String,
  name: Schema.String,
  external_id: Optional(Schema.String),
  rank: Long,
  aliases: Schema.Array(Schema.String),
  archived_at: Optional(Timestamp),
  attribute_values: Schema.Record(
    Schema.String,
    Schema.Struct({
      value: Optional(BindingValueSchema),
      array_value: Optional(Schema.Array(BindingValueSchema)),
    }),
  ),
});

export type CatalogEntryObject = Schema.Schema.Type<typeof CatalogEntryObjectSchema>;

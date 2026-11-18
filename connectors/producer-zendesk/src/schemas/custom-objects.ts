import * as Iceberg from "@useairfoil/connector-kit/iceberg";
import { Schema, Struct } from "effect";

import { Json, Long, Timestamp, version } from "./shared";

const timestamps = (object: string) => ({
  created_at: Timestamp.pipe(
    Schema.annotateKey({ description: `Time the ${object} was created.` }),
  ),
  updated_at: Timestamp.pipe(
    Schema.annotateKey({ description: `Time the ${object} was last updated.` }),
  ),
});

export const CustomObjectSchema = Schema.Struct({
  key: Schema.String.pipe(Schema.annotateKey({ description: "Object key, such as `vehicle`." })),
  version: version("custom object"),
  title: Schema.String.pipe(Schema.annotateKey({ description: "Object name." })),
  title_pluralized: Schema.String.pipe(Schema.annotateKey({ description: "Plural object name." })),
  description: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Object description." }),
  ),
  ...timestamps("object"),
})
  .annotate({
    description: "Zendesk custom objects. Names `custom_object_records.custom_object_key`.",
  })
  .pipe(Iceberg.identifier("key"));

export const CustomObjectFieldSchema = Schema.Struct({
  id: Long.pipe(Schema.annotateKey({ description: "Field ID." })),
  version: version("field"),
  custom_object_key: Schema.String.pipe(
    Schema.annotateKey({ description: "Custom object the field is on." }),
  ),
  key: Schema.String.pipe(
    Schema.annotateKey({ description: "Key in `custom_object_records.custom_object_fields`." }),
  ),
  title: Schema.String.pipe(Schema.annotateKey({ description: "Field name." })),
  type: Schema.String.pipe(
    Schema.annotateKey({ description: "Field type, such as text, dropdown, or lookup." }),
  ),
  description: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Field description." }),
  ),
  active: Schema.optional(Schema.Boolean).pipe(
    Schema.annotateKey({ description: "Whether the field is in use." }),
  ),
  required: Schema.optional(Schema.Boolean).pipe(
    Schema.annotateKey({ description: "Whether records need a value." }),
  ),
  custom_field_options: Schema.optional(
    Schema.Array(
      Schema.Struct({
        name: Schema.String.pipe(Schema.annotateKey({ description: "Option name." })),
        value: Schema.String.pipe(Schema.annotateKey({ description: "Stored value." })),
      }),
    ),
  ).pipe(Schema.annotateKey({ description: "Options of dropdown and multiselect fields." })),
  relationship_target_type: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "What a lookup field points to." }),
  ),
  ...timestamps("field"),
})
  .annotate({ description: "Fields of Zendesk custom objects." })
  .pipe(Iceberg.identifier("id"));

export const CustomObjectRecordSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Record ID." })),
  version: version("record"),
  custom_object_key: Schema.String.pipe(
    Schema.annotateKey({ description: "Custom object the record belongs to." }),
  ),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Record name." })),
  external_id: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "ID in another system." }),
  ),
  custom_object_fields: Json.pipe(
    Schema.annotateKey({ description: "Field values by key, as JSON." }),
  ),
  created_by_user_id: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "User who created the record." }),
  ),
  updated_by_user_id: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "User who last updated the record." }),
  ),
  ...timestamps("record"),
})
  .annotate({ description: "Records of Zendesk custom objects." })
  .pipe(Iceberg.identifier("id"));

export type CustomObject = Schema.Schema.Type<typeof CustomObjectSchema>;
export type CustomObjectField = Schema.Schema.Type<typeof CustomObjectFieldSchema>;
export type CustomObjectRecord = Schema.Schema.Type<typeof CustomObjectRecordSchema>;

export const CustomObjectObjectSchema = CustomObjectSchema.mapFields((fields) =>
  Struct.omit(fields, ["version"]),
);

// Fields come without their object.
export const CustomObjectFieldObjectSchema = CustomObjectFieldSchema.mapFields((fields) =>
  Struct.omit(fields, ["version", "custom_object_key"]),
);

export const CustomObjectRecordObjectSchema = CustomObjectRecordSchema.mapFields((fields) =>
  Struct.omit(fields, ["version"]),
);

import { Iceberg } from "@useairfoil/connector-kit";
import { Schema } from "effect";

import { Long, Timestamp, version } from "./shared";

const OptionSchema = Schema.Struct({
  label: Schema.String.pipe(Schema.annotateKey({ description: "Option name." })),
  value: Schema.String.pipe(Schema.annotateKey({ description: "Value stored in `properties`." })),
  display_order: Long.pipe(Schema.annotateKey({ description: "Position of the option." })),
  hidden: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the option is hidden in forms." }),
  ),
});

export const PropertySchema = Schema.Struct({
  key: Schema.String.pipe(
    Schema.annotateKey({
      description: "Object type and property name, such as `deals:dealstage`.",
    }),
  ),
  version,
  object_type: Schema.String.pipe(
    Schema.annotateKey({
      description: "Table the property belongs to, or a custom object type ID such as `2-123`.",
    }),
  ),
  name: Schema.String.pipe(
    Schema.annotateKey({ description: "Internal name, the key in `properties`." }),
  ),
  label: Schema.String.pipe(Schema.annotateKey({ description: "Property name in HubSpot." })),
  type: Schema.String.pipe(
    Schema.annotateKey({
      description: "Value type, such as string, number, date, or enumeration.",
    }),
  ),
  field_type: Schema.String.pipe(
    Schema.annotateKey({ description: "Input type, such as text, select, or checkbox." }),
  ),
  description: Schema.String.pipe(Schema.annotateKey({ description: "Property description." })),
  group_name: Schema.String.pipe(Schema.annotateKey({ description: "Property group." })),
  options: Schema.Array(OptionSchema).pipe(
    Schema.annotateKey({
      description:
        "Options of an enumeration. Empty when they come from elsewhere, such as pipeline stages.",
    }),
  ),
  calculated: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether HubSpot calculates the value." }),
  ),
  hidden: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the property is hidden in HubSpot." }),
  ),
  hubspot_defined: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether HubSpot created the property." }),
  ),
  archived: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the property was removed." }),
  ),
  created_at: Schema.optional(Schema.Date).pipe(
    Schema.annotateKey({ description: "Time the property was created." }),
  ),
  updated_at: Schema.optional(Schema.Date).pipe(
    Schema.annotateKey({ description: "Time the property last changed." }),
  ),
})
  .annotate({ description: "Property definitions that name the keys and values in `properties`." })
  .pipe(Iceberg.identifier("key"));

export type Property = Schema.Schema.Type<typeof PropertySchema>;

export const PropertyObjectSchema = Schema.Struct({
  name: Schema.String,
  label: Schema.String,
  type: Schema.String,
  fieldType: Schema.String,
  description: Schema.String,
  groupName: Schema.String,
  options: Schema.Array(
    Schema.Struct({
      label: Schema.String,
      value: Schema.String,
      displayOrder: Long,
      hidden: Schema.Boolean,
    }),
  ),
  calculated: Schema.Boolean,
  hidden: Schema.Boolean,
  hubspotDefined: Schema.optional(Schema.Boolean),
  archived: Schema.optional(Schema.Boolean),
  createdAt: Schema.optional(Timestamp),
  updatedAt: Schema.optional(Timestamp),
});

export type PropertyObject = Schema.Schema.Type<typeof PropertyObjectSchema>;

import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { Long, Timestamp, deleted, keyedCustomFields, version } from "./shared";

export const OrganizationSchema = Schema.Struct({
  id: Long.pipe(Schema.annotateKey({ description: "Organization ID." })),
  version: version("organization"),
  _deleted: deleted("organization"),
  created_at: Timestamp.pipe(
    Schema.annotateKey({ description: "Time the organization was created." }),
  ),
  updated_at: Timestamp.pipe(
    Schema.annotateKey({ description: "Time the organization was last updated." }),
  ),
  name: Schema.String.pipe(
    Schema.annotateKey({ description: "Organization name. Zendesk renames deleted ones." }),
  ),
  external_id: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "ID in another system." }),
  ),
  group_id: Schema.NullOr(Long).pipe(
    Schema.annotateKey({ description: "Group that gets new tickets from its users." }),
  ),
  domain_names: Schema.Array(Schema.String).pipe(
    Schema.annotateKey({ description: "Email domains of its users." }),
  ),
  tags: Schema.Array(Schema.String).pipe(Schema.annotateKey({ description: "Organization tags." })),
  organization_fields: Schema.ReadonlyMap(Schema.String, Schema.String).pipe(
    Schema.annotateKey({
      description: "Custom organization field values by field key. Lists are JSON.",
    }),
  ),
})
  .annotate({ description: "Zendesk organizations, usually customer companies." })
  .pipe(Iceberg.identifier("id"));

export type Organization = Schema.Schema.Type<typeof OrganizationSchema>;

export const OrganizationObjectSchema = OrganizationSchema.mapFields((fields) => ({
  ...Struct.omit(fields, ["version", "_deleted", "organization_fields"]),
  deleted_at: Schema.NullOr(Timestamp),
  organization_fields: keyedCustomFields,
}));

export type OrganizationObject = Schema.Schema.Type<typeof OrganizationObjectSchema>;

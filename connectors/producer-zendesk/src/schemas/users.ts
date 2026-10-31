import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { Long, Timestamp, deleted, keyedCustomFields, version } from "./shared";

const IdentitySchema = Schema.Struct({
  id: Long.pipe(Schema.annotateKey({ description: "Identity ID." })),
  type: Schema.String.pipe(
    Schema.annotateKey({ description: "email, phone_number, twitter, and others." }),
  ),
  value: Schema.String.pipe(
    Schema.annotateKey({ description: "Email address, phone number, or handle." }),
  ),
  verified: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the identity is verified." }),
  ),
  primary: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether it's the primary one of its type." }),
  ),
});

export const UserSchema = Schema.Struct({
  id: Long.pipe(Schema.annotateKey({ description: "User ID." })),
  version: version("user"),
  _deleted: deleted("user"),
  created_at: Timestamp.pipe(Schema.annotateKey({ description: "Time the user was created." })),
  updated_at: Timestamp.pipe(
    Schema.annotateKey({ description: "Time the user was last updated." }),
  ),
  name: Schema.String.pipe(Schema.annotateKey({ description: "User name." })),
  email: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Primary email. Empty for some end users." }),
  ),
  role: Schema.String.pipe(Schema.annotateKey({ description: "Role: end-user, agent, or admin." })),
  custom_role_id: Schema.NullOr(Long).pipe(
    Schema.annotateKey({ description: "Custom agent role ID." }),
  ),
  organization_id: Schema.NullOr(Long).pipe(
    Schema.annotateKey({ description: "Default organization of the user." }),
  ),
  default_group_id: Schema.NullOr(Long).pipe(
    Schema.annotateKey({ description: "Default group of an agent." }),
  ),
  suspended: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the user is suspended." }),
  ),
  verified: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the primary identity is verified." }),
  ),
  locale: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Locale, such as en-US." }),
  ),
  time_zone: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Time zone name." }),
  ),
  external_id: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "ID in another system." }),
  ),
  last_login_at: Schema.NullOr(Timestamp).pipe(
    Schema.annotateKey({ description: "Time of the last sign-in." }),
  ),
  tags: Schema.Array(Schema.String).pipe(Schema.annotateKey({ description: "User tags." })),
  user_fields: Schema.ReadonlyMap(Schema.String, Schema.String).pipe(
    Schema.annotateKey({ description: "Custom user field values by field key. Lists are JSON." }),
  ),
  identities: Schema.Array(IdentitySchema).pipe(
    Schema.annotateKey({
      description: "Every email, phone number, and other identity of the user.",
    }),
  ),
})
  .annotate({ description: "Zendesk users: end users, agents, and admins." })
  .pipe(Iceberg.identifier("id"));

export type User = Schema.Schema.Type<typeof UserSchema>;

export const UserObjectSchema = UserSchema.mapFields((fields) => ({
  ...Struct.omit(fields, ["version", "_deleted", "user_fields", "identities"]),
  // `false` once the user is deleted.
  active: Schema.Boolean,
  user_fields: keyedCustomFields,
}));

export type UserObject = Schema.Schema.Type<typeof UserObjectSchema>;

export const IdentityObjectSchema = Schema.Struct({
  ...IdentitySchema.fields,
  user_id: Long,
});

export type IdentityObject = Schema.Schema.Type<typeof IdentityObjectSchema>;

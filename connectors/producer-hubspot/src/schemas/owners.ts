import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { Long, Timestamp, version } from "./shared";

const TeamSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Team ID." })),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Team name." })),
  primary: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether this is the owner's main team." }),
  ),
});

export const OwnerSchema = Schema.Struct({
  id: Schema.String.pipe(
    Schema.annotateKey({ description: "Owner ID, as used in `hubspot_owner_id`." }),
  ),
  version,
  type: Schema.String.pipe(Schema.annotateKey({ description: "PERSON for a user, or QUEUE." })),
  email: Schema.optional(Schema.String).pipe(Schema.annotateKey({ description: "Owner email." })),
  first_name: Schema.optional(Schema.String).pipe(
    Schema.annotateKey({ description: "Owner first name." }),
  ),
  last_name: Schema.optional(Schema.String).pipe(
    Schema.annotateKey({ description: "Owner last name." }),
  ),
  user_id: Schema.optional(Long).pipe(
    Schema.annotateKey({ description: "HubSpot user ID. Empty for a removed user." }),
  ),
  user_id_including_inactive: Schema.optional(Long).pipe(
    Schema.annotateKey({ description: "HubSpot user ID, also for a removed user." }),
  ),
  teams: Schema.Array(TeamSchema).pipe(Schema.annotateKey({ description: "Teams of the owner." })),
  archived: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the user was removed from HubSpot." }),
  ),
  created_at: Schema.Date.pipe(Schema.annotateKey({ description: "Time the owner was created." })),
})
  .annotate({ description: "HubSpot users and queues that can own records." })
  .pipe(Iceberg.identifier("id"));

export type Owner = Schema.Schema.Type<typeof OwnerSchema>;

export const OwnerObjectSchema = Schema.Struct({
  ...Struct.pick(OwnerSchema.fields, ["id", "type", "archived"]),
  email: Schema.optional(Schema.String),
  firstName: Schema.optional(Schema.String),
  lastName: Schema.optional(Schema.String),
  userId: Schema.optional(Long),
  userIdIncludingInactive: Schema.optional(Long),
  teams: Schema.optional(Schema.Array(Schema.Struct(TeamSchema.fields))),
  createdAt: Timestamp,
  updatedAt: Timestamp,
});

export type OwnerObject = Schema.Schema.Type<typeof OwnerObjectSchema>;

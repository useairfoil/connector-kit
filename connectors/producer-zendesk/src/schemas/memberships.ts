import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { Long, Timestamp, deleted, version } from "./shared";

export const GroupMembershipSchema = Schema.Struct({
  id: Long.pipe(Schema.annotateKey({ description: "Membership ID." })),
  version: version("membership"),
  _deleted: deleted("membership"),
  created_at: Timestamp.pipe(
    Schema.annotateKey({ description: "Time the agent was added to the group." }),
  ),
  updated_at: Timestamp.pipe(
    Schema.annotateKey({ description: "Time the membership was last updated." }),
  ),
  user_id: Long.pipe(Schema.annotateKey({ description: "Agent in the group." })),
  group_id: Long.pipe(Schema.annotateKey({ description: "Group." })),
  default: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether this is the agent's default group." }),
  ),
})
  .annotate({ description: "Which agents are in which Zendesk groups." })
  .pipe(Iceberg.identifier("id"));

export type GroupMembership = Schema.Schema.Type<typeof GroupMembershipSchema>;

export const OrganizationMembershipSchema = Schema.Struct({
  id: Long.pipe(Schema.annotateKey({ description: "Membership ID." })),
  version: version("membership"),
  _deleted: deleted("membership"),
  created_at: Timestamp.pipe(
    Schema.annotateKey({ description: "Time the user was added to the organization." }),
  ),
  updated_at: Timestamp.pipe(
    Schema.annotateKey({ description: "Time the membership was last updated." }),
  ),
  user_id: Long.pipe(Schema.annotateKey({ description: "User in the organization." })),
  organization_id: Long.pipe(Schema.annotateKey({ description: "Organization." })),
  default: Schema.NullOr(Schema.Boolean).pipe(
    Schema.annotateKey({ description: "Whether this is the user's default organization." }),
  ),
  view_tickets: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the user can see the organization's tickets." }),
  ),
})
  .annotate({
    description: "Which users are in which Zendesk organizations. A user can be in several.",
  })
  .pipe(Iceberg.identifier("id"));

export type OrganizationMembership = Schema.Schema.Type<typeof OrganizationMembershipSchema>;

const objectOf = <F extends Schema.Struct.Fields>(schema: Schema.Struct<F>) =>
  schema.mapFields((fields) => Struct.omit(fields, ["version", "_deleted"]));

export const GroupMembershipObjectSchema = objectOf(GroupMembershipSchema);
export const OrganizationMembershipObjectSchema = objectOf(OrganizationMembershipSchema);

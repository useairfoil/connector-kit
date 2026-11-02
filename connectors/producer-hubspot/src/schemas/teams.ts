import { Iceberg } from "@useairfoil/connector-kit";
import { Schema } from "effect";

import { version } from "./shared";

const MemberSchema = Schema.Struct({
  user_id: Schema.String.pipe(
    Schema.annotateKey({ description: "HubSpot user ID, as used in `owners.user_id`." }),
  ),
  type: Schema.String.pipe(
    Schema.annotateKey({ description: "DEFAULT for the user's main team, or EXTRA." }),
  ),
});

export const TeamSchema = Schema.Struct({
  id: Schema.String.pipe(
    Schema.annotateKey({ description: "Team ID, as used in `hubspot_team_id`." }),
  ),
  version,
  name: Schema.String.pipe(Schema.annotateKey({ description: "Team name." })),
  parent_team_id: Schema.optional(Schema.String).pipe(
    Schema.annotateKey({ description: "ID of the parent team." }),
  ),
  members: Schema.Array(MemberSchema).pipe(
    Schema.annotateKey({ description: "Users in the team." }),
  ),
})
  .annotate({ description: "HubSpot teams and their users." })
  .pipe(Iceberg.identifier("id"));

export type Team = Schema.Schema.Type<typeof TeamSchema>;

export const TeamObjectSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  parentTeamId: Schema.optional(Schema.NullOr(Schema.String)),
});

export const TeamMemberObjectSchema = Schema.Struct({ userId: Schema.String, type: Schema.String });

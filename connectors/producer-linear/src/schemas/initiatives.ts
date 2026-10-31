import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import {
  Long,
  OptionalRef,
  OptionalString,
  OptionalTimestamp,
  Ref,
  common,
  deleted,
} from "./shared";

export const InitiativeSchema = Schema.Struct({
  ...common("Initiative"),
  _deleted: deleted("initiative"),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Initiative name." })),
  description: OptionalString.pipe(Schema.annotateKey({ description: "Short summary." })),
  content: OptionalString.pipe(
    Schema.annotateKey({ description: "Initiative overview in markdown." }),
  ),
  url: Schema.String.pipe(Schema.annotateKey({ description: "Initiative URL." })),
  icon: OptionalString.pipe(Schema.annotateKey({ description: "Icon." })),
  color: OptionalString.pipe(Schema.annotateKey({ description: "Color, as hex." })),
  status: Schema.String.pipe(
    Schema.annotateKey({ description: "Status: Planned, Active, or Completed." }),
  ),
  health: OptionalString.pipe(
    Schema.annotateKey({ description: "Health from the latest update." }),
  ),
  health_updated_at: OptionalTimestamp.pipe(
    Schema.annotateKey({ description: "Time the health last changed." }),
  ),
  priority: Long.pipe(
    Schema.annotateKey({ description: "0 none, 1 urgent, 2 high, 3 medium, 4 low." }),
  ),
  owner_id: OptionalRef.pipe(Schema.annotateKey({ description: "Initiative owner." })),
  creator_id: OptionalRef.pipe(
    Schema.annotateKey({ description: "User who made the initiative." }),
  ),
  parent_initiative_id: OptionalRef.pipe(Schema.annotateKey({ description: "Parent initiative." })),
  target_date: OptionalString.pipe(
    Schema.annotateKey({ description: "Target date, as YYYY-MM-DD." }),
  ),
  started_at: OptionalTimestamp.pipe(
    Schema.annotateKey({ description: "Time the initiative started." }),
  ),
  completed_at: OptionalTimestamp.pipe(
    Schema.annotateKey({ description: "Time the initiative was completed." }),
  ),
  canceled_at: OptionalTimestamp.pipe(
    Schema.annotateKey({ description: "Time the initiative was canceled." }),
  ),
  label_ids: Schema.Array(Schema.String).pipe(
    Schema.annotateKey({ description: "Initiative labels." }),
  ),
  visibility: Schema.String.pipe(
    Schema.annotateKey({ description: "Who can see the initiative." }),
  ),
  trashed: Schema.NullOr(Schema.Boolean).pipe(
    Schema.annotateKey({ description: "Whether the initiative is in the trash." }),
  ),
})
  .annotate({ description: "Linear initiatives, including archived and trashed ones." })
  .pipe(Iceberg.identifier("id"));

export type Initiative = Schema.Schema.Type<typeof InitiativeSchema>;

export const InitiativeObjectSchema = InitiativeSchema.mapFields((fields) =>
  Struct.omit(fields, ["version", "_deleted"]),
);

export const InitiativeUpdateSchema = Schema.Struct({
  ...common("Update"),
  _deleted: deleted("update"),
  initiative_id: Ref.pipe(Schema.annotateKey({ description: "Initiative." })),
  user_id: Ref.pipe(Schema.annotateKey({ description: "User who posted the update." })),
  body: Schema.String.pipe(Schema.annotateKey({ description: "Update text in markdown." })),
  health: Schema.String.pipe(
    Schema.annotateKey({ description: "Health: onTrack, atRisk, or offTrack." }),
  ),
  url: Schema.String.pipe(Schema.annotateKey({ description: "Update URL." })),
  edited_at: OptionalTimestamp.pipe(
    Schema.annotateKey({ description: "Time the update was last edited." }),
  ),
  comment_count: Long.pipe(Schema.annotateKey({ description: "Comments on the update." })),
})
  .annotate({ description: "Linear initiative updates: status posts with a health." })
  .pipe(Iceberg.identifier("id"));

export type InitiativeUpdate = Schema.Schema.Type<typeof InitiativeUpdateSchema>;

export const InitiativeUpdateObjectSchema = InitiativeUpdateSchema.mapFields((fields) =>
  Struct.omit(fields, ["version", "_deleted"]),
);

export const InitiativeLabelSchema = Schema.Struct({
  ...common("Label"),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Label name." })),
  description: OptionalString.pipe(Schema.annotateKey({ description: "Label description." })),
  color: Schema.String.pipe(Schema.annotateKey({ description: "Label color, as hex." })),
  is_group: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the label groups other labels." }),
  ),
  parent_id: OptionalRef.pipe(Schema.annotateKey({ description: "Label group." })),
  creator_id: OptionalRef.pipe(Schema.annotateKey({ description: "User who made the label." })),
  retired_at: OptionalTimestamp.pipe(
    Schema.annotateKey({ description: "Time the label was retired." }),
  ),
})
  .annotate({ description: "Linear initiative labels. Names the IDs in `initiatives.label_ids`." })
  .pipe(Iceberg.identifier("id"));

export type InitiativeLabel = Schema.Schema.Type<typeof InitiativeLabelSchema>;

export const InitiativeLabelObjectSchema = InitiativeLabelSchema.mapFields((fields) =>
  Struct.omit(fields, ["version"]),
);

export const InitiativeRelationSchema = Schema.Struct({
  ...common("Relation"),
  initiative_id: Ref.pipe(
    Schema.annotateKey({ description: "Initiative the relation starts from." }),
  ),
  related_initiative_id: Ref.pipe(Schema.annotateKey({ description: "Related initiative." })),
  sort_order: Schema.Finite.pipe(Schema.annotateKey({ description: "Order." })),
  user_id: OptionalRef.pipe(Schema.annotateKey({ description: "User who made the relation." })),
})
  .annotate({ description: "Linear initiative relations. Deleted relations aren't seen." })
  .pipe(Iceberg.identifier("id"));

export type InitiativeRelation = Schema.Schema.Type<typeof InitiativeRelationSchema>;

export const InitiativeRelationObjectSchema = InitiativeRelationSchema.mapFields((fields) =>
  Struct.omit(fields, ["version"]),
);

export const InitiativeToProjectSchema = Schema.Struct({
  ...common("Link"),
  initiative_id: Ref.pipe(Schema.annotateKey({ description: "Initiative." })),
  project_id: Ref.pipe(Schema.annotateKey({ description: "Project." })),
  sort_order: Schema.String.pipe(
    Schema.annotateKey({ description: "Order within the initiative." }),
  ),
})
  .annotate({
    description: "Links between Linear initiatives and projects. Removed links aren't seen.",
  })
  .pipe(Iceberg.identifier("id"));

export type InitiativeToProject = Schema.Schema.Type<typeof InitiativeToProjectSchema>;

export const InitiativeToProjectObjectSchema = InitiativeToProjectSchema.mapFields((fields) =>
  Struct.omit(fields, ["version"]),
);

import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { Long, Text, Timestamp, deleted, milestone, version } from "./shared";

export const MilestoneSchema = Schema.Struct({
  ...milestone.fields,
  version: version("milestone"),
  repository_id: Long.pipe(
    Schema.annotateKey({ description: "Repository that owns the milestone." }),
  ),
  description: Text.pipe(Schema.annotateKey({ description: "Milestone description." })),
  state: Schema.String.pipe(
    Schema.annotateKey({ description: "Milestone state, open or closed." }),
  ),
  created_at: Timestamp.pipe(
    Schema.annotateKey({ description: "When the milestone was created." }),
  ),
  due_on: Schema.NullOr(Timestamp).pipe(Schema.annotateKey({ description: "Milestone due date." })),
  closed_at: Schema.NullOr(Timestamp).pipe(
    Schema.annotateKey({ description: "When the milestone was closed." }),
  ),
  _deleted: deleted("milestone"),
})
  .annotate({ description: "Open and closed milestones defined in a repository." })
  .pipe(Iceberg.identifier("id"));

export type Milestone = typeof MilestoneSchema.Type;
export const MilestoneObjectSchema = MilestoneSchema.mapFields((fields) => ({
  ...Struct.omit(fields, ["version", "repository_id", "_deleted"]),
  updated_at: Timestamp,
}));

import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { Long, Text, deleted, label, readVersion } from "./shared";

export const LabelSchema = Schema.Struct({
  ...label.fields,
  version: readVersion("label"),
  repository_id: Long.pipe(Schema.annotateKey({ description: "Repository that owns the label." })),
  color: Schema.String.pipe(Schema.annotateKey({ description: "Label color as a hex string." })),
  description: Text.pipe(Schema.annotateKey({ description: "Label description." })),
  default: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether GitHub created the label." }),
  ),
  _deleted: deleted("label"),
})
  .annotate({ description: "Labels defined in a repository, including labels unused by issues." })
  .pipe(Iceberg.identifier("id"));

export type Label = typeof LabelSchema.Type;
export const LabelObjectSchema = LabelSchema.mapFields(
  Struct.omit(["version", "repository_id", "_deleted"]),
);

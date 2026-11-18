import * as Iceberg from "@useairfoil/connector-kit/iceberg";
import { Schema, Struct } from "effect";

import { Long, readVersion } from "./shared";

const ref = (object: string) => ({
  key: Schema.String.pipe(Schema.annotateKey({ description: `Repository ID and ${object} name.` })),
  version: readVersion(object),
  repository_id: Long.pipe(Schema.annotateKey({ description: "Repository ID." })),
  name: Schema.String.pipe(Schema.annotateKey({ description: `Name of the ${object}.` })),
  commit: Schema.Struct({
    sha: Schema.String.pipe(Schema.annotateKey({ description: "Commit SHA." })),
  }).pipe(Schema.annotateKey({ description: `Commit the ${object} points to.` })),
});

export const BranchSchema = Schema.Struct({
  ...ref("branch"),
  protected: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the branch has protection." }),
  ),
})
  .annotate({ description: "Branches in the installation's repositories." })
  .pipe(Iceberg.identifier("key"));

export type Branch = typeof BranchSchema.Type;
export const BranchObjectSchema = BranchSchema.mapFields(
  Struct.omit(["key", "version", "repository_id"]),
);

export const TagSchema = Schema.Struct(ref("tag"))
  .annotate({ description: "Tags in the installation's repositories." })
  .pipe(Iceberg.identifier("key"));

export type Tag = typeof TagSchema.Type;
export const TagObjectSchema = TagSchema.mapFields(
  Struct.omit(["key", "version", "repository_id"]),
);

import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { Long, Timestamp, readVersion } from "./shared";

export const WorkflowArtifactSchema = Schema.Struct({
  id: Long.pipe(Schema.annotateKey({ description: "Artifact ID." })),
  version: readVersion("artifact"),
  repository_id: Long.pipe(Schema.annotateKey({ description: "Repository ID." })),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Artifact name." })),
  size_in_bytes: Long.pipe(Schema.annotateKey({ description: "Artifact size in bytes." })),
  expired: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the artifact expired." }),
  ),
  created_at: Schema.NullOr(Timestamp).pipe(
    Schema.annotateKey({ description: "Time the artifact was created." }),
  ),
  updated_at: Schema.NullOr(Timestamp).pipe(
    Schema.annotateKey({ description: "Time the artifact last changed." }),
  ),
  expires_at: Schema.NullOr(Timestamp).pipe(
    Schema.annotateKey({ description: "Time GitHub expires the artifact." }),
  ),
  digest: Schema.optionalKey(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Digest for the uploaded artifact." }),
  ),
  workflow_run: Schema.optionalKey(
    Schema.NullOr(
      Schema.Struct({
        id: Long.pipe(Schema.annotateKey({ description: "Workflow run ID." })),
      }),
    ),
  ).pipe(Schema.annotateKey({ description: "Workflow run that uploaded the artifact." })),
})
  .annotate({ description: "Metadata for GitHub Actions artifacts." })
  .pipe(Iceberg.identifier("id"));

export type WorkflowArtifact = typeof WorkflowArtifactSchema.Type;
export const WorkflowArtifactObjectSchema = WorkflowArtifactSchema.mapFields(
  Struct.omit(["version", "repository_id"]),
);

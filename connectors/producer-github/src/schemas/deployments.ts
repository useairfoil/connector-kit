import * as Iceberg from "@useairfoil/connector-kit/iceberg";
import { Schema, Struct } from "effect";

import { Long, Timestamp, version } from "./shared";

const id = Long.pipe(Schema.annotateKey({ description: "GitHub record ID." }));
const repository_id = Long.pipe(Schema.annotateKey({ description: "Repository ID." }));
const created_at = Timestamp.pipe(Schema.annotateKey({ description: "Creation time." }));
const updated_at = Timestamp.pipe(Schema.annotateKey({ description: "Last update time." }));
const description = Schema.NullOr(Schema.String).pipe(
  Schema.annotateKey({ description: "Description set when the record was created." }),
);

export const DeploymentSchema = Schema.Struct({
  id,
  version: version("deployment"),
  repository_id,
  created_at,
  updated_at,
  description,
  sha: Schema.String.pipe(Schema.annotateKey({ description: "Commit being deployed." })),
  ref: Schema.String.pipe(Schema.annotateKey({ description: "Git ref being deployed." })),
  environment: Schema.String.pipe(Schema.annotateKey({ description: "Deployment environment." })),
  task: Schema.String.pipe(Schema.annotateKey({ description: "Deployment task." })),
})
  .annotate({ description: "Deployments in the installation's repositories." })
  .pipe(Iceberg.identifier("id"));

export type Deployment = typeof DeploymentSchema.Type;
export const DeploymentObjectSchema = DeploymentSchema.mapFields(
  Struct.omit(["version", "repository_id"]),
);
export type DeploymentObject = typeof DeploymentObjectSchema.Type;

export const DeploymentStatusSchema = Schema.Struct({
  id,
  version: version("deployment status"),
  repository_id,
  deployment_id: Long.pipe(
    Schema.annotateKey({ description: "Deployment this status belongs to." }),
  ),
  created_at,
  updated_at,
  description,
  state: Schema.String.pipe(
    Schema.annotateKey({ description: "State reported by the deployment." }),
  ),
  environment: Schema.optionalKey(Schema.String).pipe(
    Schema.annotateKey({ description: "Environment reported by this status." }),
  ),
})
  .annotate({ description: "Status history for repository deployments." })
  .pipe(Iceberg.identifier("id"));

export type DeploymentStatus = typeof DeploymentStatusSchema.Type;
export const DeploymentStatusObjectSchema = DeploymentStatusSchema.mapFields(
  Struct.omit(["version", "repository_id", "deployment_id"]),
);

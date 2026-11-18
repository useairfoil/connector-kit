import { type ConnectorError, Resource } from "@useairfoil/connector-kit";
import { Duration, Effect, Schema } from "effect";

import type { GitHubClientService } from "../client/client";
import type { RepositoryRef } from "../schemas/repositories";

import {
  type Deployment,
  type DeploymentObject,
  DeploymentObjectSchema,
  DeploymentSchema,
  type DeploymentStatus,
  DeploymentStatusObjectSchema,
  DeploymentStatusSchema,
} from "../schemas/deployments";
import {
  type RepoResourceSpec,
  backfillRepoResource,
  changesRepoResource,
  checkRepoResource,
  childRows,
  rowsOf,
  timestamps,
} from "./shared";

const deploymentSpec: RepoResourceSpec<DeploymentObject, Deployment> = {
  path: "deployments",
  pageSchema: Schema.Array(DeploymentObjectSchema),
  params: {},
  since: false,
  order: "newest",
  recentFor: Duration.days(1),
  ...timestamps,
  keep: () => true,
  enabled: () => true,
  rows: rowsOf((deployment, repository_id) => ({
    ...deployment,
    version: deployment.updated_at,
    repository_id,
  })),
};

export const makeDeployments = (
  client: GitHubClientService,
  repositories: Effect.Effect<ReadonlyArray<RepositoryRef>, ConnectorError>,
) =>
  Resource.entity({
    name: "deployments",
    rowSchema: DeploymentSchema,
    version: "version",

    check: checkRepoResource(client, deploymentSpec),
    backfill: backfillRepoResource(client, repositories, deploymentSpec),
    changes: changesRepoResource(client, deploymentSpec),
  });

export const makeDeploymentStatuses = (
  client: GitHubClientService,
  repositories: Effect.Effect<ReadonlyArray<RepositoryRef>, ConnectorError>,
) => {
  const spec: RepoResourceSpec<DeploymentObject, DeploymentStatus> = {
    ...deploymentSpec,
    // A new status may not change the deployment's `updated_at`, so changes
    // read the statuses of every recent deployment.
    updatedAt: undefined,
    rows: childRows(client, {
      path: (deployment: DeploymentObject) => `deployments/${deployment.id}/statuses`,
      pageSchema: Schema.Array(DeploymentStatusObjectSchema),
      toRow: (status, deployment, repository_id) => ({
        ...status,
        version: status.updated_at,
        repository_id,
        deployment_id: deployment.id,
      }),
    }),
  };
  return Resource.entity({
    name: "deployment_statuses",
    rowSchema: DeploymentStatusSchema,
    version: "version",

    check: checkRepoResource(client, spec),
    backfill: backfillRepoResource(client, repositories, spec),
    changes: changesRepoResource(client, spec),
  });
};

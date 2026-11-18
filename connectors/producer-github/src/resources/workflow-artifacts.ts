import { type ConnectorError, Resource } from "@useairfoil/connector-kit";
import { Effect } from "effect";

import type { GitHubClientService } from "../client/client";
import type { RepositoryRef } from "../schemas/repositories";

import {
  type WorkflowArtifact,
  WorkflowArtifactObjectSchema,
  WorkflowArtifactSchema,
} from "../schemas/workflow-artifacts";
import {
  type RepoResourceSpec,
  backfillRepoResource,
  changesRepoResource,
  checkRepoResource,
  wrappedList,
} from "./shared";

// The list can't filter by time, so every read sends all artifacts. GitHub
// deletes them after their retention period.
const spec: RepoResourceSpec<typeof WorkflowArtifactObjectSchema.Type, WorkflowArtifact> = {
  path: "actions/artifacts",
  pageSchema: wrappedList("artifacts", WorkflowArtifactObjectSchema),
  params: {},
  since: false,
  order: "newest",
  keep: () => true,
  enabled: () => true,
  rows: (items, repository, version) =>
    Effect.succeed(
      items.map((item) => ({ ...item, version, repository_id: BigInt(repository.id) })),
    ),
};

export const makeWorkflowArtifacts = (
  client: GitHubClientService,
  repositories: Effect.Effect<ReadonlyArray<RepositoryRef>, ConnectorError>,
) =>
  Resource.entity({
    name: "workflow_artifacts",
    rowSchema: WorkflowArtifactSchema,
    version: "version",

    check: checkRepoResource(client, spec),
    backfill: backfillRepoResource(client, repositories, spec),
    changes: changesRepoResource(client, spec),
  });

import { type ConnectorError, Resource } from "@useairfoil/connector-kit";
import { Effect } from "effect";

import type { GitHubClientService } from "../client/client";
import type { RepositoryRef } from "../schemas/repositories";

import { type Workflow, WorkflowObjectSchema, WorkflowSchema } from "../schemas/workflows";
import {
  type RepoResourceSpec,
  backfillRepoResource,
  changesRepoResource,
  checkRepoResource,
  rowsOf,
  timestamps,
  wrappedList,
} from "./shared";

const spec: RepoResourceSpec<typeof WorkflowObjectSchema.Type, Workflow> = {
  path: "actions/workflows",
  pageSchema: wrappedList("workflows", WorkflowObjectSchema),
  params: {},
  since: false,
  order: "newest",
  ...timestamps,
  keep: () => true,
  enabled: () => true,
  rows: rowsOf((workflow, repository_id) => ({
    ...workflow,
    version: workflow.updated_at,
    repository_id,
  })),
};

export const makeWorkflows = (
  client: GitHubClientService,
  repositories: Effect.Effect<ReadonlyArray<RepositoryRef>, ConnectorError>,
) =>
  Resource.entity({
    name: "workflow_definitions",
    rowSchema: WorkflowSchema,
    version: "version",

    check: checkRepoResource(client, spec),
    backfill: backfillRepoResource(client, repositories, spec),
    changes: changesRepoResource(client, spec),
  });

import { type ConnectorError, Resource } from "@useairfoil/connector-kit";
import { Effect, Schema } from "effect";

import type { GitHubClientService } from "../client/client";
import type { PullRequestObject } from "../schemas/pull-requests";
import type { RepositoryRef } from "../schemas/repositories";

import {
  type PullRequestFile,
  PullRequestFileObjectSchema,
  PullRequestFileSchema,
} from "../schemas/pull-request-files";
import { pullRequestSpec } from "./pull-requests";
import {
  type RepoResourceSpec,
  backfillRepoResource,
  changesRepoResource,
  checkRepoResource,
  childRows,
} from "./shared";

export const makePullRequestFiles = (
  client: GitHubClientService,
  repositories: Effect.Effect<ReadonlyArray<RepositoryRef>, ConnectorError>,
) => {
  const spec: RepoResourceSpec<PullRequestObject, PullRequestFile> = {
    ...pullRequestSpec,
    rows: childRows(client, {
      path: (pullRequest: PullRequestObject) => `pulls/${pullRequest.number}/files`,
      pageSchema: Schema.Array(PullRequestFileObjectSchema),
      toRow: (file, pullRequest, repository_id) => ({
        ...file,
        // A new push or base gives a new set of rows.
        key: `${repository_id}:${pullRequest.number}:${pullRequest.head.sha}:${pullRequest.base.sha}:${file.filename}`,
        version: pullRequest.updated_at,
        repository_id,
        pull_request_number: pullRequest.number,
        head_sha: pullRequest.head.sha,
        base_sha: pullRequest.base.sha,
      }),
    }),
  };
  return Resource.entity({
    name: "pull_request_files",
    rowSchema: PullRequestFileSchema,
    version: "version",

    check: checkRepoResource(client, spec),
    backfill: backfillRepoResource(client, repositories, spec),
    changes: changesRepoResource(client, spec),
  });
};

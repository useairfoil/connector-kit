import { type ConnectorError, Resource } from "@useairfoil/connector-kit";
import { Effect, Schema } from "effect";

import type { GitHubClientService } from "../client/client";
import type { RepositoryRef } from "../schemas/repositories";

import { PullRequestEventSchema, WebhookPayloadSchema } from "../schemas/events";
import {
  type PullRequest,
  type PullRequestObject,
  PullRequestObjectSchema,
  PullRequestSchema,
} from "../schemas/pull-requests";
import {
  type RepoResourceSpec,
  backfillRepoResource,
  changesRepoResource,
  checkRepoResource,
  decodeEvent,
  rowsOf,
  timestamps,
} from "./shared";

const toRow = (
  {
    updated_at,
    labels,
    assignees,
    requested_reviewers,
    requested_teams,
    ...rest
  }: PullRequestObject,
  repository_id: bigint,
): PullRequest => ({
  ...rest,
  version: updated_at,
  repository_id,
  labels: labels ?? [],
  assignees: assignees ?? [],
  requested_reviewers: requested_reviewers ?? [],
  requested_teams: requested_teams ?? [],
});

// A webhook can leave a list out, so read the pull request again.
const hasLists = ({ assignees, requested_reviewers, requested_teams }: PullRequestObject) =>
  assignees !== undefined && requested_reviewers !== undefined && requested_teams !== undefined;

export const pullRequestSpec: RepoResourceSpec<PullRequestObject, PullRequest> = {
  path: "pulls",
  pageSchema: Schema.Array(PullRequestObjectSchema),
  params: { state: "all" },
  // The pulls list has no `since`.
  since: false,
  order: "sorted",
  ...timestamps,
  keep: () => true,
  enabled: (repository) => repository.has_pull_requests,
  rows: rowsOf(toRow),
};

export const makePullRequests = (
  client: GitHubClientService,
  repositories: Effect.Effect<ReadonlyArray<RepositoryRef>, ConnectorError>,
) =>
  Resource.entity({
    name: "pull_requests",
    rowSchema: PullRequestSchema,
    version: "version",

    check: checkRepoResource(client, pullRequestSpec),
    backfill: backfillRepoResource(client, repositories, pullRequestSpec),
    changes: changesRepoResource(client, pullRequestSpec),
    webhook: {
      schema: WebhookPayloadSchema,
      handler: ({ payload }) =>
        Effect.gen(function* () {
          const { pull_request, repository } = yield* decodeEvent(PullRequestEventSchema, payload);
          const full = hasLists(pull_request)
            ? pull_request
            : (yield* client.get(
                PullRequestObjectSchema,
                `/repos/${repository.full_name}/pulls/${pull_request.number}`,
              )).body;
          return [toRow(full, repository.id)];
        }),
    },
  });

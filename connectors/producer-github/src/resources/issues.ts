import { type ConnectorError, Resource } from "@useairfoil/connector-kit";
import { Effect, Schema } from "effect";

import type { GitHubClientService } from "../client/client";
import type { RepositoryRef } from "../schemas/repositories";

import {
  IssueRemovedEventSchema,
  IssuesEventSchema,
  WebhookPayloadSchema,
} from "../schemas/events";
import { type Issue, type IssueObject, IssueObjectSchema, IssueSchema } from "../schemas/issues";
import {
  type RepoResourceSpec,
  backfillRepoResource,
  changesRepoResource,
  checkRepoResource,
  decodeEvent,
  deleteRow,
  rowsOf,
  timestamps,
} from "./shared";

const toRow = (
  {
    updated_at,
    labels,
    assignees,
    pull_request: _pullRequest,
    sub_issues_summary: _subIssues,
    issue_dependencies_summary: _dependencies,
    ...rest
  }: IssueObject,
  repository_id: bigint,
): Issue => ({
  ...rest,
  version: updated_at,
  repository_id,
  labels: labels ?? [],
  assignees: assignees ?? [],
});

// A webhook can leave a list out, so read the issue again.
const hasLists = ({ labels }: IssueObject) => labels !== undefined;

export const issueSpec: RepoResourceSpec<IssueObject, Issue> = {
  path: "issues",
  pageSchema: Schema.Array(IssueObjectSchema),
  params: { state: "all" },
  since: true,
  order: "sorted",
  ...timestamps,
  keep: (item) => item.pull_request === undefined,
  enabled: (repository) => repository.has_issues,
  rows: rowsOf(toRow),
};

export const makeIssues = (
  client: GitHubClientService,
  repositories: Effect.Effect<ReadonlyArray<RepositoryRef>, ConnectorError>,
) =>
  Resource.entity({
    name: "issues",
    rowSchema: IssueSchema,
    version: "version",

    check: checkRepoResource(client, issueSpec),
    backfill: backfillRepoResource(client, repositories, issueSpec),
    changes: changesRepoResource(client, issueSpec),
    webhook: {
      schema: WebhookPayloadSchema,
      handler: ({ payload }) =>
        Effect.gen(function* () {
          const event = yield* decodeEvent(IssuesEventSchema, payload);
          if (Schema.is(IssueRemovedEventSchema)(event)) return [yield* deleteRow(event.issue.id)];
          const { issue, repository } = event;
          const full = hasLists(issue)
            ? issue
            : (yield* client.get(
                IssueObjectSchema,
                `/repos/${repository.full_name}/issues/${issue.number}`,
              )).body;
          return [toRow(full, repository.id)];
        }),
    },
  });

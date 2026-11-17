import { type ConnectorError, Resource } from "@useairfoil/connector-kit";
import { Effect, Schema } from "effect";

import type { IssueObject } from "../schemas/issues";
import type { RepositoryRef } from "../schemas/repositories";

import { type GitHubClientService, withParams } from "../client/client";
import { type IssueLinks, IssueLinksSchema, IssueRefSchema } from "../schemas/issue-links";
import { issueSpec } from "./issues";
import {
  type RepoResourceSpec,
  backfillRepoResource,
  changesRepoResource,
  checkRepoResource,
  pageSize,
  readPages,
  repoPath,
} from "./shared";

export const makeIssueLinks = (
  client: GitHubClientService,
  repositories: Effect.Effect<ReadonlyArray<RepositoryRef>, ConnectorError>,
) => {
  const spec: RepoResourceSpec<IssueObject, IssueLinks> = {
    ...issueSpec,
    rows: (issues, repository, version) =>
      Effect.forEach(issues, (issue) => {
        // Issues count their links, so skip the reads when there are none.
        const read = (path: string, count: number | undefined) =>
          count === 0
            ? Effect.succeed([])
            : readPages(
                client,
                Schema.Array(IssueRefSchema),
                withParams(repoPath(repository, `issues/${issue.number}/${path}`), {
                  per_page: pageSize,
                }),
              );
        const dependencies = issue.issue_dependencies_summary;
        return Effect.all({
          sub_issues: read("sub_issues", issue.sub_issues_summary?.total),
          blocked_by: read("dependencies/blocked_by", dependencies?.total_blocked_by),
          blocking: read("dependencies/blocking", dependencies?.total_blocking),
        }).pipe(
          Effect.map((links) => ({
            ...links,
            id: issue.id,
            version,
            repository_id: BigInt(repository.id),
          })),
        );
      }),
  };
  return Resource.entity({
    name: "issue_links",
    rowSchema: IssueLinksSchema,
    version: "version",

    check: checkRepoResource(client, spec),
    backfill: backfillRepoResource(client, repositories, spec),
    changes: changesRepoResource(client, spec),
  });
};

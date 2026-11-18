import { type ConnectorError, Resource } from "@useairfoil/connector-kit";
import { Effect, Schema } from "effect";

import type { GitHubClientService } from "../client/client";
import type { IssueObject } from "../schemas/issues";
import type { RepositoryRef } from "../schemas/repositories";

import {
  type IssueTimeline,
  IssueTimelineObjectSchema,
  IssueTimelineSchema,
} from "../schemas/issue-timeline";
import { issueSpec } from "./issues";
import {
  type RepoResourceSpec,
  backfillRepoResource,
  changesRepoResource,
  checkRepoResource,
  childRows,
} from "./shared";

export const makeIssueTimeline = (
  client: GitHubClientService,
  repositories: Effect.Effect<ReadonlyArray<RepositoryRef>, ConnectorError>,
) => {
  const spec: RepoResourceSpec<IssueObject, IssueTimeline> = {
    ...issueSpec,
    rows: childRows(client, {
      path: (issue: IssueObject) => `issues/${issue.number}/timeline`,
      pageSchema: Schema.Array(IssueTimelineObjectSchema),
      // Other tables have these, and commits have no event ID.
      params: { exclude: "commented,committed,reviewed,line-commented,commit-commented" },
      toRow: (event, issue, repository_id, readAt) => ({
        ...event,
        // Cross-references have no ID.
        key: `${repository_id}:${issue.number}:${event.id ?? `${event.source?.issue?.id}:${event.created_at?.toISOString()}`}`,
        version: readAt,
        repository_id,
        issue_number: issue.number,
      }),
    }),
  };
  return Resource.entity({
    name: "issue_timeline",
    rowSchema: IssueTimelineSchema,
    version: "version",

    check: checkRepoResource(client, spec),
    backfill: backfillRepoResource(client, repositories, spec),
    changes: changesRepoResource(client, spec),
  });
};

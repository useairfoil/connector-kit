import { ConnectorApp, Demo, RuntimeConfig } from "@useairfoil/connector-kit";
import { Command } from "effect/cli";

import { CheckRunSchema } from "../schemas/check-runs";
import { CommitStatusSchema } from "../schemas/commit-statuses";
import { CommitSchema } from "../schemas/commits";
import { IssueCommentSchema } from "../schemas/issue-comments";
import { IssueSchema } from "../schemas/issues";
import { LabelSchema } from "../schemas/labels";
import { MilestoneSchema } from "../schemas/milestones";
import { PullRequestCommitSchema } from "../schemas/pull-request-commits";
import { PullRequestReviewCommentSchema } from "../schemas/pull-request-review-comments";
import { PullRequestReviewSchema } from "../schemas/pull-request-reviews";
import { PullRequestSchema } from "../schemas/pull-requests";
import { ReleaseSchema } from "../schemas/releases";
import { RepositorySchema } from "../schemas/repositories";
import { WorkflowJobSchema } from "../schemas/workflow-jobs";
import { WorkflowRunSchema } from "../schemas/workflow-runs";
import { changeRows } from "./changes";
import { setupRows } from "./setup";

export const demo = Demo.define({
  name: "producer-github",
  setup: {
    tables: [
      Demo.table({ name: "repositories", rowSchema: RepositorySchema, version: "version" }),
      Demo.table({ name: "milestones", rowSchema: MilestoneSchema, version: "version" }),
      Demo.table({ name: "labels", rowSchema: LabelSchema, version: "version" }),
    ],
    rows: setupRows,
  },
  group: {
    tables: [
      Demo.table({ name: "issues", rowSchema: IssueSchema, version: "version" }),
      Demo.table({ name: "pull_requests", rowSchema: PullRequestSchema, version: "version" }),
      Demo.table({ name: "issue_comments", rowSchema: IssueCommentSchema, version: "version" }),
      Demo.table({
        name: "pull_request_reviews",
        rowSchema: PullRequestReviewSchema,
        version: "version",
      }),
      Demo.table({
        name: "pull_request_review_comments",
        rowSchema: PullRequestReviewCommentSchema,
        version: "version",
      }),
      Demo.table({
        name: "pull_request_commits",
        rowSchema: PullRequestCommitSchema,
        version: "version",
      }),
      Demo.table({ name: "commits", rowSchema: CommitSchema, version: "version" }),
      Demo.table({ name: "check_runs", rowSchema: CheckRunSchema, version: "version" }),
      Demo.table({ name: "commit_statuses", rowSchema: CommitStatusSchema, version: "version" }),
      Demo.table({ name: "workflow_runs", rowSchema: WorkflowRunSchema, version: "version" }),
      Demo.table({ name: "workflow_jobs", rowSchema: WorkflowJobSchema, version: "version" }),
      Demo.table({ name: "releases", rowSchema: ReleaseSchema, version: "version" }),
    ],
    rows: changeRows,
  },
});

export const demoCommand = ConnectorApp.makeDemoCommand(demo).pipe(
  Command.provide(RuntimeConfig.layerHosted()),
);

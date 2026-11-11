import type { Schema } from "effect";

import { CheckRunSchema } from "./schemas/check-runs";
import { CommitStatusSchema } from "./schemas/commit-statuses";
import { CommitSchema } from "./schemas/commits";
import { IssueCommentSchema } from "./schemas/issue-comments";
import { IssueSchema } from "./schemas/issues";
import { LabelSchema } from "./schemas/labels";
import { MilestoneSchema } from "./schemas/milestones";
import { PullRequestCommitSchema } from "./schemas/pull-request-commits";
import { PullRequestReviewCommentSchema } from "./schemas/pull-request-review-comments";
import { PullRequestReviewSchema } from "./schemas/pull-request-reviews";
import { PullRequestSchema } from "./schemas/pull-requests";
import { ReleaseSchema } from "./schemas/releases";
import { RepositorySchema } from "./schemas/repositories";
import { WorkflowJobSchema } from "./schemas/workflow-jobs";
import { WorkflowRunSchema } from "./schemas/workflow-runs";

export const tableSchemas: Readonly<Record<string, Schema.Top>> = {
  repositories: RepositorySchema,
  issues: IssueSchema,
  pull_requests: PullRequestSchema,
  issue_comments: IssueCommentSchema,
  pull_request_reviews: PullRequestReviewSchema,
  pull_request_review_comments: PullRequestReviewCommentSchema,
  pull_request_commits: PullRequestCommitSchema,
  commits: CommitSchema,
  check_runs: CheckRunSchema,
  commit_statuses: CommitStatusSchema,
  workflow_runs: WorkflowRunSchema,
  workflow_jobs: WorkflowJobSchema,
  releases: ReleaseSchema,
  labels: LabelSchema,
  milestones: MilestoneSchema,
};

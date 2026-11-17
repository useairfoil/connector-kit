import type { Schema } from "effect";

import { CheckRunSchema } from "./schemas/check-runs";
import { CommitStatusSchema } from "./schemas/commit-statuses";
import { CommitSchema } from "./schemas/commits";
import { DeploymentSchema, DeploymentStatusSchema } from "./schemas/deployments";
import { IssueCommentSchema } from "./schemas/issue-comments";
import { IssueLinksSchema } from "./schemas/issue-links";
import { IssueTimelineSchema } from "./schemas/issue-timeline";
import { IssueSchema } from "./schemas/issues";
import { LabelSchema } from "./schemas/labels";
import { MilestoneSchema } from "./schemas/milestones";
import { ProjectFieldSchema, ProjectItemSchema, ProjectSchema } from "./schemas/projects";
import { PullRequestCommitSchema } from "./schemas/pull-request-commits";
import { PullRequestFileSchema } from "./schemas/pull-request-files";
import { PullRequestReviewCommentSchema } from "./schemas/pull-request-review-comments";
import { PullRequestReviewSchema } from "./schemas/pull-request-reviews";
import { PullRequestSchema } from "./schemas/pull-requests";
import { BranchSchema, TagSchema } from "./schemas/refs";
import { ReleaseSchema } from "./schemas/releases";
import { RepositorySchema } from "./schemas/repositories";
import { WorkflowArtifactSchema } from "./schemas/workflow-artifacts";
import { WorkflowAttemptSchema } from "./schemas/workflow-attempts";
import { WorkflowJobSchema } from "./schemas/workflow-jobs";
import { WorkflowRunSchema } from "./schemas/workflow-runs";
import { WorkflowSchema } from "./schemas/workflows";

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
  pull_request_files: PullRequestFileSchema,
  issue_timeline: IssueTimelineSchema,
  deployments: DeploymentSchema,
  deployment_statuses: DeploymentStatusSchema,
  branches: BranchSchema,
  tags: TagSchema,
  workflow_definitions: WorkflowSchema,
  workflow_artifacts: WorkflowArtifactSchema,
  workflow_attempts: WorkflowAttemptSchema,
  issue_links: IssueLinksSchema,
  organization_projects: ProjectSchema,
  project_fields: ProjectFieldSchema,
  project_items: ProjectItemSchema,
};

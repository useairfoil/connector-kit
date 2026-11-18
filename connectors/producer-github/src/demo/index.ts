import { ConnectorApp, Demo, RuntimeConfig } from "@useairfoil/connector-kit";
import { Command } from "effect/cli";

import { CheckRunSchema } from "../schemas/check-runs";
import { CommitStatusSchema } from "../schemas/commit-statuses";
import { CommitSchema } from "../schemas/commits";
import { DeploymentSchema, DeploymentStatusSchema } from "../schemas/deployments";
import { IssueCommentSchema } from "../schemas/issue-comments";
import { IssueLinksSchema } from "../schemas/issue-links";
import { IssueTimelineSchema } from "../schemas/issue-timeline";
import { IssueSchema } from "../schemas/issues";
import { LabelSchema } from "../schemas/labels";
import { MilestoneSchema } from "../schemas/milestones";
import { ProjectSchema, ProjectFieldSchema, ProjectItemSchema } from "../schemas/projects";
import { PullRequestCommitSchema } from "../schemas/pull-request-commits";
import { PullRequestFileSchema } from "../schemas/pull-request-files";
import { PullRequestReviewCommentSchema } from "../schemas/pull-request-review-comments";
import { PullRequestReviewSchema } from "../schemas/pull-request-reviews";
import { PullRequestSchema } from "../schemas/pull-requests";
import { BranchSchema, TagSchema } from "../schemas/refs";
import { ReleaseSchema } from "../schemas/releases";
import { RepositorySchema } from "../schemas/repositories";
import { WorkflowArtifactSchema } from "../schemas/workflow-artifacts";
import { WorkflowAttemptSchema } from "../schemas/workflow-attempts";
import { WorkflowJobSchema } from "../schemas/workflow-jobs";
import { WorkflowRunSchema } from "../schemas/workflow-runs";
import { WorkflowSchema } from "../schemas/workflows";
import { changeRows } from "./changes";
import { setupRows } from "./setup";

export const demo = Demo.define({
  name: "producer-github",
  setup: {
    tables: [
      Demo.table({ name: "branches", rowSchema: BranchSchema, version: "version" }),
      Demo.table({ name: "tags", rowSchema: TagSchema, version: "version" }),
      Demo.table({ name: "workflow_definitions", rowSchema: WorkflowSchema, version: "version" }),
      Demo.table({
        name: "organization_projects",
        rowSchema: ProjectSchema,
        version: "version",
      }),
      Demo.table({ name: "project_fields", rowSchema: ProjectFieldSchema, version: "version" }),
      Demo.table({ name: "repositories", rowSchema: RepositorySchema, version: "version" }),
      Demo.table({ name: "milestones", rowSchema: MilestoneSchema, version: "version" }),
      Demo.table({ name: "labels", rowSchema: LabelSchema, version: "version" }),
    ],
    rows: (context) => {
      const rows = setupRows(context);
      const version = context.now;
      return {
        ...rows,
        organization_projects: [
          {
            id: 123_000n,
            number: 1n,
            title: "Engineering backlog",
            organization: "acme-labs",
            description: "Work across teams.",
            public: false,
            closed_at: null,
            deleted_at: null,
            created_at: version,
            updated_at: version,
            version,
          },
        ],
        project_fields: [
          {
            id: 123_001n,
            project_id: 123_000n,
            name: "Status",
            data_type: "single_select",
            options: '[{"id":"todo","name":"Todo"}]',
            created_at: version,
            updated_at: version,
            version,
          },
        ],
        branches: rows.repositories.map(({ id }) => ({
          id: JSON.stringify([String(id), "main"]),
          repository_id: id,
          name: "main",
          commit: { sha: "8edba364731ea0d819cd80e445696e62d06ed5dc" },
          protected: true,
          version,
        })),
        tags: rows.repositories.map(({ id }) => ({
          id: JSON.stringify([String(id), "v1.0.0"]),
          repository_id: id,
          name: "v1.0.0",
          commit: { sha: "8edba364731ea0d819cd80e445696e62d06ed5dc" },
          version,
        })),
        workflow_definitions: rows.repositories.map(({ id }, index) => ({
          id: 60_000_000n + BigInt(index),
          name: "CI",
          path: ".github/workflows/ci.yml",
          state: "active",
          created_at: version,
          updated_at: version,
          repository_id: id,
          version,
        })),
      };
    },
  },
  group: {
    tables: [
      Demo.table({
        name: "workflow_artifacts",
        rowSchema: WorkflowArtifactSchema,
        version: "version",
      }),
      Demo.table({
        name: "workflow_attempts",
        rowSchema: WorkflowAttemptSchema,
        version: "version",
      }),
      Demo.table({ name: "issue_links", rowSchema: IssueLinksSchema, version: "version" }),
      Demo.table({ name: "project_items", rowSchema: ProjectItemSchema, version: "version" }),
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
      Demo.table({
        name: "pull_request_files",
        rowSchema: PullRequestFileSchema,
        version: "version",
      }),
      Demo.table({ name: "issue_timeline", rowSchema: IssueTimelineSchema, version: "version" }),
      Demo.table({ name: "deployments", rowSchema: DeploymentSchema, version: "version" }),
      Demo.table({
        name: "deployment_statuses",
        rowSchema: DeploymentStatusSchema,
        version: "version",
      }),
    ],
    rows: (index, context) => {
      const rows = changeRows(index, context);
      const version = context.now;
      return {
        ...rows,
        workflow_artifacts: rows.workflow_runs.map((run) => ({
          id: run.id + 1_000_000n,
          name: "test-results",
          size_in_bytes: 5_120n,
          expired: false,
          created_at: run.created_at,
          updated_at: run.version,
          expires_at: null,
          workflow_run: { id: run.id },
          repository_id: run.repository_id,
          version,
        })),
        workflow_attempts: rows.workflow_runs.map((run) => ({
          id: `${run.id}:${run.run_attempt ?? 1n}`,
          run_id: run.id,
          workflow_id: run.workflow_id,
          repository_id: run.repository_id,
          run_attempt: run.run_attempt ?? 1n,
          status: run.status,
          conclusion: run.conclusion,
          head_sha: run.head_sha,
          version,
        })),
        project_items: rows.issues.map((issue) => ({
          id: 40_000_000_000n + issue.id,
          project_id: 123_000n,
          content_type: "Issue",
          content: { id: issue.id, number: issue.number, title: issue.title },
          archived_at: null,
          created_at: issue.created_at,
          updated_at: issue.version,
          version,
        })),
        issue_links: rows.issues.map((issue) => ({
          id: issue.id,
          repository_id: issue.repository_id,
          sub_issues: [],
          blocked_by: [],
          blocking: [],
          version,
        })),
      };
    },
  },
});

export const demoCommand = ConnectorApp.makeDemoCommand(demo).pipe(
  Command.provide(RuntimeConfig.layerHosted()),
);

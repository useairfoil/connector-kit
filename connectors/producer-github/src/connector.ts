import { Connector, type ResourceDefinition } from "@useairfoil/connector-kit";
import { Config, Context, Effect, Layer, Redacted } from "effect";

import type { GitHubConfig, GitHubWebhookConfig } from "./manifest";

import * as GitHubClient from "./client/client";
import { makeCheckRuns } from "./resources/check-runs";
import { makeCommitStatuses } from "./resources/commit-statuses";
import { makeCommits } from "./resources/commits";
import { makeIssueComments } from "./resources/issue-comments";
import { makeIssues } from "./resources/issues";
import { makeLabels } from "./resources/labels";
import { makeMilestones } from "./resources/milestones";
import { makePullRequestCommits } from "./resources/pull-request-commits";
import { makePullRequestReviewComments } from "./resources/pull-request-review-comments";
import { makePullRequestReviews } from "./resources/pull-request-reviews";
import { makePullRequests } from "./resources/pull-requests";
import { makeReleases } from "./resources/releases";
import { makeRepositories } from "./resources/repositories";
import { cachedRepositoryRefs } from "./resources/shared";
import { makeWorkflowJobs } from "./resources/workflow-jobs";
import { makeWorkflowRuns } from "./resources/workflow-runs";
import { webhookEvents } from "./webhook/events";
import { makeWebhookRoute } from "./webhook/route";
export { GitHubConfigDef, manifest } from "./manifest";
export type { GitHubConfig, GitHubWebhookConfig } from "./manifest";

const build = Effect.gen(function* () {
  const client = yield* GitHubClient.GitHubClient;
  // The backfills of the per-repository resources share this list.
  const repositories = yield* cachedRepositoryRefs(client);

  const Repositories = makeRepositories(client);
  const Issues = makeIssues(client, repositories);
  const PullRequests = makePullRequests(client, repositories);
  const IssueComments = makeIssueComments(client, repositories);
  const PullRequestReviews = makePullRequestReviews(client, repositories);
  const PullRequestReviewComments = makePullRequestReviewComments(client, repositories);
  const PullRequestCommits = makePullRequestCommits(client, repositories);
  const Commits = makeCommits(client, repositories);
  const CheckRuns = makeCheckRuns(client, repositories);
  const CommitStatuses = makeCommitStatuses(client, repositories);
  const WorkflowRuns = makeWorkflowRuns(client, repositories);
  const WorkflowJobs = makeWorkflowJobs(client, repositories);
  const Releases = makeReleases(client, repositories);

  const Labels = makeLabels(client, repositories);
  const Milestones = makeMilestones(client, repositories);

  const connector = Connector.define({
    name: "producer-github",
    title: "GitHub",
    resources: [
      Repositories,
      Issues,
      PullRequests,
      IssueComments,
      PullRequestReviews,
      PullRequestReviewComments,
      PullRequestCommits,
      Commits,
      CheckRuns,
      CommitStatuses,
      WorkflowRuns,
      WorkflowJobs,
      Releases,
      Labels,
      Milestones,
    ],
  });

  return {
    connector,
    webhooks: (config: GitHubWebhookConfig) =>
      Effect.succeed([
        makeWebhookRoute({
          secret: Redacted.value(config.webhookSecret),
          installationId: config.installationId,
          targets: new Map<string, ReadonlyArray<ResourceDefinition>>([
            [webhookEvents.repository, [Repositories]],
            [webhookEvents.issues, [Issues]],
            [webhookEvents.pull_request, [PullRequests, PullRequestCommits]],
            [webhookEvents.issue_comment, [IssueComments]],
            [webhookEvents.pull_request_review, [PullRequestReviews]],
            [webhookEvents.pull_request_review_comment, [PullRequestReviewComments]],
            [webhookEvents.push, [Commits]],
            [webhookEvents.check_run, [CheckRuns]],
            [webhookEvents.status, [CommitStatuses]],
            [webhookEvents.workflow_run, [WorkflowRuns]],
            [webhookEvents.workflow_job, [WorkflowJobs]],
            [webhookEvents.release, [Releases]],
            [webhookEvents.milestone, [Milestones]],
            [webhookEvents.label, [Labels]],
          ]),
        }),
      ]),
  };
});

export const resources = build.pipe(Effect.map(({ connector }) => connector.resources));

export const webhooks = (config: GitHubWebhookConfig) =>
  build.pipe(Effect.flatMap((built) => built.webhooks(config)));

export const make = Effect.fnUntraced(function* (config: GitHubConfig) {
  const built = yield* build;
  const webhooks = yield* built.webhooks(config);

  return Connector.define({ ...built.connector, webhooks });
});

export type GitHubConnectorRuntime = Effect.Success<ReturnType<typeof make>>;

export class GitHubConnector extends Context.Service<GitHubConnector, GitHubConnectorRuntime>()(
  "@useairfoil/producer-github/GitHubConnector",
) {}

export const layer = (config: GitHubConfig) =>
  Layer.effect(GitHubConnector)(
    make(config).pipe(Effect.annotateLogs({ component: "github" })),
  ).pipe(Layer.provide(GitHubClient.layer(config)));

export const layerConfig = (config: Config.Wrap<GitHubConfig>) =>
  Layer.unwrap(Config.unwrap(config).pipe(Effect.map(layer)));

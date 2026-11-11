import type { Demo } from "@useairfoil/connector-kit";

import { Duration } from "effect";

import type { CheckRun } from "../schemas/check-runs";
import type { CommitStatus } from "../schemas/commit-statuses";
import type { Commit } from "../schemas/commits";
import type { IssueComment } from "../schemas/issue-comments";
import type { Issue } from "../schemas/issues";
import type { PullRequestCommit } from "../schemas/pull-request-commits";
import type { PullRequestReviewComment } from "../schemas/pull-request-review-comments";
import type { PullRequestReview } from "../schemas/pull-request-reviews";
import type { PullRequest } from "../schemas/pull-requests";
import type { Release } from "../schemas/releases";
import type { WorkflowJob } from "../schemas/workflow-jobs";
import type { WorkflowRun } from "../schemas/workflow-runs";

export const day = Duration.toMillis(Duration.days(1));
export const minute = Duration.toMillis(Duration.minutes(1));
export const org = "acme-labs";

export type Account = { readonly id: bigint; readonly login: string; readonly type: string };

export const owner: Account = { id: 91_000_000n, login: org, type: "Organization" };

export const people: ReadonlyArray<Account> = [
  "mara-ellis",
  "dkowalski",
  "jin-park",
  "sofia-rojas",
  "tbrennan",
  "amir-haddad",
  "lucy-chen",
  "oscar-mendez",
  "priya-nair",
  "felix-weber",
  "nadia-kova",
  "ben-ortiz",
].map((login, k) => ({ id: BigInt(50_000_000 + k), login, type: "User" }));

export const actionsBot: Account = { id: 41_898_282n, login: "github-actions[bot]", type: "Bot" };

export const repositories = [
  { name: "api", language: "Go", topics: ["api", "backend"], description: "Public REST API" },
  { name: "web", language: "TypeScript", topics: ["frontend", "react"], description: "Web app" },
  { name: "mobile", language: "Kotlin", topics: ["android"], description: "Android app" },
  { name: "infra", language: "HCL", topics: ["terraform"], description: "Cloud infrastructure" },
  { name: "docs", language: "MDX", topics: ["documentation"], description: "Product docs" },
  { name: "sdk-js", language: "TypeScript", topics: ["sdk"], description: "JavaScript SDK" },
] as const;

type RepositoryItem = (typeof repositories)[number];

export const repositoryId = (r: number) => BigInt(700_000_000 + r);

const labels = [
  { id: 6_100_000_001n, name: "bug" },
  { id: 6_100_000_002n, name: "enhancement" },
  { id: 6_100_000_003n, name: "documentation" },
  { id: 6_100_000_004n, name: "good first issue" },
];

export const labelsForRepository = (r: number) =>
  labels.map((label) => ({ ...label, id: label.id + BigInt(r) * 10n }));

export const milestoneForRepository = (r: number) => ({
  id: 6_200_000_001n + BigInt(r),
  number: 1n,
  title: "First release",
});

export const verbs = ["Fix", "Add", "Improve", "Update", "Remove", "Refactor", "Support"] as const;

export const paths = [
  "src/server.ts",
  "src/client.ts",
  "src/routes/users.ts",
  "src/lib/cache.ts",
  "README.md",
];

// GitHub node IDs are base64 data. A hex form is close enough for demo rows.
export const nodeId = (prefix: string, id: bigint) =>
  `${prefix}_kwDO${id.toString(16).toUpperCase()}`;
export const urlOf = (repo: RepositoryItem) => `https://github.com/${org}/${repo.name}`;

/** Date helpers for one run. `at` keeps a time from going past now. */
export const clock = ({ faker, now }: Demo.DemoContext) => {
  const at = (time: number) => new Date(Math.min(time, now.getTime()));

  const later = (from: Date, min: number, max: number) =>
    at(from.getTime() + faker.number.int({ min, max }));

  return { at, later };
};

export type Rows = {
  readonly issues: Array<Issue>;
  readonly pull_requests: Array<PullRequest>;
  readonly issue_comments: Array<IssueComment>;
  readonly pull_request_reviews: Array<PullRequestReview>;
  readonly pull_request_review_comments: Array<PullRequestReviewComment>;
  readonly pull_request_commits: Array<PullRequestCommit>;
  readonly commits: Array<Commit>;
  readonly check_runs: Array<CheckRun>;
  readonly commit_statuses: Array<CommitStatus>;
  readonly workflow_runs: Array<WorkflowRun>;
  readonly workflow_jobs: Array<WorkflowJob>;
  readonly releases: Array<Release>;
};

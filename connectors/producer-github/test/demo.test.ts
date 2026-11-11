import { describe, expect, it } from "@effect/vitest";
import { Demo, Ingestor } from "@useairfoil/connector-kit";
import { Effect, Layer, Ref, Schema } from "effect";

import { demo } from "../src/demo";
import { CheckRunSchema } from "../src/schemas/check-runs";
import { CommitStatusSchema } from "../src/schemas/commit-statuses";
import { CommitSchema } from "../src/schemas/commits";
import { IssueCommentSchema } from "../src/schemas/issue-comments";
import { IssueSchema } from "../src/schemas/issues";
import { PullRequestCommitSchema } from "../src/schemas/pull-request-commits";
import { PullRequestReviewCommentSchema } from "../src/schemas/pull-request-review-comments";
import { PullRequestReviewSchema } from "../src/schemas/pull-request-reviews";
import { PullRequestSchema } from "../src/schemas/pull-requests";
import { ReleaseSchema } from "../src/schemas/releases";
import { RepositorySchema } from "../src/schemas/repositories";
import { WorkflowJobSchema } from "../src/schemas/workflow-jobs";
import { WorkflowRunSchema } from "../src/schemas/workflow-runs";

const now = new Date("2026-10-01T00:00:00.000Z");

// Only group rows count toward the size, so 1 byte writes the setup tables and one chunk.
const groupTables = new Set<string>(demo.group.tables.map((table) => table.name));

const generate = Effect.gen(function* () {
  const written = yield* Ref.make<ReadonlyArray<Ingestor.IngestOptions>>([]);

  const layer = Layer.succeed(Ingestor.Ingestor)({
    ingest: (options) =>
      Ref.update(written, (all) => [...all, options]).pipe(
        Effect.as({
          rows: options.batch.rows.length,
          bytes: groupTables.has(options.resource) ? options.batch.rows.length : 0,
        }),
      ),
  });

  yield* Demo.run(demo, { bytes: 1, seed: 42, now, groupsPerChunk: 60 }).pipe(
    Effect.provide(layer),
  );

  return yield* Ref.get(written);
});

const rowsOf = <S extends Schema.Top>(
  written: ReadonlyArray<Ingestor.IngestOptions>,
  resource: string,
  schema: S,
) =>
  Schema.decodeUnknownSync(Schema.Array(Schema.toType(schema)))(
    written.filter((item) => item.resource === resource).flatMap((item) => item.batch.rows),
  );

const unique = (keys: ReadonlyArray<unknown>) => new Set(keys).size === keys.length;

describe("GitHub demo", () => {
  it.effect("writes every table with unique keys and links that resolve", () =>
    Effect.gen(function* () {
      const written = yield* generate;
      const repositories = rowsOf(written, "repositories", RepositorySchema);
      const issues = rowsOf(written, "issues", IssueSchema);
      const pullRequests = rowsOf(written, "pull_requests", PullRequestSchema);
      const comments = rowsOf(written, "issue_comments", IssueCommentSchema);
      const reviews = rowsOf(written, "pull_request_reviews", PullRequestReviewSchema);

      const reviewComments = rowsOf(
        written,
        "pull_request_review_comments",
        PullRequestReviewCommentSchema,
      );

      const prCommits = rowsOf(written, "pull_request_commits", PullRequestCommitSchema);
      const commits = rowsOf(written, "commits", CommitSchema);
      const checkRuns = rowsOf(written, "check_runs", CheckRunSchema);
      const statuses = rowsOf(written, "commit_statuses", CommitStatusSchema);
      const runs = rowsOf(written, "workflow_runs", WorkflowRunSchema);
      const jobs = rowsOf(written, "workflow_jobs", WorkflowJobSchema);
      const releases = rowsOf(written, "releases", ReleaseSchema);

      const repositoryIds = new Set(repositories.map((row) => row.id));

      const numbers = new Set(
        [...issues, ...pullRequests].map((row) => `${row.repository_id}#${row.number}`),
      );

      const prByNumber = new Map(
        pullRequests.map((row) => [`${row.repository_id}#${row.number}`, row]),
      );

      const headShas = new Set(pullRequests.map((row) => row.head.sha));

      for (const rows of [issues, pullRequests, comments, reviews, reviewComments, checkRuns]) {
        expect(rows.length).toBeGreaterThan(0);
        expect(unique(rows.map((row) => row.id))).toBe(true);
      }

      for (const rows of [statuses, runs, jobs, releases]) {
        expect(rows.length).toBeGreaterThan(0);
        expect(unique(rows.map((row) => row.id))).toBe(true);
      }

      expect(unique(prCommits.map((row) => row.key))).toBe(true);
      expect(unique(commits.map((row) => row.key))).toBe(true);

      // Issues and pull requests share numbers per repository, so none repeat.
      expect(numbers.size).toBe(issues.length + pullRequests.length);

      for (const row of [...issues, ...pullRequests, ...commits, ...runs, ...releases]) {
        expect(repositoryIds.has(row.repository_id)).toBe(true);
      }

      for (const comment of comments) {
        expect(numbers.has(`${comment.repository_id}#${comment.issue_number}`)).toBe(true);
      }

      for (const review of reviews) {
        expect(
          prByNumber.get(`${review.repository_id}#${review.pull_request_number}`)?.head.sha,
        ).toBe(review.commit_id);
      }

      const reviewIds = new Set(reviews.map((row) => row.id));

      for (const comment of reviewComments) {
        expect(reviewIds.has(comment.pull_request_review_id ?? 0n)).toBe(true);
      }

      for (const commit of prCommits) {
        expect(prByNumber.has(`${commit.repository_id}#${commit.pull_request_number}`)).toBe(true);
      }

      for (const run of checkRuns) expect(headShas.has(run.head_sha)).toBe(true);
      const runIds = new Set(runs.map((row) => row.id));
      for (const job of jobs) expect(runIds.has(job.run_id)).toBe(true);
      const commitShas = new Set(commits.map((row) => row.sha));
      for (const status of statuses) expect(commitShas.has(status.sha)).toBe(true);

      for (const pullRequest of pullRequests) {
        expect(pullRequest.merged_at === null || pullRequest.state === "closed").toBe(true);
      }

      expect(pullRequests[0]).toMatchInlineSnapshot(`
        {
          "assignees": [
            {
              "id": 50000004n,
              "login": "tbrennan",
              "type": "User",
            },
          ],
          "author_association": "MEMBER",
          "base": {
            "label": "acme-labs:main",
            "ref": "main",
            "sha": "b96d368ab4bd1d31efb62f92a0e5e6bc4fbedde1",
          },
          "body": "Fixes #1.

        If we program the application, we can get to the COM program through the solid state CSS interface!",
          "closed_at": 2026-08-27T20:24:13.320Z,
          "created_at": 2026-08-27T12:37:06.761Z,
          "draft": false,
          "head": {
            "label": "acme-labs:tbrennan/online-bandwidth",
            "ref": "tbrennan/online-bandwidth",
            "sha": "785c76b3b1fa40bfaa172cd7167aeda2facaab90",
          },
          "html_url": "https://github.com/acme-labs/api/pull/2",
          "id": 1500000000n,
          "labels": [
            {
              "id": 6100000001n,
              "name": "bug",
            },
          ],
          "locked": false,
          "merged_at": 2026-08-27T20:24:13.320Z,
          "milestone": {
            "id": 6200000001n,
            "number": 1n,
            "title": "First release",
          },
          "node_id": "PR_kwDO59682F00",
          "number": 2n,
          "repository_id": 700000000n,
          "requested_reviewers": [],
          "state": "closed",
          "title": "Refactor online bandwidth handling",
          "user": {
            "id": 50000004n,
            "login": "tbrennan",
            "type": "User",
          },
          "version": 2026-08-28T03:43:08.613Z,
        }
      `);
    }),
  );
});

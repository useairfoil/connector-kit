import { NodeHttpServer } from "@effect/platform-node";
import { describe, expect, it } from "@effect/vitest";
import { Ingestion, StateStore } from "@useairfoil/connector-kit";
import { DateTime, Deferred, Effect, Layer, Option, Ref } from "effect";
import { HttpClient, HttpClientRequest } from "effect/http";
import { TestClock } from "effect/testing";

import { GitHubConnector, webhookPath } from "../src/index";
import {
  checkRun,
  commit,
  commitStatus,
  event,
  issue,
  issueComment,
  otherRepository,
  pullRequest,
  pullRequestReview,
  pullRequestReviewComment,
  release,
  repository,
  workflowJob,
  workflowRun,
} from "./fixtures/objects";
import { connectorLayer, makeFakeClient, makeTestIngestor, signPayload, without } from "./helpers";

const now = Date.parse("2026-10-06T12:00:00.000Z");

/** Posts a delivery to the webhook route and waits for `expected` ingests. */
const post = (
  eventName: string,
  body: unknown,
  options: {
    readonly signature?: string | null;
    readonly expected?: number;
    /** API pages for handlers that read GitHub again. */
    readonly pages?: Readonly<Record<string, unknown>>;
  } = {},
) =>
  Effect.gen(function* () {
    yield* TestClock.setTime(now);
    // An installation without repositories, so backfill and changes stay quiet.
    const { client } = yield* makeFakeClient((url) =>
      url.startsWith("/installation/repositories")
        ? { body: { total_count: 0, repositories: [] } }
        : options.pages?.[url] === undefined
          ? undefined
          : { body: options.pages[url] },
    );
    const connector = yield* GitHubConnector.GitHubConnector.pipe(
      Effect.provide(connectorLayer(client)),
    );
    const expected = options.expected ?? 0;
    const { ingestedRef, done, layer } = yield* makeTestIngestor(expected);
    const cutoff = yield* DateTime.now.pipe(Effect.map(DateTime.formatIso));

    return yield* Effect.gen(function* () {
      yield* Effect.forkScoped(
        Ingestion.run(connector, {
          initialCutoff: cutoff,
          webhook: { routes: connector.webhooks ?? [] },
        }),
      );

      const rawBody = JSON.stringify(body);
      const signature = options.signature === undefined ? signPayload(rawBody) : options.signature;
      const http = yield* HttpClient.HttpClient;
      const response = yield* http.execute(
        HttpClientRequest.post(webhookPath).pipe(
          HttpClientRequest.setHeaders({
            "x-github-event": eventName,
            ...(signature === null ? {} : { "x-hub-signature-256": signature }),
          }),
          HttpClientRequest.bodyText(rawBody, "application/json"),
        ),
      );
      if (expected > 0) yield* Deferred.await(done);

      const rows = (yield* Ref.get(ingestedRef))
        .filter((item) => item.source === "webhook")
        .flatMap((item) => item.batch.rows.map((row) => ({ resource: item.resource, row })));
      return {
        status: response.status,
        rows: JSON.parse(
          JSON.stringify(rows, (_key, value) => (typeof value === "bigint" ? `${value}n` : value)),
        ),
      };
    }).pipe(
      Effect.provide(Layer.mergeAll(StateStore.layerMemory, layer, NodeHttpServer.layerTest)),
    );
  }).pipe(Effect.scoped);

/** Only the fields a test is about. */
const summary = (result: Effect.Success<ReturnType<typeof post>>, keys: ReadonlyArray<string>) => ({
  status: result.status,
  rows: result.rows.map(
    ({ resource, row }: { resource: string; row: Record<string, unknown> }) => ({
      resource,
      ...Object.fromEntries(keys.filter((key) => key in row).map((key) => [key, row[key]])),
      keys: Object.keys(row).length,
    }),
  ),
});

describe("webhook", () => {
  it.effect("deletes repository labels and milestones by ID", () =>
    Effect.gen(function* () {
      const label = yield* post("label", event("deleted", { label: { id: 42 }, repository }), {
        expected: 1,
      });
      const milestone = yield* post(
        "milestone",
        event("deleted", { milestone: { id: 43 }, repository }),
        { expected: 1 },
      );
      expect(summary(label, ["id", "_deleted"])).toMatchObject({
        status: 200,
        rows: [{ resource: "labels", id: "42n", _deleted: true }],
      });
      expect(summary(milestone, ["id", "_deleted"])).toMatchObject({
        status: 200,
        rows: [{ resource: "milestones", id: "43n", _deleted: true }],
      });
    }),
  );

  it.effect("rejects bad and missing signatures", () =>
    Effect.gen(function* () {
      const body = event("labeled", { issue });

      expect({
        otherSecret: yield* post("issues", body, {
          signature: signPayload(JSON.stringify(body), "other-secret"),
        }),
        missing: yield* post("issues", body, { signature: null }),
      }).toMatchInlineSnapshot(`
        {
          "missing": {
            "rows": [],
            "status": 401,
          },
          "otherSecret": {
            "rows": [],
            "status": 401,
          },
        }
      `);
    }),
  );

  it.effect("acknowledges pings, other installations, and other events without rows", () =>
    Effect.gen(function* () {
      expect({
        ping: yield* post("ping", { zen: "Keep it logically awesome.", hook_id: 1 }),
        otherInstallation: yield* post("issues", {
          ...event("labeled", { issue }),
          installation: { id: 1 },
        }),
        otherEvent: yield* post("star", event("created", {})),
      }).toMatchInlineSnapshot(`
        {
          "otherEvent": {
            "rows": [],
            "status": 200,
          },
          "otherInstallation": {
            "rows": [],
            "status": 200,
          },
          "ping": {
            "rows": [],
            "status": 200,
          },
        }
      `);
    }),
  );

  it.effect("maps payloads to rows", () =>
    Effect.gen(function* () {
      const keys = ["id", "version", "labels", "assignees", "requested_reviewers", "body"];
      expect({
        issue: summary(yield* post("issues", event("labeled", { issue }), { expected: 1 }), keys),
        pullRequest: summary(
          yield* post("pull_request", event("closed", { pull_request: pullRequest }), {
            expected: 1,
          }),
          keys,
        ),
        comment: summary(
          yield* post("issue_comment", event("edited", { issue, comment: issueComment }), {
            expected: 1,
          }),
          ["id", "issue_number", "repository_id", "body"],
        ),
        reviewComment: summary(
          yield* post(
            "pull_request_review_comment",
            event("created", { pull_request: pullRequest, comment: pullRequestReviewComment }),
            { expected: 1 },
          ),
          ["id", "pull_request_number", "line", "original_line"],
        ),
        repository: summary(
          yield* post("repository", event("renamed", { repository: otherRepository }), {
            expected: 1,
          }),
          ["id", "full_name", "topics"],
        ),
      }).toMatchInlineSnapshot(`
        {
          "comment": {
            "rows": [
              {
                "body": "First live check comment",
                "id": "6003550342n",
                "issue_number": "2n",
                "keys": 10,
                "repository_id": "1406396726n",
                "resource": "issue_comments",
              },
            ],
            "status": 200,
          },
          "issue": {
            "rows": [
              {
                "assignees": [
                  {
                    "id": "583231n",
                    "login": "octocat",
                    "type": "User",
                  },
                ],
                "body": "",
                "id": "5719289302n",
                "keys": 19,
                "labels": [
                  {
                    "id": "12557819502n",
                    "name": "bug",
                  },
                ],
                "resource": "issues",
                "version": "2026-10-05T22:04:14.000Z",
              },
            ],
            "status": 200,
          },
          "pullRequest": {
            "rows": [
              {
                "assignees": [],
                "body": "",
                "id": "4751110848n",
                "keys": 22,
                "labels": [],
                "requested_reviewers": [],
                "resource": "pull_requests",
                "version": "2026-10-05T22:05:25.000Z",
              },
            ],
            "status": 200,
          },
          "repository": {
            "rows": [
              {
                "full_name": "octocat/spoon-knife",
                "id": "1406425446n",
                "keys": 18,
                "resource": "repositories",
                "topics": [],
              },
            ],
            "status": 200,
          },
          "reviewComment": {
            "rows": [
              {
                "id": "4241223611n",
                "keys": 20,
                "line": null,
                "original_line": "2n",
                "pull_request_number": "3n",
                "resource": "pull_request_review_comments",
              },
            ],
            "status": 200,
          },
        }
      `);
    }),
  );

  it.effect("reads the object again when a webhook leaves a list out", () =>
    Effect.gen(function* () {
      const pages = {
        [`/repos/octocat/hello-world/issues/${issue.number}`]: issue,
        [`/repos/octocat/hello-world/pulls/${pullRequest.number}`]: {
          ...pullRequest,
          requested_reviewers: issue.assignees,
        },
        [`/repos/${otherRepository.full_name}`]: { ...otherRepository, topics: ["airfoil"] },
      };
      const keys = ["id", "labels", "requested_reviewers", "topics"];
      const read = (eventName: string, body: unknown) =>
        post(eventName, body, { expected: 1, pages }).pipe(Effect.map((r) => summary(r, keys)));
      expect({
        issue: yield* read("issues", event("edited", { issue: without(issue, "labels") })),
        pullRequest: yield* read(
          "pull_request",
          event("edited", { pull_request: without(pullRequest, "requested_reviewers") }),
        ),
        repository: yield* read(
          "repository",
          event("edited", { repository: without(otherRepository, "topics") }),
        ),
      }).toMatchInlineSnapshot(`
        {
          "issue": {
            "rows": [
              {
                "id": "5719289302n",
                "keys": 19,
                "labels": [
                  {
                    "id": "12557819502n",
                    "name": "bug",
                  },
                ],
                "resource": "issues",
              },
            ],
            "status": 200,
          },
          "pullRequest": {
            "rows": [
              {
                "id": "4751110848n",
                "keys": 22,
                "labels": [],
                "requested_reviewers": [
                  {
                    "id": "583231n",
                    "login": "octocat",
                    "type": "User",
                  },
                ],
                "resource": "pull_requests",
              },
            ],
            "status": 200,
          },
          "repository": {
            "rows": [
              {
                "id": "1406425446n",
                "keys": 18,
                "resource": "repositories",
                "topics": [
                  "airfoil",
                ],
              },
            ],
            "status": 200,
          },
        }
      `);
    }),
  );

  it.effect("writes delete rows for deleted and transferred objects", () =>
    Effect.gen(function* () {
      const deleteKeys = ["id", "version", "_deleted"];
      expect({
        issueDeleted: summary(
          yield* post("issues", event("deleted", { issue }), { expected: 1 }),
          deleteKeys,
        ),
        issueTransferred: summary(
          yield* post("issues", event("transferred", { issue, changes: {} }), { expected: 1 }),
          deleteKeys,
        ),
        commentDeleted: summary(
          yield* post("issue_comment", event("deleted", { issue, comment: issueComment }), {
            expected: 1,
          }),
          deleteKeys,
        ),
        releaseDeleted: summary(
          yield* post("release", event("deleted", { release }), { expected: 1 }),
          deleteKeys,
        ),
        reviewCommentDeleted: summary(
          yield* post(
            "pull_request_review_comment",
            event("deleted", { pull_request: pullRequest, comment: pullRequestReviewComment }),
            { expected: 1 },
          ),
          deleteKeys,
        ),
        repositoryDeleted: summary(
          yield* post("repository", event("deleted", { repository }), { expected: 1 }),
          deleteKeys,
        ),
      }).toMatchInlineSnapshot(`
        {
          "commentDeleted": {
            "rows": [
              {
                "_deleted": true,
                "id": "6003550342n",
                "keys": 3,
                "resource": "issue_comments",
                "version": "2026-10-06T12:00:00.000Z",
              },
            ],
            "status": 200,
          },
          "issueDeleted": {
            "rows": [
              {
                "_deleted": true,
                "id": "5719289302n",
                "keys": 3,
                "resource": "issues",
                "version": "2026-10-06T12:00:00.000Z",
              },
            ],
            "status": 200,
          },
          "issueTransferred": {
            "rows": [
              {
                "_deleted": true,
                "id": "5719289302n",
                "keys": 3,
                "resource": "issues",
                "version": "2026-10-06T12:00:00.000Z",
              },
            ],
            "status": 200,
          },
          "releaseDeleted": {
            "rows": [
              {
                "_deleted": true,
                "id": "399674740n",
                "keys": 3,
                "resource": "releases",
                "version": "2026-10-06T12:00:00.000Z",
              },
            ],
            "status": 200,
          },
          "repositoryDeleted": {
            "rows": [
              {
                "_deleted": true,
                "id": "1406396726n",
                "keys": 3,
                "resource": "repositories",
                "version": "2026-10-06T12:00:00.000Z",
              },
            ],
            "status": 200,
          },
          "reviewCommentDeleted": {
            "rows": [
              {
                "_deleted": true,
                "id": "4241223611n",
                "keys": 3,
                "resource": "pull_request_review_comments",
                "version": "2026-10-06T12:00:00.000Z",
              },
            ],
            "status": 200,
          },
        }
      `);
    }),
  );

  it.effect("reads objects without an update time again, and maps the other new events", () =>
    Effect.gen(function* () {
      const repo = "/repos/octocat/hello-world";
      const pages = {
        [`${repo}/pulls/3/reviews/${pullRequestReview.id}`]: {
          ...pullRequestReview,
          state: "DISMISSED",
        },
        [`${repo}/check-runs/${checkRun.id}`]: checkRun,
        [`${repo}/actions/jobs/${workflowJob.id}`]: workflowJob,
        [`${repo}/pulls/3/commits?per_page=100`]: [commit],
        [`${repo}/compare/351503f0426ffd1478bf966741fd57856a1422e0...${commit.sha}?per_page=100`]: {
          commits: [commit],
        },
        [`${repo}/commits/${commit.sha}/statuses?per_page=100`]: [commitStatus],
      };
      const keys = ["id", "key", "version", "state", "status", "sha"];
      const push = (ref: string) =>
        event("", {
          ref,
          before: "351503f0426ffd1478bf966741fd57856a1422e0",
          after: commit.sha,
          commits: [],
        });
      // The status payload has no node ID or creator.
      const status = event("", { ...without(commitStatus, "node_id"), sha: commit.sha });

      expect({
        review: summary(
          yield* post(
            "pull_request_review",
            event("dismissed", {
              review: { ...pullRequestReview, state: "dismissed" },
              pull_request: pullRequest,
            }),
            { expected: 1, pages },
          ),
          keys,
        ),
        checkRun: summary(
          yield* post("check_run", event("completed", { check_run: checkRun }), {
            expected: 1,
            pages,
          }),
          keys,
        ),
        workflowJob: summary(
          yield* post("workflow_job", event("completed", { workflow_job: workflowJob }), {
            expected: 1,
            pages,
          }),
          keys,
        ),
        pullRequestOpened: summary(
          yield* post("pull_request", event("opened", { pull_request: pullRequest }), {
            expected: 2,
            pages,
          }),
          keys,
        ),
        pullRequestBaseEdited: summary(
          yield* post(
            "pull_request",
            event("edited", {
              pull_request: pullRequest,
              changes: { base: { ref: { from: "develop" } } },
            }),
            { expected: 2, pages },
          ),
          keys,
        ),
        push: summary(yield* post("push", push("refs/heads/main"), { expected: 1, pages }), keys),
        pushToOtherBranch: summary(
          yield* post("push", push("refs/heads/feature"), { pages }),
          keys,
        ),
        status: summary(yield* post("status", status, { expected: 1, pages }), [
          ...keys,
          "creator",
          "node_id",
        ]),
        workflowRun: summary(
          yield* post("workflow_run", event("completed", { workflow_run: workflowRun }), {
            expected: 1,
          }),
          keys,
        ),
        release: summary(yield* post("release", event("published", { release }), { expected: 1 }), [
          ...keys,
          "assets",
        ]),
      }).toMatchInlineSnapshot(`
        {
          "checkRun": {
            "rows": [
              {
                "id": "114466721218n",
                "keys": 16,
                "resource": "check_runs",
                "status": "completed",
                "version": "2026-10-06T12:00:00.000Z",
              },
            ],
            "status": 200,
          },
          "pullRequestBaseEdited": {
            "rows": [
              {
                "id": "4751110848n",
                "keys": 22,
                "resource": "pull_requests",
                "state": "closed",
                "version": "2026-10-05T22:05:25.000Z",
              },
              {
                "key": "1406396726:3:9eb3a7d2ad61c47a7ee47c07e9787a616d0a228f",
                "keys": 11,
                "resource": "pull_request_commits",
                "sha": "9eb3a7d2ad61c47a7ee47c07e9787a616d0a228f",
                "version": "2026-10-05T22:05:25.000Z",
              },
            ],
            "status": 200,
          },
          "pullRequestOpened": {
            "rows": [
              {
                "id": "4751110848n",
                "keys": 22,
                "resource": "pull_requests",
                "state": "closed",
                "version": "2026-10-05T22:05:25.000Z",
              },
              {
                "key": "1406396726:3:9eb3a7d2ad61c47a7ee47c07e9787a616d0a228f",
                "keys": 11,
                "resource": "pull_request_commits",
                "sha": "9eb3a7d2ad61c47a7ee47c07e9787a616d0a228f",
                "version": "2026-10-05T22:05:25.000Z",
              },
            ],
            "status": 200,
          },
          "push": {
            "rows": [
              {
                "key": "1406396726:9eb3a7d2ad61c47a7ee47c07e9787a616d0a228f",
                "keys": 13,
                "resource": "commits",
                "sha": "9eb3a7d2ad61c47a7ee47c07e9787a616d0a228f",
                "version": "2026-10-05T21:43:09.000Z",
              },
            ],
            "status": 200,
          },
          "pushToOtherBranch": {
            "rows": [],
            "status": 200,
          },
          "release": {
            "rows": [
              {
                "assets": [
                  {
                    "browser_download_url": "https://github.com/octocat/hello-world/releases/download/v1.0.0/checksums.txt",
                    "content_type": "text/plain",
                    "created_at": "2026-10-05T21:45:56.000Z",
                    "download_count": "3n",
                    "id": "599854636n",
                    "label": null,
                    "name": "checksums.txt",
                    "size": "1971n",
                    "state": "uploaded",
                    "updated_at": "2026-10-05T21:45:56.000Z",
                  },
                ],
                "id": "399674740n",
                "keys": 15,
                "resource": "releases",
                "version": "2026-10-05T21:46:43.000Z",
              },
            ],
            "status": 200,
          },
          "review": {
            "rows": [
              {
                "id": "5476624499n",
                "keys": 12,
                "resource": "pull_request_reviews",
                "state": "DISMISSED",
                "version": "2026-10-06T12:00:00.000Z",
              },
            ],
            "status": 200,
          },
          "status": {
            "rows": [
              {
                "creator": {
                  "id": "583231n",
                  "login": "octocat",
                  "type": "User",
                },
                "id": "56085618126n",
                "keys": 11,
                "node_id": "SC_kwDOAToIks8AAAANDvadzg",
                "resource": "commit_statuses",
                "sha": "9eb3a7d2ad61c47a7ee47c07e9787a616d0a228f",
                "state": "pending",
                "version": "2026-10-05T21:43:51.000Z",
              },
            ],
            "status": 200,
          },
          "workflowJob": {
            "rows": [
              {
                "id": "114466721218n",
                "keys": 19,
                "resource": "workflow_jobs",
                "status": "completed",
                "version": "2026-10-06T12:00:00.000Z",
              },
            ],
            "status": 200,
          },
          "workflowRun": {
            "rows": [
              {
                "id": "38138322363n",
                "keys": 22,
                "resource": "workflow_runs",
                "status": "completed",
                "version": "2026-10-05T21:43:40.000Z",
              },
            ],
            "status": 200,
          },
        }
      `);
    }),
  );

  it.effect("fails when the status is not in the list", () =>
    Effect.gen(function* () {
      const { client } = yield* makeFakeClient((url) =>
        url.includes("/statuses") ? { body: [] } : undefined,
      );
      const connector = yield* GitHubConnector.GitHubConnector.pipe(
        Effect.provide(connectorLayer(client)),
      );
      const webhook = yield* Effect.fromOption(
        Option.fromNullishOr(
          connector.resources.find((item) => item.name === "commit_statuses")?.webhook,
        ),
      );
      const error = yield* webhook
        .handler({ payload: event("", { id: commitStatus.id, sha: commit.sha }) })
        .pipe(Effect.flip);

      expect(error.message).toBe(`Commit status ${commitStatus.id} is not in the list`);
    }),
  );
});

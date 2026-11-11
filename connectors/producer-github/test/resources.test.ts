import { describe, expect, it } from "@effect/vitest";
import { ConnectorApp } from "@useairfoil/connector-kit";
import { Effect, Option, Ref } from "effect";
import { TestClock } from "effect/testing";

import { demo } from "../src/demo";
import { GitHubConnector, manifest } from "../src/index";
import { tableSchemas } from "../src/tables";
import {
  commit,
  issue,
  issueComment,
  otherRepository,
  pullRequest,
  pullRequestIssue,
  pullRequestReview,
  release,
  repository,
  workflowRun,
} from "./fixtures/objects";
import { type FakeGitHub, connectorLayer, makeFakeClient, without } from "./helpers";

const now = Date.parse("2026-10-06T12:00:00.000Z");
const cutoff = "2026-10-06T00:00:00.000Z";

type ResourceName = (typeof manifest.resources)[number]["name"];

const repositoriesUrl = "/installation/repositories?per_page=100";

/** Answers the installation's repository list, then `pages`. */
const withRepositories =
  (repositories: ReadonlyArray<unknown>, pages: Readonly<Record<string, unknown>>): FakeGitHub =>
  (url) =>
    url === repositoriesUrl
      ? { body: { total_count: repositories.length, repositories } }
      : pages[url] === undefined
        ? undefined
        : { body: pages[url] };

const getResource = (name: ResourceName, fake: FakeGitHub) =>
  Effect.gen(function* () {
    yield* TestClock.setTime(now);
    const { client, requests } = yield* makeFakeClient(fake);
    const connector = yield* GitHubConnector.GitHubConnector.pipe(
      Effect.provide(connectorLayer(client)),
    );
    const resource = yield* Effect.fromOption(
      Option.fromNullishOr(connector.resources.find((item) => item.name === name)),
    );
    const backfill = yield* Effect.fromOption(Option.fromNullishOr(resource.backfill));
    const changes = yield* Effect.fromOption(Option.fromNullishOr(resource.changes));
    return { backfill, changes, requests: Ref.get(requests) };
  });

/** The key of a row. Some resources key on `key` instead of `id`. */
const rowId = (row: object) => ("id" in row ? `${row.id}` : "key" in row ? `${row.key}` : "");

// Bigints and dates print plainly in snapshots.
const plain = (value: unknown): unknown =>
  JSON.parse(JSON.stringify(value, (_key, item) => (typeof item === "bigint" ? `${item}n` : item)));

describe("resources", () => {
  it.effect("backfills closed milestones with their repository ID", () =>
    Effect.gen(function* () {
      const { backfill } = yield* getResource(
        "milestones",
        withRepositories([repository], {
          "/repos/octocat/hello-world/milestones?state=all&per_page=100": [
            {
              id: 42,
              number: 1,
              title: "First release",
              description: null,
              state: "closed",
              created_at: "2026-10-05T21:27:00Z",
              updated_at: "2026-10-05T22:00:00Z",
              closed_at: "2026-10-05T22:00:00Z",
              due_on: null,
            },
          ],
        }),
      );

      const page = yield* backfill.fetch({ cutoff });
      expect(page.rows).toMatchObject([
        {
          id: 42n,
          repository_id: BigInt(repository.id),
          state: "closed",
          version: new Date("2026-10-05T22:00:00Z"),
        },
      ]);
    }),
  );

  it.effect("matches the table schemas", () =>
    Effect.gen(function* () {
      const { client } = yield* makeFakeClient(() => undefined);
      const connector = yield* GitHubConnector.GitHubConnector.pipe(
        Effect.provide(connectorLayer(client)),
      );

      expect(connector.resources.map((item) => item.name)).toEqual(
        manifest.resources.map((item) => item.name),
      );
      for (const resource of connector.resources) {
        expect(tableSchemas[resource.name]).toBe(resource.rowSchema);
      }
      const demoTables = [...demo.setup.tables, ...demo.group.tables];
      expect(demoTables.map((table) => table.name).toSorted()).toEqual(
        Object.keys(tableSchemas).toSorted(),
      );
      for (const table of demoTables) {
        const resource = connector.resources.find((item) => item.name === table.name);
        expect(table.rowSchema).toBe(resource?.rowSchema);
        expect(table.version).toBe(resource?.version);
      }
    }),
  );

  it.effect("checks every resource with read-only calls", () =>
    Effect.gen(function* () {
      // One parent of each kind, so child resources check their own call too.
      const repo = "/repos/octocat/hello-world";
      const pages: Readonly<Record<string, unknown>> = {
        [`${repo}/pulls?state=all&per_page=1`]: [pullRequest],
        [`${repo}/commits?per_page=1`]: [commit],
        [`${repo}/actions/runs?per_page=1`]: { total_count: 1, workflow_runs: [workflowRun] },
        [`${repo}/commits/${commit.sha}/check-runs?filter=all&per_page=100`]: {
          total_count: 0,
          check_runs: [],
        },
        [`${repo}/actions/runs/${workflowRun.id}/jobs?filter=all&per_page=100`]: {
          total_count: 0,
          jobs: [],
        },
      };
      const { client, requests } = yield* makeFakeClient((url) =>
        url.startsWith("/installation/repositories")
          ? { body: { total_count: 1, repositories: [repository] } }
          : { body: pages[url] ?? [] },
      );

      const result = yield* ConnectorApp.check(
        GitHubConnector.GitHubConnector,
        connectorLayer(client),
        { resources: manifest.resources.map((resource) => resource.name) },
      );

      expect({
        result,
        requests: yield* Ref.get(requests),
      }).toMatchInlineSnapshot(`
        {
          "requests": [
            "/installation/repositories?per_page=1",
            "/installation/repositories?per_page=100",
            "/repos/octocat/hello-world/issues?state=all&per_page=1",
            "/installation/repositories?per_page=100",
            "/repos/octocat/hello-world/pulls?state=all&per_page=1",
            "/installation/repositories?per_page=100",
            "/repos/octocat/hello-world/issues/comments?per_page=1",
            "/installation/repositories?per_page=100",
            "/repos/octocat/hello-world/pulls?state=all&per_page=1",
            "/repos/octocat/hello-world/pulls/3/reviews?per_page=100",
            "/installation/repositories?per_page=100",
            "/repos/octocat/hello-world/pulls/comments?per_page=1",
            "/installation/repositories?per_page=100",
            "/repos/octocat/hello-world/pulls?state=all&per_page=1",
            "/repos/octocat/hello-world/pulls/3/commits?per_page=100",
            "/installation/repositories?per_page=100",
            "/repos/octocat/hello-world/commits?per_page=1",
            "/installation/repositories?per_page=100",
            "/repos/octocat/hello-world/commits?per_page=1",
            "/repos/octocat/hello-world/commits/9eb3a7d2ad61c47a7ee47c07e9787a616d0a228f/check-runs?filter=all&per_page=100",
            "/installation/repositories?per_page=100",
            "/repos/octocat/hello-world/commits?per_page=1",
            "/repos/octocat/hello-world/commits/9eb3a7d2ad61c47a7ee47c07e9787a616d0a228f/statuses?per_page=100",
            "/installation/repositories?per_page=100",
            "/repos/octocat/hello-world/actions/runs?per_page=1",
            "/installation/repositories?per_page=100",
            "/repos/octocat/hello-world/actions/runs?per_page=1",
            "/repos/octocat/hello-world/actions/runs/38138322363/jobs?filter=all&per_page=100",
            "/installation/repositories?per_page=100",
            "/repos/octocat/hello-world/releases?per_page=1",
            "/installation/repositories?per_page=100",
            "/repos/octocat/hello-world/labels?per_page=1",
            "/installation/repositories?per_page=100",
            "/repos/octocat/hello-world/milestones?state=all&per_page=1",
          ],
          "result": {
            "check_runs": {
              "_tag": "ok",
            },
            "commit_statuses": {
              "_tag": "ok",
            },
            "commits": {
              "_tag": "ok",
            },
            "issue_comments": {
              "_tag": "ok",
            },
            "issues": {
              "_tag": "ok",
            },
            "labels": {
              "_tag": "ok",
            },
            "milestones": {
              "_tag": "ok",
            },
            "pull_request_commits": {
              "_tag": "ok",
            },
            "pull_request_review_comments": {
              "_tag": "ok",
            },
            "pull_request_reviews": {
              "_tag": "ok",
            },
            "pull_requests": {
              "_tag": "ok",
            },
            "releases": {
              "_tag": "ok",
            },
            "repositories": {
              "_tag": "ok",
            },
            "workflow_jobs": {
              "_tag": "ok",
            },
            "workflow_runs": {
              "_tag": "ok",
            },
          },
        }
      `);
    }),
  );

  it.effect("backfills issues repository by repository, up to the cutoff", () =>
    Effect.gen(function* () {
      const first =
        "/repos/octocat/hello-world/issues?state=all&sort=created&direction=asc&per_page=100";
      const second = "https://api.github.com/repositories/1406396726/issues?after=Y3Vyc29y";
      const other =
        "/repos/octocat/spoon-knife/issues?state=all&sort=created&direction=asc&per_page=100";
      const pages: FakeGitHub = (url) =>
        url === repositoriesUrl
          ? {
              body: {
                total_count: 2,
                repositories: [otherRepository, repository],
              },
            }
          : url === first
            ? { body: [issue, pullRequestIssue], next: second }
            : url === second
              ? // The second issue is after the cutoff, so the repository is done.
                {
                  body: [
                    { ...without(issue, "assignees"), id: 2, number: 2, body: "Kept" },
                    {
                      ...issue,
                      id: 3,
                      number: 4,
                      created_at: "2026-10-06T08:00:00Z",
                    },
                  ],
                  next: "https://api.github.com/repositories/1406396726/issues?after=later",
                }
              : url === other
                ? { body: [] }
                : undefined;
      const { backfill, requests } = yield* getResource("issues", pages);

      const pagesRead: Array<unknown> = [];
      let pageCursor: string | undefined;
      for (;;) {
        const page = yield* backfill.fetch({
          cutoff,
          ...(pageCursor ? { pageCursor } : {}),
        });
        pagesRead.push({
          cursor: page.nextPageCursor ?? null,
          rows: plain(page.rows),
        });
        if (!page.hasMore) break;
        pageCursor = String(page.nextPageCursor);
      }

      expect({ pagesRead, requests: yield* requests }).toMatchInlineSnapshot(`
        {
          "pagesRead": [
            {
              "cursor": "{"repositoryId":1406396726,"next":"https://api.github.com/repositories/1406396726/issues?after=Y3Vyc29y"}",
              "rows": [
                {
                  "assignees": [
                    {
                      "id": "583231n",
                      "login": "octocat",
                      "type": "User",
                    },
                  ],
                  "author_association": "OWNER",
                  "body": "",
                  "closed_at": null,
                  "comments": "0n",
                  "created_at": "2026-10-05T21:40:30.000Z",
                  "html_url": "https://github.com/octocat/hello-world/issues/1",
                  "id": "5719289302n",
                  "labels": [
                    {
                      "id": "12557819502n",
                      "name": "bug",
                    },
                  ],
                  "locked": false,
                  "milestone": null,
                  "node_id": "I_kwDOU9PpNs8AAAABVOVt1g",
                  "number": "1n",
                  "repository_id": "1406396726n",
                  "state": "open",
                  "state_reason": null,
                  "title": "Live check A",
                  "user": {
                    "id": "583231n",
                    "login": "octocat",
                    "type": "User",
                  },
                  "version": "2026-10-05T22:04:14.000Z",
                },
              ],
            },
            {
              "cursor": "{"repositoryId":1406425446}",
              "rows": [
                {
                  "assignees": [],
                  "author_association": "OWNER",
                  "body": "Kept",
                  "closed_at": null,
                  "comments": "0n",
                  "created_at": "2026-10-05T21:40:30.000Z",
                  "html_url": "https://github.com/octocat/hello-world/issues/1",
                  "id": "2n",
                  "labels": [
                    {
                      "id": "12557819502n",
                      "name": "bug",
                    },
                  ],
                  "locked": false,
                  "milestone": null,
                  "node_id": "I_kwDOU9PpNs8AAAABVOVt1g",
                  "number": "2n",
                  "repository_id": "1406396726n",
                  "state": "open",
                  "state_reason": null,
                  "title": "Live check A",
                  "user": {
                    "id": "583231n",
                    "login": "octocat",
                    "type": "User",
                  },
                  "version": "2026-10-05T22:04:14.000Z",
                },
              ],
            },
            {
              "cursor": null,
              "rows": [],
            },
          ],
          "requests": [
            "/installation/repositories?per_page=100",
            "/repos/octocat/hello-world/issues?state=all&sort=created&direction=asc&per_page=100",
            "https://api.github.com/repositories/1406396726/issues?after=Y3Vyc29y",
            "/repos/octocat/spoon-knife/issues?state=all&sort=created&direction=asc&per_page=100",
          ],
        }
      `);
    }),
  );

  it.effect("reads issue changes newest first and new repositories in full", () =>
    Effect.gen(function* () {
      const newRepository = { ...otherRepository, id: 1406425446 };
      const { changes, requests } = yield* getResource(
        "issues",
        withRepositories([repository, newRepository], {
          "/repos/octocat/hello-world/issues?state=all&sort=updated&direction=desc&per_page=100&since=2026-10-06T10:55:00.000Z":
            [
              { ...issue, updated_at: "2026-10-06T11:10:00Z" },
              { ...pullRequestIssue, updated_at: "2026-10-06T11:10:00Z" },
            ],
          "/repos/octocat/spoon-knife/issues?state=all&sort=updated&direction=desc&per_page=100": [
            { ...issue, id: 7, number: 7 },
          ],
        }),
      );

      const result = yield* changes.fetch({
        cursor: JSON.stringify({
          since: "2026-10-06T11:00:00.000Z",
          repositoryIds: [repository.id],
        }),
      });

      expect({
        cursor: result.cursor,
        rows: result.rows.map(rowId),
        requests: yield* requests,
      }).toMatchInlineSnapshot(`
          {
            "cursor": "{"since":"2026-10-06T12:00:00.000Z","repositoryIds":[1406396726,1406425446]}",
            "requests": [
              "/installation/repositories?per_page=100",
              "/repos/octocat/hello-world/issues?state=all&sort=updated&direction=desc&per_page=100&since=2026-10-06T10:55:00.000Z",
              "/repos/octocat/spoon-knife/issues?state=all&sort=updated&direction=desc&per_page=100",
            ],
            "rows": [
              "5719289302",
              "7",
            ],
          }
        `);
    }),
  );

  it.effect("splits a long read across runs and keeps the run's start", () =>
    Effect.gen(function* () {
      // A new repository with 15 pages, then a known one with 10.
      const big = { ...otherRepository, id: 1, full_name: "octocat/big" };
      const pageUrl = (name: string, page: number) =>
        `https://api.github.com/repositories/${name}/issues?page=${page}`;
      const firstUrl = (name: string, since = "") =>
        `/repos/octocat/${name}/issues?state=all&sort=updated&direction=desc&per_page=100${since}`;
      const pages =
        (name: string, count: number, first: string): FakeGitHub =>
        (url) => {
          const page =
            url === first ? 1 : Number(url.match(new RegExp(`${name}/issues\\?page=(\\d+)`))?.[1]);
          if (!page) return undefined;
          return {
            body: [{ ...issue, id: page, number: page, updated_at: "2026-10-06T11:30:00Z" }],
            ...(page < count ? { next: pageUrl(name, page + 1) } : {}),
          };
        };
      const bigPages = pages("big", 15, firstUrl("big"));
      const knownPages = pages(
        "hello-world",
        10,
        firstUrl("hello-world", "&since=2026-10-06T10:55:00.000Z"),
      );
      const { changes, requests } = yield* getResource("issues", (url) =>
        url === repositoriesUrl
          ? { body: { total_count: 2, repositories: [repository, big] } }
          : (bigPages(url) ?? knownPages(url)),
      );

      const first = yield* changes.fetch({
        cursor: JSON.stringify({
          since: "2026-10-06T11:00:00.000Z",
          repositoryIds: [repository.id],
        }),
      });
      yield* TestClock.adjust("1 minute");
      const second = yield* changes.fetch({ cursor: String(first.cursor) });

      expect({
        first: { cursor: first.cursor, hasMore: first.hasMore, rows: first.rows.length },
        second: { cursor: second.cursor, hasMore: second.hasMore, rows: second.rows.length },
        requests: (yield* requests).length,
      }).toMatchInlineSnapshot(`
        {
          "first": {
            "cursor": "{"since":"2026-10-06T11:00:00.000Z","repositoryIds":[1406396726],"pending":{"until":"2026-10-06T12:00:00.000Z","repositoryIds":[1,1406396726],"repositoryId":1406396726,"url":"https://api.github.com/repositories/hello-world/issues?page=6"}}",
            "hasMore": true,
            "rows": 20,
          },
          "requests": 27,
          "second": {
            "cursor": "{"since":"2026-10-06T12:00:00.000Z","repositoryIds":[1,1406396726]}",
            "hasMore": false,
            "rows": 5,
          },
        }
      `);
    }),
  );

  it.effect("treats every repository as read on the first changes run", () =>
    Effect.gen(function* () {
      const { changes, requests } = yield* getResource(
        "issue_comments",
        withRepositories([repository], {
          "/repos/octocat/hello-world/issues/comments?sort=updated&direction=desc&per_page=100&since=2026-10-05T23:55:00.000Z":
            [{ ...issueComment, updated_at: "2026-10-06T00:30:00Z" }],
        }),
      );

      const result = yield* changes.fetch({ cursor: cutoff });

      expect({
        cursor: result.cursor,
        rows: plain(result.rows),
        requests: yield* requests,
      }).toMatchInlineSnapshot(`
        {
          "cursor": "{"since":"2026-10-06T12:00:00.000Z","repositoryIds":[1406396726]}",
          "requests": [
            "/installation/repositories?per_page=100",
            "/repos/octocat/hello-world/issues/comments?sort=updated&direction=desc&per_page=100&since=2026-10-05T23:55:00.000Z",
          ],
          "rows": [
            {
              "author_association": "OWNER",
              "body": "First live check comment",
              "created_at": "2026-10-05T21:40:52.000Z",
              "html_url": "https://github.com/octocat/hello-world/issues/2#issuecomment-6003550342",
              "id": "6003550342n",
              "issue_number": "2n",
              "node_id": "IC_kwDOU9PpNs8AAAABZdbohg",
              "repository_id": "1406396726n",
              "user": {
                "id": "583231n",
                "login": "octocat",
                "type": "User",
              },
              "version": "2026-10-06T00:30:00.000Z",
            },
          ],
        }
      `);
    }),
  );

  it.effect("stops reading pull requests at the first one older than the cursor", () =>
    Effect.gen(function* () {
      const older = {
        ...pullRequest,
        id: 2,
        number: 2,
        updated_at: "2026-10-01T00:00:00Z",
      };
      const { changes, requests } = yield* getResource("pull_requests", (url) =>
        url === repositoriesUrl
          ? {
              body: {
                total_count: 2,
                // GitHub returns 404 for its pull requests, so it is skipped.
                repositories: [repository, { ...otherRepository, has_pull_requests: false }],
              },
            }
          : url ===
              "/repos/octocat/hello-world/pulls?state=all&sort=updated&direction=desc&per_page=100"
            ? {
                body: [
                  {
                    ...without(pullRequest, "requested_reviewers"),
                    updated_at: "2026-10-06T11:30:00Z",
                  },
                  older,
                ],
                next: "https://api.github.com/repositories/1406396726/pulls?page=2",
              }
            : undefined,
      );

      const result = yield* changes.fetch({
        cursor: JSON.stringify({
          since: "2026-10-06T11:00:00.000Z",
          repositoryIds: [repository.id],
        }),
      });

      expect({
        cursor: result.cursor,
        rows: plain(result.rows),
        requests: yield* requests,
      }).toMatchInlineSnapshot(`
        {
          "cursor": "{"since":"2026-10-06T12:00:00.000Z","repositoryIds":[1406396726]}",
          "requests": [
            "/installation/repositories?per_page=100",
            "/repos/octocat/hello-world/pulls?state=all&sort=updated&direction=desc&per_page=100",
          ],
          "rows": [
            {
              "assignees": [],
              "author_association": "OWNER",
              "base": {
                "label": "octocat:main",
                "ref": "main",
                "sha": "351503f0426ffd1478bf966741fd57856a1422e0",
              },
              "body": "",
              "closed_at": "2026-10-05T22:05:25.000Z",
              "created_at": "2026-10-05T21:43:17.000Z",
              "draft": false,
              "head": {
                "label": "octocat:octocat-patch-1",
                "ref": "octocat-patch-1",
                "sha": "9eb3a7d2ad61c47a7ee47c07e9787a616d0a228f",
              },
              "html_url": "https://github.com/octocat/hello-world/pull/3",
              "id": "4751110848n",
              "labels": [],
              "locked": false,
              "merged_at": null,
              "milestone": null,
              "node_id": "PR_kwDOU9PpNs8AAAABGzAywA",
              "number": "3n",
              "repository_id": "1406396726n",
              "requested_reviewers": [],
              "state": "closed",
              "title": "Update README.md",
              "user": {
                "id": "583231n",
                "login": "octocat",
                "type": "User",
              },
              "version": "2026-10-06T11:30:00.000Z",
            },
          ],
        }
      `);
    }),
  );

  it.effect("backfills repositories created before the cutoff and finds new ones in changes", () =>
    Effect.gen(function* () {
      const later = {
        ...otherRepository,
        id: 5,
        created_at: "2026-10-06T06:00:00Z",
      };
      const { backfill, changes } = yield* getResource(
        "repositories",
        withRepositories([repository, later], {}),
      );

      const page = yield* backfill.fetch({ cutoff });
      const changed = yield* changes.fetch({
        cursor: JSON.stringify({
          since: "2026-10-06T11:00:00.000Z",
          repositoryIds: [repository.id],
        }),
      });

      expect({
        backfill: plain(page),
        changes: changed.rows.map(rowId),
      }).toMatchInlineSnapshot(`
        {
          "backfill": {
            "hasMore": false,
            "rows": [
              {
                "_deleted": false,
                "archived": false,
                "created_at": "2026-10-05T21:26:32.000Z",
                "default_branch": "main",
                "description": "",
                "disabled": false,
                "fork": false,
                "full_name": "octocat/hello-world",
                "html_url": "https://github.com/octocat/hello-world",
                "id": "1406396726n",
                "language": null,
                "name": "hello-world",
                "node_id": "R_kgDOU9PpNg",
                "owner": {
                  "id": "583231n",
                  "login": "octocat",
                  "type": "User",
                },
                "private": true,
                "topics": [],
                "version": "2026-10-05T21:26:33.000Z",
                "visibility": "private",
              },
            ],
          },
          "changes": [
            "5",
          ],
        }
      `);
    }),
  );

  it.effect("backfills a newest-first list in full, up to the cutoff", () =>
    Effect.gen(function* () {
      const first = "/repos/octocat/hello-world/releases?per_page=100";
      const second = "https://api.github.com/repositories/1406396726/releases?page=2";
      const { backfill, requests } = yield* getResource("releases", (url) =>
        url === repositoriesUrl
          ? { body: { total_count: 1, repositories: [repository] } }
          : url === first
            ? {
                // The newest release is after the cutoff, but older ones follow.
                body: [{ ...release, id: 3, created_at: "2026-10-06T08:00:00Z" }, release],
                next: second,
              }
            : url === second
              ? { body: [{ ...release, id: 1, created_at: "2026-09-01T00:00:00Z" }] }
              : undefined,
      );

      const ids: Array<string> = [];
      let pageCursor: string | undefined;
      for (;;) {
        const page = yield* backfill.fetch({ cutoff, ...(pageCursor ? { pageCursor } : {}) });
        ids.push(...page.rows.map(rowId));
        if (!page.hasMore) break;
        pageCursor = String(page.nextPageCursor);
      }

      expect({ ids, requests: yield* requests }).toMatchInlineSnapshot(`
        {
          "ids": [
            "399674740",
            "1",
          ],
          "requests": [
            "/installation/repositories?per_page=100",
            "/repos/octocat/hello-world/releases?per_page=100",
            "https://api.github.com/repositories/1406396726/releases?page=2",
          ],
        }
      `);
    }),
  );

  it.effect("reads run changes until runs are a day older than the cursor", () =>
    Effect.gen(function* () {
      const first = "/repos/octocat/hello-world/actions/runs?per_page=100";
      const second = "https://api.github.com/repositories/1406396726/actions/runs?page=2";
      const third = "https://api.github.com/repositories/1406396726/actions/runs?page=3";
      const run = (id: number, created_at: string, updated_at: string) => ({
        ...workflowRun,
        id,
        created_at,
        updated_at,
      });
      const { changes, requests } = yield* getResource("workflow_runs", (url) =>
        url === repositoriesUrl
          ? { body: { total_count: 1, repositories: [repository] } }
          : url === first
            ? {
                body: {
                  total_count: 3,
                  workflow_runs: [
                    run(3, "2026-10-06T10:00:00Z", "2026-10-06T11:30:00Z"),
                    // Created within a day, but not changed since the cursor.
                    run(2, "2026-10-05T20:00:00Z", "2026-10-05T21:00:00Z"),
                  ],
                },
                next: second,
              }
            : url === second
              ? {
                  body: {
                    total_count: 3,
                    workflow_runs: [run(1, "2026-10-04T00:00:00Z", "2026-10-06T11:10:00Z")],
                  },
                  next: third,
                }
              : undefined,
      );

      const result = yield* changes.fetch({
        cursor: JSON.stringify({
          since: "2026-10-06T11:00:00.000Z",
          repositoryIds: [repository.id],
        }),
      });

      expect({ ids: result.rows.map(rowId), requests: yield* requests }).toMatchInlineSnapshot(`
        {
          "ids": [
            "3",
            "1",
          ],
          "requests": [
            "/installation/repositories?per_page=100",
            "/repos/octocat/hello-world/actions/runs?per_page=100",
            "https://api.github.com/repositories/1406396726/actions/runs?page=2",
          ],
        }
      `);
    }),
  );

  it.effect("reads commit changes with since and no sort", () =>
    Effect.gen(function* () {
      const { changes, requests } = yield* getResource(
        "commits",
        withRepositories([repository], {
          "/repos/octocat/hello-world/commits?per_page=100&since=2026-10-06T10:55:00.000Z": [
            {
              ...commit,
              commit: {
                ...commit.commit,
                committer: { ...commit.commit.committer, date: "2026-10-06T11:20:00Z" },
              },
            },
          ],
        }),
      );

      const result = yield* changes.fetch({
        cursor: JSON.stringify({
          since: "2026-10-06T11:00:00.000Z",
          repositoryIds: [repository.id],
        }),
      });

      expect({ ids: result.rows.map(rowId), requests: yield* requests }).toMatchInlineSnapshot(`
        {
          "ids": [
            "1406396726:9eb3a7d2ad61c47a7ee47c07e9787a616d0a228f",
          ],
          "requests": [
            "/installation/repositories?per_page=100",
            "/repos/octocat/hello-world/commits?per_page=100&since=2026-10-06T10:55:00.000Z",
          ],
        }
      `);
    }),
  );

  it.effect("backfills reviews of each pull request on the page", () =>
    Effect.gen(function* () {
      const repo = "/repos/octocat/hello-world";
      const { backfill, requests } = yield* getResource(
        "pull_request_reviews",
        withRepositories([repository], {
          [`${repo}/pulls?state=all&sort=created&direction=asc&per_page=100`]: [
            pullRequest,
            { ...pullRequest, id: 5, number: 5 },
          ],
          [`${repo}/pulls/3/reviews?per_page=100`]: [pullRequestReview],
          [`${repo}/pulls/5/reviews?per_page=100`]: [],
        }),
      );

      const page = yield* backfill.fetch({ cutoff });

      expect({
        hasMore: page.hasMore,
        rows: plain(page.rows),
        requests: yield* requests,
      }).toMatchInlineSnapshot(`
        {
          "hasMore": false,
          "requests": [
            "/installation/repositories?per_page=100",
            "/repos/octocat/hello-world/pulls?state=all&sort=created&direction=asc&per_page=100",
            "/repos/octocat/hello-world/pulls/3/reviews?per_page=100",
            "/repos/octocat/hello-world/pulls/5/reviews?per_page=100",
          ],
          "rows": [
            {
              "author_association": "OWNER",
              "body": "Looks good, one question inline.",
              "commit_id": "9eb3a7d2ad61c47a7ee47c07e9787a616d0a228f",
              "html_url": "https://github.com/octocat/hello-world/pull/3#pullrequestreview-5476624499",
              "id": "5476624499n",
              "node_id": "PRR_kwDODTMu2M8AAAABRm6ocw",
              "pull_request_number": "3n",
              "repository_id": "1406396726n",
              "state": "COMMENTED",
              "submitted_at": "2026-10-05T21:50:23.000Z",
              "user": {
                "id": "583231n",
                "login": "octocat",
                "type": "User",
              },
              "version": "2026-10-06T12:00:00.000Z",
            },
          ],
        }
      `);
    }),
  );
});

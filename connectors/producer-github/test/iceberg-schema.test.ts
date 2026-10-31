import { describe, expect, it } from "@effect/vitest";
import { Iceberg } from "@useairfoil/connector-kit";
import { Effect } from "effect";

import { tableSchemas } from "../src/tables";

type CreateRequest = Effect.Success<ReturnType<typeof Iceberg.makeCreateTableRequest>>;
type TableSchema = CreateRequest["schema"];
type IcebergType = TableSchema["fields"][number]["type"];

const tableSchema = (request: CreateRequest): TableSchema => request.schema;

const undocumented = (type: IcebergType): ReadonlyArray<string> => {
  if (typeof type === "string") return [];
  switch (type.type) {
    case "struct":
      return type.fields.flatMap((field) => [
        ...(field.doc ? [] : [field.name]),
        ...undocumented(field.type),
      ]);
    case "list":
      return undocumented(type.element);
    case "map":
      return [...undocumented(type.key), ...undocumented(type.value)];
  }
};

const describeType = (type: IcebergType): string => {
  if (typeof type === "string") return type;
  switch (type.type) {
    case "struct":
      return `struct<${type.fields.map((field) => `${field.name}${field.required ? "" : "?"}: ${describeType(field.type)}`).join(", ")}>`;
    case "list":
      return `list<${describeType(type.element)}>`;
    case "map":
      return `map<${describeType(type.key)}, ${describeType(type.value)}>`;
  }
};

describe("Iceberg schemas", () => {
  it.effect("compiles every table with documented fields", () =>
    Effect.gen(function* () {
      const comments: Record<string, string | undefined> = {};
      const missingDocs: Array<string> = [];
      const tables: Record<string, ReadonlyArray<string>> = {};
      for (const [name, schema] of Object.entries(tableSchemas)) {
        const request = yield* Iceberg.makeCreateTableRequest(schema, {
          name: "rows",
          location: `s3://warehouse/github-${name}`,
        });
        comments[name] = request.properties?.comment;

        const fields = tableSchema(request);
        missingDocs.push(...undocumented(fields).map((field) => `${name}.${field}`));
        tables[name] = [
          `identifier: ${fields.fields
            .filter((field) => fields["identifier-field-ids"]?.includes(field.id))
            .map((field) => field.name)
            .join(", ")}`,
          ...fields.fields.map(
            (field) => `${field.name}${field.required ? "" : "?"}: ${describeType(field.type)}`,
          ),
        ];
      }

      expect({ comments, missingDocs }).toMatchInlineSnapshot(`
        {
          "comments": {
            "check_runs": "Check runs, such as GitHub Actions jobs. Polled for default-branch commits; webhooks cover all branches.",
            "commit_statuses": "Commit statuses. Polled for default-branch commits; webhooks cover all branches.",
            "commits": "Commits on the default branch of the installation's repositories.",
            "issue_comments": "Comments on issues and pull requests. Pull request review comments are not included.",
            "issues": "Issues in the installation's repositories. Pull requests are not included.",
            "pull_request_commits": "Commits in pull requests, up to 250 per pull request. Commits removed by a force push stay.",
            "pull_request_review_comments": "Review comments on pull request diffs.",
            "pull_request_reviews": "Reviews on pull requests. Pending reviews are only visible to their author.",
            "pull_requests": "Pull requests in the installation's repositories.",
            "releases": "Releases in the installation's repositories, with their assets.",
            "repositories": "Repositories the GitHub App installation can read.",
            "workflow_jobs": "Jobs of GitHub Actions workflow runs. Each run attempt has its own jobs.",
            "workflow_runs": "GitHub Actions workflow runs in the installation's repositories.",
          },
          "missingDocs": [],
        }
      `);
      expect(tables).toMatchInlineSnapshot(`
        {
          "check_runs": [
            "identifier: id",
            "id: long",
            "version?: timestamptz",
            "node_id?: string",
            "repository_id?: long",
            "head_sha?: string",
            "name?: string",
            "status?: string",
            "conclusion?: string",
            "started_at?: timestamptz",
            "completed_at?: timestamptz",
            "app?: struct<id: long, name: string>",
            "check_suite?: struct<id: long>",
            "output?: struct<title?: string, summary?: string>",
            "external_id?: string",
            "details_url?: string",
            "html_url?: string",
          ],
          "commit_statuses": [
            "identifier: id",
            "id: long",
            "version?: timestamptz",
            "node_id?: string",
            "repository_id?: long",
            "sha?: string",
            "state?: string",
            "context?: string",
            "description?: string",
            "target_url?: string",
            "creator?: struct<id: long, login: string, type: string>",
            "created_at?: timestamptz",
          ],
          "commits": [
            "identifier: key",
            "key: string",
            "version?: timestamptz",
            "repository_id?: long",
            "sha?: string",
            "node_id?: string",
            "message?: string",
            "author?: struct<name: string, date: timestamptz>",
            "committer?: struct<name: string, date: timestamptz>",
            "author_user?: struct<id: long, login: string, type: string>",
            "committer_user?: struct<id: long, login: string, type: string>",
            "parents?: list<string>",
            "verified?: boolean",
            "html_url?: string",
          ],
          "issue_comments": [
            "identifier: id",
            "id: long",
            "version?: timestamptz",
            "node_id?: string",
            "repository_id?: long",
            "issue_number?: long",
            "user?: struct<id: long, login: string, type: string>",
            "author_association?: string",
            "body?: string",
            "created_at?: timestamptz",
            "html_url?: string",
            "_deleted?: boolean",
          ],
          "issues": [
            "identifier: id",
            "id: long",
            "version?: timestamptz",
            "node_id?: string",
            "repository_id?: long",
            "number?: long",
            "title?: string",
            "body?: string",
            "state?: string",
            "state_reason?: string",
            "locked?: boolean",
            "user?: struct<id: long, login: string, type: string>",
            "author_association?: string",
            "labels?: list<struct<id: long, name: string>>",
            "assignees?: list<struct<id: long, login: string, type: string>>",
            "milestone?: struct<id: long, number: long, title: string>",
            "comments?: long",
            "created_at?: timestamptz",
            "closed_at?: timestamptz",
            "html_url?: string",
            "_deleted?: boolean",
          ],
          "pull_request_commits": [
            "identifier: key",
            "key: string",
            "version?: timestamptz",
            "repository_id?: long",
            "pull_request_number?: long",
            "sha?: string",
            "message?: string",
            "author?: struct<name: string, date: timestamptz>",
            "committer?: struct<name: string, date: timestamptz>",
            "author_user?: struct<id: long, login: string, type: string>",
            "committer_user?: struct<id: long, login: string, type: string>",
            "html_url?: string",
          ],
          "pull_request_review_comments": [
            "identifier: id",
            "id: long",
            "version?: timestamptz",
            "node_id?: string",
            "repository_id?: long",
            "pull_request_number?: long",
            "pull_request_review_id?: long",
            "in_reply_to_id?: long",
            "user?: struct<id: long, login: string, type: string>",
            "author_association?: string",
            "body?: string",
            "path?: string",
            "commit_id?: string",
            "original_commit_id?: string",
            "diff_hunk?: string",
            "line?: long",
            "original_line?: long",
            "start_line?: long",
            "side?: string",
            "subject_type?: string",
            "created_at?: timestamptz",
            "html_url?: string",
            "_deleted?: boolean",
          ],
          "pull_request_reviews": [
            "identifier: id",
            "id: long",
            "version?: timestamptz",
            "node_id?: string",
            "repository_id?: long",
            "pull_request_number?: long",
            "user?: struct<id: long, login: string, type: string>",
            "author_association?: string",
            "state?: string",
            "body?: string",
            "commit_id?: string",
            "submitted_at?: timestamptz",
            "html_url?: string",
          ],
          "pull_requests": [
            "identifier: id",
            "id: long",
            "version?: timestamptz",
            "node_id?: string",
            "repository_id?: long",
            "number?: long",
            "title?: string",
            "body?: string",
            "state?: string",
            "draft?: boolean",
            "locked?: boolean",
            "user?: struct<id: long, login: string, type: string>",
            "author_association?: string",
            "labels?: list<struct<id: long, name: string>>",
            "assignees?: list<struct<id: long, login: string, type: string>>",
            "requested_reviewers?: list<struct<id: long, login: string, type: string>>",
            "milestone?: struct<id: long, number: long, title: string>",
            "head?: struct<ref: string, sha: string, label: string>",
            "base?: struct<ref: string, sha: string, label: string>",
            "created_at?: timestamptz",
            "closed_at?: timestamptz",
            "merged_at?: timestamptz",
            "html_url?: string",
          ],
          "releases": [
            "identifier: id",
            "id: long",
            "version?: timestamptz",
            "node_id?: string",
            "repository_id?: long",
            "tag_name?: string",
            "target_commitish?: string",
            "name?: string",
            "body?: string",
            "draft?: boolean",
            "prerelease?: boolean",
            "author?: struct<id: long, login: string, type: string>",
            "assets?: list<struct<id: long, name: string, label?: string, state: string, content_type: string, size: long, download_count: long, created_at: timestamptz, updated_at: timestamptz, browser_download_url: string>>",
            "created_at?: timestamptz",
            "published_at?: timestamptz",
            "html_url?: string",
            "_deleted?: boolean",
          ],
          "repositories": [
            "identifier: id",
            "id: long",
            "version?: timestamptz",
            "node_id?: string",
            "name?: string",
            "full_name?: string",
            "owner?: struct<id: long, login: string, type: string>",
            "private?: boolean",
            "visibility?: string",
            "description?: string",
            "fork?: boolean",
            "archived?: boolean",
            "disabled?: boolean",
            "default_branch?: string",
            "language?: string",
            "topics?: list<string>",
            "html_url?: string",
            "created_at?: timestamptz",
            "_deleted?: boolean",
          ],
          "workflow_jobs": [
            "identifier: id",
            "id: long",
            "version?: timestamptz",
            "node_id?: string",
            "repository_id?: long",
            "run_id?: long",
            "run_attempt?: long",
            "workflow_name?: string",
            "name?: string",
            "head_sha?: string",
            "head_branch?: string",
            "status?: string",
            "conclusion?: string",
            "created_at?: timestamptz",
            "started_at?: timestamptz",
            "completed_at?: timestamptz",
            "runner_name?: string",
            "labels?: list<string>",
            "steps?: list<struct<number: long, name: string, status: string, conclusion?: string, started_at?: timestamptz, completed_at?: timestamptz>>",
            "html_url?: string",
          ],
          "workflow_runs": [
            "identifier: id",
            "id: long",
            "version?: timestamptz",
            "node_id?: string",
            "repository_id?: long",
            "workflow_id?: long",
            "name?: string",
            "display_title?: string",
            "path?: string",
            "event?: string",
            "status?: string",
            "conclusion?: string",
            "head_branch?: string",
            "head_sha?: string",
            "run_number?: long",
            "run_attempt?: long",
            "check_suite_id?: long",
            "actor?: struct<id: long, login: string, type: string>",
            "triggering_actor?: struct<id: long, login: string, type: string>",
            "pull_requests?: list<struct<id: long, number: long>>",
            "created_at?: timestamptz",
            "run_started_at?: timestamptz",
            "html_url?: string",
          ],
        }
      `);
    }),
  );
});

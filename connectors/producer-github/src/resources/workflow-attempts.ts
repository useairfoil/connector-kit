import { type ConnectorError, Resource } from "@useairfoil/connector-kit";
import { Effect, Struct } from "effect";

import type { GitHubClientService } from "../client/client";
import type { RepositoryRef } from "../schemas/repositories";

import { type WorkflowAttempt, WorkflowAttemptSchema } from "../schemas/workflow-attempts";
import { type WorkflowRunObject, WorkflowRunObjectSchema } from "../schemas/workflow-runs";
import {
  type RepoResourceSpec,
  backfillRepoResource,
  changesRepoResource,
  checkRepoResource,
  repoPath,
} from "./shared";
import { workflowRunSpec } from "./workflow-runs";

export const makeWorkflowAttempts = (
  client: GitHubClientService,
  repositories: Effect.Effect<ReadonlyArray<RepositoryRef>, ConnectorError>,
) => {
  // The list has the latest attempt. Earlier ones are read one by one.
  const spec: RepoResourceSpec<WorkflowRunObject, WorkflowAttempt> = {
    ...workflowRunSpec,
    rows: (runs, repository) =>
      Effect.forEach(runs, (run) =>
        Effect.forEach(
          Array.from({ length: Number(run.run_attempt ?? 1n) - 1 }, (_, index) => index + 1),
          (attempt) =>
            client
              .get(
                WorkflowRunObjectSchema,
                repoPath(repository, `actions/runs/${run.id}/attempts/${attempt}`),
              )
              .pipe(Effect.map(({ body }) => body)),
        ).pipe(
          Effect.map((earlier) =>
            [...earlier, run].map((attempt, index) => ({
              ...Struct.pick(attempt, [
                "workflow_id",
                "status",
                "conclusion",
                "head_sha",
                "run_started_at",
              ]),
              key: `${run.id}:${index + 1}`,
              version: attempt.updated_at,
              repository_id: BigInt(repository.id),
              run_id: run.id,
              run_attempt: BigInt(index + 1),
            })),
          ),
        ),
      ).pipe(Effect.map((rows) => rows.flat())),
  };
  return Resource.entity({
    name: "workflow_attempts",
    rowSchema: WorkflowAttemptSchema,
    version: "version",

    check: checkRepoResource(client, spec),
    backfill: backfillRepoResource(client, repositories, spec),
    changes: changesRepoResource(client, spec),
  });
};

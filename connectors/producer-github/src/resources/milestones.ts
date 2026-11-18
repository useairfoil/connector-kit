import { type ConnectorError, Resource } from "@useairfoil/connector-kit";
import { Effect, Schema } from "effect";

import type { GitHubClientService } from "../client/client";
import type { RepositoryRef } from "../schemas/repositories";

import { WebhookPayloadSchema } from "../schemas/events";
import { type Milestone, MilestoneObjectSchema, MilestoneSchema } from "../schemas/milestones";
import { Long } from "../schemas/shared";
import {
  type RepoResourceSpec,
  backfillRepoResource,
  changesRepoResource,
  checkRepoResource,
  decodeEvent,
  deleteRow,
  rowsOf,
} from "./shared";

const MilestoneEventSchema = Schema.Union([
  Schema.Struct({ action: Schema.Literal("deleted"), milestone: Schema.Struct({ id: Long }) }),
  Schema.Struct({
    action: Schema.String,
    milestone: MilestoneObjectSchema,
    repository: Schema.Struct({ id: Long }),
  }),
]);

const toRow = (
  { updated_at: version, ...milestone }: typeof MilestoneObjectSchema.Type,
  repository_id: bigint,
): Milestone => ({ ...milestone, version, repository_id });

const spec: RepoResourceSpec<typeof MilestoneObjectSchema.Type, Milestone> = {
  path: "milestones",
  pageSchema: Schema.Array(MilestoneObjectSchema),
  params: { state: "all" },
  since: false,
  // GitHub cannot sort milestones by creation or update time.
  order: "newest",
  createdAt: (item) => item.created_at,
  updatedAt: (item) => item.updated_at,
  keep: () => true,
  enabled: () => true,
  rows: rowsOf(toRow),
};

export const makeMilestones = (
  client: GitHubClientService,
  repositories: Effect.Effect<ReadonlyArray<RepositoryRef>, ConnectorError>,
) =>
  Resource.entity({
    name: "milestones",
    rowSchema: MilestoneSchema,
    version: "version",
    check: checkRepoResource(client, spec),
    backfill: backfillRepoResource(client, repositories, spec),
    changes: changesRepoResource(client, spec),
    webhook: {
      schema: WebhookPayloadSchema,
      handler: ({ payload }) =>
        Effect.gen(function* () {
          const event = yield* decodeEvent(MilestoneEventSchema, payload);
          if (!("repository" in event)) return [yield* deleteRow(event.milestone.id)];
          return [toRow(event.milestone, event.repository.id)];
        }),
    },
  });

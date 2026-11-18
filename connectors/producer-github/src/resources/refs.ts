import { type ConnectorError, Resource } from "@useairfoil/connector-kit";
import { Effect, Schema } from "effect";

import type { GitHubClientService } from "../client/client";
import type { RepositoryRef } from "../schemas/repositories";

import {
  type Branch,
  BranchObjectSchema,
  BranchSchema,
  type Tag,
  TagObjectSchema,
  TagSchema,
} from "../schemas/refs";
import {
  type RepoResourceSpec,
  backfillRepoResource,
  changesRepoResource,
  checkRepoResource,
} from "./shared";

// Refs have no IDs or timestamps, so every read sends all of them.
const branchSpec: RepoResourceSpec<typeof BranchObjectSchema.Type, Branch> = {
  path: "branches",
  pageSchema: Schema.Array(BranchObjectSchema),
  params: {},
  since: false,
  order: "newest",
  keep: () => true,
  enabled: () => true,
  rows: (items, repository, version) =>
    Effect.succeed(
      items.map((item) => ({
        ...item,
        key: `${repository.id}:${item.name}`,
        version,
        repository_id: BigInt(repository.id),
      })),
    ),
};

const tagSpec: RepoResourceSpec<typeof TagObjectSchema.Type, Tag> = {
  path: "tags",
  pageSchema: Schema.Array(TagObjectSchema),
  params: {},
  since: false,
  order: "newest",
  keep: () => true,
  enabled: () => true,
  rows: (items, repository, version) =>
    Effect.succeed(
      items.map((item) => ({
        ...item,
        key: `${repository.id}:${item.name}`,
        version,
        repository_id: BigInt(repository.id),
      })),
    ),
};

export const makeBranches = (
  client: GitHubClientService,
  repositories: Effect.Effect<ReadonlyArray<RepositoryRef>, ConnectorError>,
) =>
  Resource.entity({
    name: "branches",
    rowSchema: BranchSchema,
    version: "version",

    check: checkRepoResource(client, branchSpec),
    backfill: backfillRepoResource(client, repositories, branchSpec),
    changes: changesRepoResource(client, branchSpec),
  });

export const makeTags = (
  client: GitHubClientService,
  repositories: Effect.Effect<ReadonlyArray<RepositoryRef>, ConnectorError>,
) =>
  Resource.entity({
    name: "tags",
    rowSchema: TagSchema,
    version: "version",

    check: checkRepoResource(client, tagSpec),
    backfill: backfillRepoResource(client, repositories, tagSpec),
    changes: changesRepoResource(client, tagSpec),
  });

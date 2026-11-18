import { type ConnectorError, Resource } from "@useairfoil/connector-kit";
import { DateTime, Effect, Schema } from "effect";

import type { RepositoryRef } from "../schemas/repositories";

import { type GitHubClientService, withParams } from "../client/client";
import { WebhookPayloadSchema } from "../schemas/events";
import { type Label, LabelObjectSchema, LabelSchema } from "../schemas/labels";
import { Long } from "../schemas/shared";
import {
  type RepoResourceSpec,
  backfillRepoResource,
  changesRepoResource,
  checkRepoResource,
  decodeEvent,
  deleteRow,
  pageSize,
  readPages,
} from "./shared";

const LabelEventSchema = Schema.Struct({
  action: Schema.String,
  label: Schema.Struct({ id: Long }),
  repository: Schema.Struct({ id: Long, full_name: Schema.String }),
});

const spec: RepoResourceSpec<typeof LabelObjectSchema.Type, Label> = {
  path: "labels",
  pageSchema: Schema.Array(LabelObjectSchema),
  params: {},
  since: false,
  order: "newest",
  keep: () => true,
  enabled: () => true,
  // GitHub exposes no timestamps for labels.
  rows: (items, repository, version) =>
    Effect.succeed(
      items.map((item) => ({ ...item, repository_id: BigInt(repository.id), version })),
    ),
};

export const makeLabels = (
  client: GitHubClientService,
  repositories: Effect.Effect<ReadonlyArray<RepositoryRef>, ConnectorError>,
) =>
  Resource.entity({
    name: "labels",
    rowSchema: LabelSchema,
    version: "version",
    check: checkRepoResource(client, spec),
    backfill: backfillRepoResource(client, repositories, spec),
    changes: changesRepoResource(client, spec),
    webhook: {
      schema: WebhookPayloadSchema,
      handler: ({ payload }) =>
        Effect.gen(function* () {
          const event = yield* decodeEvent(LabelEventSchema, payload);
          if (event.action === "deleted") return [yield* deleteRow(event.label.id)];

          // The label may have been renamed again since this event.
          const version = yield* DateTime.nowAsDate;
          const items = yield* readPages(
            client,
            spec.pageSchema,
            withParams(`/repos/${event.repository.full_name}/labels`, { per_page: pageSize }),
            (page) => !page.some((item) => item.id === event.label.id),
          );
          const label = items.find((item) => item.id === event.label.id);
          return label === undefined
            ? []
            : [{ ...label, version, repository_id: event.repository.id }];
        }),
    },
  });

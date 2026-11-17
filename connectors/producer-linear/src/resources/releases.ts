import { Resource } from "@useairfoil/connector-kit";

import type { LinearClientService } from "../client/client";

import {
  IssueToReleaseObjectSchema,
  IssueToReleaseSchema,
  ReleaseHistoryObjectSchema,
  ReleaseHistorySchema,
  ReleaseNoteObjectSchema,
  ReleaseNoteSchema,
  ReleaseObjectSchema,
  ReleasePipelineObjectSchema,
  ReleasePipelineSchema,
  ReleaseSchema,
  ReleaseStageObjectSchema,
  ReleaseStageSchema,
} from "../schemas/releases";
import {
  backfillList,
  changesList,
  checkList,
  listSources,
  listSpec,
  nestedSpec,
  rowsOf,
} from "./pages";

const releaseSpec = listSpec({
  connection: "releases",
  fields: `id created_at: createdAt updated_at: updatedAt archived_at: archivedAt
    name description release_version: version url commit_sha: commitSha
    pipeline_id: pipeline { id } stage_id: stage { id } creator_id: creator { id }
    start_date: startDate target_date: targetDate started_at: startedAt
    completed_at: completedAt canceled_at: canceledAt trashed`,
  item: ReleaseObjectSchema,
  updatedAt: (release) => release.updated_at,
  rows: rowsOf((release) => ({ ...release, version: release.updated_at })),
});

export const makeReleases = (client: LinearClientService) =>
  Resource.entity({
    name: "releases",
    rowSchema: ReleaseSchema,
    version: "version",

    check: checkList(client, releaseSpec),
    backfill: backfillList(client, releaseSpec),
    changes: changesList(client, releaseSpec),
  });

const releaseNoteSpec = listSpec({
  connection: "releaseNotes",
  fields: `id created_at: createdAt updated_at: updatedAt archived_at: archivedAt
    title content: documentContent { content } url pipeline_id: pipeline { id }
    release_ids: releases { id }`,
  item: ReleaseNoteObjectSchema,
  updatedAt: (note) => note.updated_at,
  rows: rowsOf((note) => ({ ...note, version: note.updated_at })),
});

export const makeReleaseNotes = (client: LinearClientService) =>
  Resource.entity({
    name: "release_notes",
    rowSchema: ReleaseNoteSchema,
    version: "version",

    check: checkList(client, releaseNoteSpec),
    backfill: backfillList(client, releaseNoteSpec),
    changes: changesList(client, releaseNoteSpec),
  });

const releasePipelineSpec = listSpec({
  connection: "releasePipelines",
  fields: `id created_at: createdAt updated_at: updatedAt archived_at: archivedAt
    name type is_production: isProduction url include_path_patterns: includePathPatterns
    approximate_release_count: approximateReleaseCount trashed`,
  item: ReleasePipelineObjectSchema,
  updatedAt: (pipeline) => pipeline.updated_at,
  rows: rowsOf((pipeline) => ({ ...pipeline, version: pipeline.updated_at })),
});

export const makeReleasePipelines = (client: LinearClientService) =>
  Resource.entity({
    name: "release_pipelines",
    rowSchema: ReleasePipelineSchema,
    version: "version",
    ...listSources(client, releasePipelineSpec),
  });

const releaseStageSpec = listSpec({
  connection: "releaseStages",
  fields: `id created_at: createdAt updated_at: updatedAt archived_at: archivedAt name type color position frozen pipeline_id: pipeline { id }`,
  item: ReleaseStageObjectSchema,
  updatedAt: (stage) => stage.updated_at,
  rows: rowsOf((stage) => ({ ...stage, version: stage.updated_at })),
});

export const makeReleaseStages = (client: LinearClientService) =>
  Resource.entity({
    name: "release_stages",
    rowSchema: ReleaseStageSchema,
    version: "version",
    ...listSources(client, releaseStageSpec),
  });

const issueToReleaseSpec = listSpec({
  connection: "issueToReleases",
  fields: `id created_at: createdAt updated_at: updatedAt archived_at: archivedAt issue_id: issue { id } release_id: release { id }`,
  item: IssueToReleaseObjectSchema,
  updatedAt: (link) => link.updated_at,
  rows: rowsOf((link) => ({ ...link, version: link.updated_at })),
});

export const makeIssueToReleases = (client: LinearClientService) =>
  Resource.entity({
    name: "issue_to_releases",
    rowSchema: IssueToReleaseSchema,
    version: "version",

    check: checkList(client, issueToReleaseSpec),
    backfill: backfillList(client, issueToReleaseSpec),
    changes: changesList(client, issueToReleaseSpec),
  });

export const makeReleaseHistory = (client: LinearClientService) => {
  const spec = nestedSpec(client, {
    parents: "releases",
    parent: "release",
    connection: "history",
    fields: "id created_at: createdAt updated_at: updatedAt archived_at: archivedAt entries",
    item: ReleaseHistoryObjectSchema,
    row: (entry, release) => ({ ...entry, release_id: release.id, version: entry.updated_at }),
  });
  return Resource.entity({
    name: "release_history",
    rowSchema: ReleaseHistorySchema,
    version: "version",

    check: checkList(client, spec),
    backfill: backfillList(client, spec),
    changes: changesList(client, spec),
  });
};

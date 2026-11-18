import { Resource } from "@useairfoil/connector-kit";

import type { LinearClientService } from "../client/client";

import {
  InitiativeHistoryObjectSchema,
  InitiativeHistorySchema,
  InitiativeLabelObjectSchema,
  InitiativeLabelSchema,
  InitiativeObjectSchema,
  InitiativeRelationObjectSchema,
  InitiativeRelationSchema,
  InitiativeSchema,
  InitiativeToProjectObjectSchema,
  InitiativeToProjectSchema,
  InitiativeUpdateObjectSchema,
  InitiativeUpdateSchema,
} from "../schemas/initiatives";
import {
  backfillList,
  changesList,
  checkList,
  listSources,
  listSpec,
  nestedSpec,
  rowsOf,
  webhookList,
} from "./pages";

const initiativeSpec = listSpec({
  connection: "initiatives",
  single: "initiative",
  fields: `id created_at: createdAt updated_at: updatedAt archived_at: archivedAt
    name description content url icon color status health
    health_updated_at: healthUpdatedAt priority owner_id: owner { id } creator_id: creator { id }
    parent_initiative_id: parentInitiative { id } target_date: targetDate
    started_at: startedAt completed_at: completedAt canceled_at: canceledAt
    label_ids: labelIds visibility trashed`,
  item: InitiativeObjectSchema,
  updatedAt: (initiative) => initiative.updated_at,
  rows: rowsOf((initiative) => ({
    ...initiative,
    version: initiative.updated_at,
    _deleted: false,
  })),
});

export const makeInitiatives = (client: LinearClientService) =>
  Resource.entity({
    name: "initiatives",
    rowSchema: InitiativeSchema,
    version: "version",

    check: checkList(client, initiativeSpec),
    backfill: backfillList(client, initiativeSpec),
    changes: changesList(client, initiativeSpec),
    webhook: webhookList(client, initiativeSpec),
  });

const initiativeUpdateSpec = listSpec({
  connection: "initiativeUpdates",
  single: "initiativeUpdate",
  fields: `id created_at: createdAt updated_at: updatedAt archived_at: archivedAt
    initiative_id: initiative { id } user_id: user { id } body health url
    edited_at: editedAt comment_count: commentCount`,
  item: InitiativeUpdateObjectSchema,
  updatedAt: (update) => update.updated_at,
  rows: rowsOf((update) => ({ ...update, version: update.updated_at, _deleted: false })),
});

export const makeInitiativeUpdates = (client: LinearClientService) =>
  Resource.entity({
    name: "initiative_updates",
    rowSchema: InitiativeUpdateSchema,
    version: "version",

    check: checkList(client, initiativeUpdateSpec),
    backfill: backfillList(client, initiativeUpdateSpec),
    changes: changesList(client, initiativeUpdateSpec),
    webhook: webhookList(client, initiativeUpdateSpec),
  });

const initiativeLabelSpec = listSpec({
  connection: "initiativeLabels",
  fields: `id created_at: createdAt updated_at: updatedAt archived_at: archivedAt
    name description color is_group: isGroup parent_id: parent { id }
    creator_id: creator { id } retired_at: retiredAt`,
  item: InitiativeLabelObjectSchema,
  updatedAt: (label) => label.updated_at,
  rows: rowsOf((label) => ({ ...label, version: label.updated_at })),
});

export const makeInitiativeLabels = (client: LinearClientService) =>
  Resource.entity({
    name: "initiative_labels",
    rowSchema: InitiativeLabelSchema,
    version: "version",
    ...listSources(client, initiativeLabelSpec),
  });

const initiativeRelationSpec = listSpec({
  connection: "initiativeRelations",
  fields: `id created_at: createdAt updated_at: updatedAt archived_at: archivedAt
    initiative_id: initiative { id } related_initiative_id: relatedInitiative { id }
    sort_order: sortOrder user_id: user { id }`,
  item: InitiativeRelationObjectSchema,
  updatedAt: (relation) => relation.updated_at,
  rows: rowsOf((relation) => ({ ...relation, version: relation.updated_at })),
});

export const makeInitiativeRelations = (client: LinearClientService) =>
  Resource.entity({
    name: "initiative_relations",
    rowSchema: InitiativeRelationSchema,
    version: "version",

    check: checkList(client, initiativeRelationSpec),
    backfill: backfillList(client, initiativeRelationSpec),
    changes: changesList(client, initiativeRelationSpec),
  });

const initiativeToProjectSpec = listSpec({
  connection: "initiativeToProjects",
  fields: `id created_at: createdAt updated_at: updatedAt archived_at: archivedAt initiative_id: initiative { id } project_id: project { id } sort_order: sortOrder`,
  item: InitiativeToProjectObjectSchema,
  updatedAt: (link) => link.updated_at,
  rows: rowsOf((link) => ({ ...link, version: link.updated_at })),
});

export const makeInitiativeToProjects = (client: LinearClientService) =>
  Resource.entity({
    name: "initiative_to_projects",
    rowSchema: InitiativeToProjectSchema,
    version: "version",

    check: checkList(client, initiativeToProjectSpec),
    backfill: backfillList(client, initiativeToProjectSpec),
    changes: changesList(client, initiativeToProjectSpec),
  });

export const makeInitiativeHistory = (client: LinearClientService) => {
  const spec = nestedSpec(client, {
    parents: "initiatives",
    parent: "initiative",
    connection: "history",
    fields: "id created_at: createdAt updated_at: updatedAt archived_at: archivedAt entries",
    item: InitiativeHistoryObjectSchema,
    row: (entry, initiative) => ({
      ...entry,
      initiative_id: initiative.id,
      version: entry.updated_at,
    }),
  });
  return Resource.entity({
    name: "initiative_history",
    rowSchema: InitiativeHistorySchema,
    version: "version",

    check: checkList(client, spec),
    backfill: backfillList(client, spec),
    changes: changesList(client, spec),
  });
};

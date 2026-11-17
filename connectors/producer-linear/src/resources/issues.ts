import { Resource } from "@useairfoil/connector-kit";

import type { LinearClientService } from "../client/client";

import {
  AttachmentObjectSchema,
  AttachmentSchema,
  IssueLabelObjectSchema,
  IssueLabelSchema,
  IssueObjectSchema,
  IssueRelationObjectSchema,
  IssueRelationSchema,
  IssueSchema,
} from "../schemas/issues";
import {
  backfillList,
  changesList,
  checkList,
  listSources,
  listSpec,
  rowsOf,
  webhookList,
} from "./pages";

const issueFields = `
  id created_at: createdAt updated_at: updatedAt archived_at: archivedAt
  identifier number title description url branch_name: branchName
  priority priority_label: priorityLabel estimate due_date: dueDate
  creator_id: creator { id } assignee_id: assignee { id } delegate_id: delegate { id }
  snoozed_by_id: snoozedBy { id } state_id: state { id } team_id: team { id }
  project_id: project { id } project_milestone_id: projectMilestone { id }
  cycle_id: cycle { id } parent_id: parent { id } source_comment_id: sourceComment { id }
  external_user_creator_id: externalUserCreator { id }
  label_ids: labelIds previous_identifiers: previousIdentifiers
  started_at: startedAt completed_at: completedAt canceled_at: canceledAt
  started_triage_at: startedTriageAt triaged_at: triagedAt auto_closed_at: autoClosedAt
  auto_archived_at: autoArchivedAt added_to_cycle_at: addedToCycleAt
  added_to_project_at: addedToProjectAt added_to_team_at: addedToTeamAt
  snoozed_until_at: snoozedUntilAt sla_type: slaType sla_started_at: slaStartedAt
  sla_breaches_at: slaBreachesAt sla_medium_risk_at: slaMediumRiskAt sla_high_risk_at: slaHighRiskAt
  customer_ticket_count: customerTicketCount
  integration_source_type: integrationSourceType trashed`;

const issueSpec = listSpec({
  connection: "issues",
  single: "issue",
  fields: issueFields,
  item: IssueObjectSchema,
  updatedAt: (issue) => issue.updated_at,
  rows: rowsOf((issue) => ({ ...issue, version: issue.updated_at, _deleted: false })),
});

export const makeIssues = (client: LinearClientService) =>
  Resource.entity({
    name: "issues",
    rowSchema: IssueSchema,
    version: "version",

    check: checkList(client, issueSpec),
    backfill: backfillList(client, issueSpec),
    changes: changesList(client, issueSpec),
    webhook: webhookList(client, issueSpec),
  });

const issueRelationSpec = listSpec({
  connection: "issueRelations",
  fields: `id created_at: createdAt updated_at: updatedAt archived_at: archivedAt
    issue_id: issue { id } related_issue_id: relatedIssue { id } type`,
  item: IssueRelationObjectSchema,
  updatedAt: (relation) => relation.updated_at,
  rows: rowsOf((relation) => ({ ...relation, version: relation.updated_at })),
});

export const makeIssueRelations = (client: LinearClientService) =>
  Resource.entity({
    name: "issue_relations",
    rowSchema: IssueRelationSchema,
    version: "version",

    check: checkList(client, issueRelationSpec),
    backfill: backfillList(client, issueRelationSpec),
    changes: changesList(client, issueRelationSpec),
  });

const attachmentSpec = listSpec({
  connection: "attachments",
  single: "attachment",
  fields: `id created_at: createdAt updated_at: updatedAt archived_at: archivedAt
    issue_id: issue { id } creator_id: creator { id }
    external_user_creator_id: externalUserCreator { id }
    title subtitle url source_type: sourceType`,
  item: AttachmentObjectSchema,
  updatedAt: (attachment) => attachment.updated_at,
  rows: rowsOf((attachment) => ({
    ...attachment,
    version: attachment.updated_at,
    _deleted: false,
  })),
});

export const makeAttachments = (client: LinearClientService) =>
  Resource.entity({
    name: "attachments",
    rowSchema: AttachmentSchema,
    version: "version",

    check: checkList(client, attachmentSpec),
    backfill: backfillList(client, attachmentSpec),
    changes: changesList(client, attachmentSpec),
    webhook: webhookList(client, attachmentSpec),
  });

const issueLabelSpec = listSpec({
  connection: "issueLabels",
  single: "issueLabel",
  fields: `id created_at: createdAt updated_at: updatedAt archived_at: archivedAt
    name description color is_group: isGroup parent_id: parent { id } team_id: team { id }
    creator_id: creator { id } retired_at: retiredAt`,
  item: IssueLabelObjectSchema,
  updatedAt: (label) => label.updated_at,
  rows: rowsOf((label) => ({ ...label, version: label.updated_at, _deleted: false })),
});

export const makeIssueLabels = (client: LinearClientService) =>
  Resource.entity({
    name: "issue_labels",
    rowSchema: IssueLabelSchema,
    version: "version",

    ...listSources(client, issueLabelSpec),
    webhook: webhookList(client, issueLabelSpec),
  });

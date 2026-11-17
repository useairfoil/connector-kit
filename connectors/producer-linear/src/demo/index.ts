import { ConnectorApp, Demo, RuntimeConfig } from "@useairfoil/connector-kit";
import { Command } from "effect/cli";

import { CommentSchema } from "../schemas/comments";
import {
  CustomerNeedSchema,
  CustomerSchema,
  CustomerStatusSchema,
  CustomerTierSchema,
} from "../schemas/customers";
import { DocumentSchema } from "../schemas/documents";
import {
  InitiativeHistorySchema,
  InitiativeLabelSchema,
  InitiativeRelationSchema,
  InitiativeSchema,
  InitiativeToProjectSchema,
  InitiativeUpdateSchema,
} from "../schemas/initiatives";
import {
  AttachmentSchema,
  IssueHistorySchema,
  IssueLabelSchema,
  IssueRelationSchema,
  IssueSchema,
  IssueStateSpanSchema,
} from "../schemas/issues";
import {
  ProjectExternalLinkSchema,
  ProjectHistorySchema,
  ProjectLabelSchema,
  ProjectMilestoneSchema,
  ProjectRelationSchema,
  ProjectSchema,
  ProjectStatusSchema,
  ProjectUpdateSchema,
} from "../schemas/projects";
import {
  IssueToReleaseSchema,
  ReleaseHistorySchema,
  ReleaseNoteSchema,
  ReleasePipelineSchema,
  ReleaseSchema,
  ReleaseStageSchema,
} from "../schemas/releases";
import {
  CustomViewSchema,
  CycleSchema,
  ExternalUserSchema,
  TeamMembershipSchema,
  TeamSchema,
  TeamSlaRulesSchema,
  TemplateSchema,
  UserSchema,
  WorkflowStateSchema,
} from "../schemas/teams";
import { issueRows } from "./issues";
import { setupRows } from "./setup";

export const demo = Demo.define({
  name: "producer-linear",
  setup: {
    tables: [
      Demo.table({ name: "teams", rowSchema: TeamSchema, version: "version" }),
      Demo.table({ name: "workflow_states", rowSchema: WorkflowStateSchema, version: "version" }),
      Demo.table({ name: "users", rowSchema: UserSchema, version: "version" }),
      Demo.table({ name: "team_memberships", rowSchema: TeamMembershipSchema, version: "version" }),
      Demo.table({ name: "external_users", rowSchema: ExternalUserSchema, version: "version" }),
      Demo.table({ name: "issue_labels", rowSchema: IssueLabelSchema, version: "version" }),
      Demo.table({ name: "cycles", rowSchema: CycleSchema, version: "version" }),
      Demo.table({ name: "project_statuses", rowSchema: ProjectStatusSchema, version: "version" }),
      Demo.table({ name: "project_labels", rowSchema: ProjectLabelSchema, version: "version" }),
      Demo.table({ name: "projects", rowSchema: ProjectSchema, version: "version" }),
      Demo.table({
        name: "project_milestones",
        rowSchema: ProjectMilestoneSchema,
        version: "version",
      }),
      Demo.table({ name: "project_updates", rowSchema: ProjectUpdateSchema, version: "version" }),
      Demo.table({
        name: "project_relations",
        rowSchema: ProjectRelationSchema,
        version: "version",
      }),
      Demo.table({ name: "documents", rowSchema: DocumentSchema, version: "version" }),
      Demo.table({ name: "initiatives", rowSchema: InitiativeSchema, version: "version" }),
      Demo.table({
        name: "initiative_labels",
        rowSchema: InitiativeLabelSchema,
        version: "version",
      }),
      Demo.table({
        name: "initiative_updates",
        rowSchema: InitiativeUpdateSchema,
        version: "version",
      }),
      Demo.table({
        name: "initiative_relations",
        rowSchema: InitiativeRelationSchema,
        version: "version",
      }),
      Demo.table({
        name: "initiative_to_projects",
        rowSchema: InitiativeToProjectSchema,
        version: "version",
      }),
      Demo.table({
        name: "customer_statuses",
        rowSchema: CustomerStatusSchema,
        version: "version",
      }),
      Demo.table({ name: "customer_tiers", rowSchema: CustomerTierSchema, version: "version" }),
      Demo.table({ name: "customers", rowSchema: CustomerSchema, version: "version" }),
      Demo.table({
        name: "release_pipelines",
        rowSchema: ReleasePipelineSchema,
        version: "version",
      }),
      Demo.table({ name: "release_stages", rowSchema: ReleaseStageSchema, version: "version" }),
      Demo.table({ name: "releases", rowSchema: ReleaseSchema, version: "version" }),
      Demo.table({ name: "release_notes", rowSchema: ReleaseNoteSchema, version: "version" }),
      Demo.table({
        name: "project_external_links",
        rowSchema: ProjectExternalLinkSchema,
        version: "version",
      }),
      Demo.table({ name: "project_history", rowSchema: ProjectHistorySchema, version: "version" }),
      Demo.table({
        name: "initiative_history",
        rowSchema: InitiativeHistorySchema,
        version: "version",
      }),
      Demo.table({ name: "release_history", rowSchema: ReleaseHistorySchema, version: "version" }),
      Demo.table({ name: "templates", rowSchema: TemplateSchema, version: "version" }),
      Demo.table({ name: "team_sla_rules", rowSchema: TeamSlaRulesSchema, version: "version" }),
      Demo.table({ name: "custom_views", rowSchema: CustomViewSchema, version: "version" }),
    ],
    rows: setupRows,
  },
  group: {
    tables: [
      Demo.table({ name: "issues", rowSchema: IssueSchema, version: "version" }),
      Demo.table({ name: "issue_history", rowSchema: IssueHistorySchema, version: "version" }),
      Demo.table({
        name: "issue_state_spans",
        rowSchema: IssueStateSpanSchema,
        version: "version",
      }),
      Demo.table({ name: "comments", rowSchema: CommentSchema, version: "version" }),
      Demo.table({ name: "issue_relations", rowSchema: IssueRelationSchema, version: "version" }),
      Demo.table({ name: "attachments", rowSchema: AttachmentSchema, version: "version" }),
      Demo.table({ name: "customer_needs", rowSchema: CustomerNeedSchema, version: "version" }),
      Demo.table({
        name: "issue_to_releases",
        rowSchema: IssueToReleaseSchema,
        version: "version",
      }),
    ],
    rows: issueRows,
  },
});

export const demoCommand = ConnectorApp.makeDemoCommand(demo).pipe(
  Command.provide(RuntimeConfig.layerHosted()),
);

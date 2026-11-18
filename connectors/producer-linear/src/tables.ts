import type { Schema } from "effect";

import { CommentSchema } from "./schemas/comments";
import {
  CustomerNeedSchema,
  CustomerSchema,
  CustomerStatusSchema,
  CustomerTierSchema,
} from "./schemas/customers";
import { DocumentSchema } from "./schemas/documents";
import {
  InitiativeHistorySchema,
  InitiativeLabelSchema,
  InitiativeRelationSchema,
  InitiativeSchema,
  InitiativeToProjectSchema,
  InitiativeUpdateSchema,
} from "./schemas/initiatives";
import {
  AttachmentSchema,
  IssueHistorySchema,
  IssueLabelSchema,
  IssueRelationSchema,
  IssueSchema,
  IssueStateSpanSchema,
} from "./schemas/issues";
import {
  ProjectExternalLinkSchema,
  ProjectHistorySchema,
  ProjectLabelSchema,
  ProjectMilestoneSchema,
  ProjectRelationSchema,
  ProjectSchema,
  ProjectStatusSchema,
  ProjectUpdateSchema,
} from "./schemas/projects";
import {
  IssueToReleaseSchema,
  ReleaseHistorySchema,
  ReleaseNoteSchema,
  ReleasePipelineSchema,
  ReleaseSchema,
  ReleaseStageSchema,
} from "./schemas/releases";
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
} from "./schemas/teams";

export const tableSchemas: Readonly<Record<string, Schema.Top>> = {
  issues: IssueSchema,
  issue_history: IssueHistorySchema,
  comments: CommentSchema,
  issue_relations: IssueRelationSchema,
  attachments: AttachmentSchema,
  issue_labels: IssueLabelSchema,
  workflow_states: WorkflowStateSchema,
  teams: TeamSchema,
  team_memberships: TeamMembershipSchema,
  users: UserSchema,
  external_users: ExternalUserSchema,
  cycles: CycleSchema,
  projects: ProjectSchema,
  project_milestones: ProjectMilestoneSchema,
  project_updates: ProjectUpdateSchema,
  project_statuses: ProjectStatusSchema,
  project_labels: ProjectLabelSchema,
  project_relations: ProjectRelationSchema,
  initiatives: InitiativeSchema,
  initiative_updates: InitiativeUpdateSchema,
  initiative_labels: InitiativeLabelSchema,
  initiative_relations: InitiativeRelationSchema,
  initiative_to_projects: InitiativeToProjectSchema,
  documents: DocumentSchema,
  customers: CustomerSchema,
  customer_needs: CustomerNeedSchema,
  customer_statuses: CustomerStatusSchema,
  customer_tiers: CustomerTierSchema,
  releases: ReleaseSchema,
  release_notes: ReleaseNoteSchema,
  release_pipelines: ReleasePipelineSchema,
  release_stages: ReleaseStageSchema,
  issue_to_releases: IssueToReleaseSchema,
  issue_state_spans: IssueStateSpanSchema,
  project_history: ProjectHistorySchema,
  project_external_links: ProjectExternalLinkSchema,
  initiative_history: InitiativeHistorySchema,
  release_history: ReleaseHistorySchema,
  templates: TemplateSchema,
  custom_views: CustomViewSchema,
  team_sla_rules: TeamSlaRulesSchema,
};

declare const __COMMIT_SHA__: string | undefined;

export const commitSha = typeof __COMMIT_SHA__ === "undefined" ? undefined : __COMMIT_SHA__;

export * as LinearClient from "./client/client";
export * as LinearConnector from "./connector";
export { manifest } from "./manifest";
export { webhookPath } from "./webhook/route";
export type { Comment } from "./schemas/comments";
export { CommentSchema } from "./schemas/comments";
export type { Customer, CustomerNeed, CustomerStatus, CustomerTier } from "./schemas/customers";
export {
  CustomerNeedSchema,
  CustomerSchema,
  CustomerStatusSchema,
  CustomerTierSchema,
} from "./schemas/customers";
export type { Document } from "./schemas/documents";
export { DocumentSchema } from "./schemas/documents";
export type {
  Initiative,
  InitiativeLabel,
  InitiativeRelation,
  InitiativeToProject,
  InitiativeUpdate,
} from "./schemas/initiatives";
export {
  InitiativeLabelSchema,
  InitiativeRelationSchema,
  InitiativeSchema,
  InitiativeToProjectSchema,
  InitiativeUpdateSchema,
} from "./schemas/initiatives";
export type { Attachment, Issue, IssueHistory, IssueLabel, IssueRelation } from "./schemas/issues";
export {
  AttachmentSchema,
  IssueHistorySchema,
  IssueLabelSchema,
  IssueRelationSchema,
  IssueSchema,
} from "./schemas/issues";
export type {
  Project,
  ProjectLabel,
  ProjectMilestone,
  ProjectRelation,
  ProjectStatus,
  ProjectUpdate,
} from "./schemas/projects";
export {
  ProjectLabelSchema,
  ProjectMilestoneSchema,
  ProjectRelationSchema,
  ProjectSchema,
  ProjectStatusSchema,
  ProjectUpdateSchema,
} from "./schemas/projects";
export type {
  IssueToRelease,
  Release,
  ReleaseNote,
  ReleasePipeline,
  ReleaseStage,
} from "./schemas/releases";
export {
  IssueToReleaseSchema,
  ReleaseNoteSchema,
  ReleasePipelineSchema,
  ReleaseSchema,
  ReleaseStageSchema,
} from "./schemas/releases";
export type {
  Cycle,
  ExternalUser,
  Team,
  TeamMembership,
  User,
  WorkflowState,
} from "./schemas/teams";
export {
  CycleSchema,
  ExternalUserSchema,
  TeamMembershipSchema,
  TeamSchema,
  UserSchema,
  WorkflowStateSchema,
} from "./schemas/teams";

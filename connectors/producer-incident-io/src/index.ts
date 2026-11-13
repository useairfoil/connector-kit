declare const __COMMIT_SHA__: string | undefined;

export const commitSha = typeof __COMMIT_SHA__ === "undefined" ? undefined : __COMMIT_SHA__;

export * as IncidentIoClient from "./client/client";
export * as IncidentIoConnector from "./connector";
export { manifest } from "./manifest";
export { webhookPath } from "./webhook/route";
export type {
  ActivityLogEntry,
  Attachment,
  CallSession,
  Incident,
  IncidentAlert,
  IncidentUpdate,
  Participant,
  ParticipantWorkload,
  Relationship,
  TimelineItem,
} from "./schemas/incidents";
export {
  ActivityLogEntrySchema,
  AttachmentSchema,
  CallSessionSchema,
  IncidentAlertSchema,
  IncidentSchema,
  IncidentUpdateSchema,
  ParticipantSchema,
  ParticipantWorkloadSchema,
  RelationshipSchema,
  TimelineItemSchema,
} from "./schemas/incidents";
export type { Action, FollowUp, PostmortemDocument } from "./schemas/tasks";
export { ActionSchema, FollowUpSchema, PostmortemDocumentSchema } from "./schemas/tasks";
export type {
  Alert,
  AlertAttribute,
  AlertNote,
  AlertRoute,
  AlertSource,
  Escalation,
  EscalationPath,
  MaintenanceWindow,
  NotificationPause,
  Schedule,
  ScheduleOverride,
  ScheduleShift,
} from "./schemas/on-call";
export {
  AlertAttributeSchema,
  AlertNoteSchema,
  AlertRouteSchema,
  AlertSchema,
  AlertSourceSchema,
  EscalationPathSchema,
  EscalationSchema,
  MaintenanceWindowSchema,
  NotificationPauseSchema,
  ScheduleOverrideSchema,
  ScheduleSchema,
  ScheduleShiftSchema,
} from "./schemas/on-call";
export type { CatalogEntry, CatalogType } from "./schemas/catalog";
export { CatalogEntrySchema, CatalogTypeSchema } from "./schemas/catalog";
export type {
  CustomField,
  CustomFieldOption,
  IncidentRole,
  IncidentStatus,
  IncidentTimestamp,
  IncidentType,
  Policy,
  PolicyFinding,
  Severity,
  StatusPage,
  StatusPageComponent,
  StatusPageIncident,
  StatusPageMaintenance,
  Team,
  User,
  Workflow,
  WorkflowRun,
} from "./schemas/settings";
export {
  CustomFieldOptionSchema,
  CustomFieldSchema,
  IncidentRoleSchema,
  IncidentStatusSchema,
  IncidentTimestampSchema,
  IncidentTypeSchema,
  PolicyFindingSchema,
  PolicySchema,
  SeveritySchema,
  StatusPageComponentSchema,
  StatusPageIncidentSchema,
  StatusPageMaintenanceSchema,
  StatusPageSchema,
  TeamSchema,
  UserSchema,
  WorkflowRunSchema,
  WorkflowSchema,
} from "./schemas/settings";

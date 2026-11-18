import { ConnectorApp, Demo, RuntimeConfig } from "@useairfoil/connector-kit";
import { Command } from "effect/cli";

import { CatalogEntrySchema, CatalogTypeSchema } from "../schemas/catalog";
import {
  ActivityLogEntrySchema,
  AttachmentSchema,
  CallSessionSchema,
  CallTranscriptEntrySchema,
  IncidentAlertSchema,
  IncidentSchema,
  IncidentUpdateSchema,
  ParticipantSchema,
  ParticipantWorkloadSchema,
  RelationshipSchema,
  TimelineItemSchema,
} from "../schemas/incidents";
import {
  AlertAttributeSchema,
  AlertNoteSchema,
  AlertRouteSchema,
  AlertSchema,
  AlertSourceSchema,
  AlertTagSchema,
  CallRouteSchema,
  EscalationPathSchema,
  EscalationSchema,
  MaintenanceWindowSchema,
  NotificationPauseSchema,
  PayConfigSchema,
  PayReportSchema,
  ScheduleOverrideSchema,
  ScheduleSchema,
  ScheduleShiftSchema,
} from "../schemas/on-call";
import {
  CustomFieldOptionSchema,
  CustomFieldSchema,
  IncidentRoleSchema,
  IncidentStatusSchema,
  IncidentTemplateSchema,
  IncidentTimestampSchema,
  IncidentTypeSchema,
  PolicyFindingSchema,
  PolicySchema,
  SeveritySchema,
  StatusPageAvailabilitySchema,
  StatusPageComponentSchema,
  StatusPageGroupSchema,
  StatusPageIncidentLinksSchema,
  StatusPageIncidentSchema,
  StatusPageMaintenanceSchema,
  StatusPageSchema,
  TeamSchema,
  UserSchema,
  WorkflowRunSchema,
  WorkflowSchema,
} from "../schemas/settings";
import {
  ActionSchema,
  FollowUpSchema,
  PostmortemContentSchema,
  PostmortemDocumentSchema,
} from "../schemas/tasks";
import { incidentRows } from "./incidents";
import { setupRows } from "./setup";
import { json } from "./shared";

export const demo = Demo.define({
  name: "producer-incident-io",
  setup: {
    tables: [
      Demo.table({ name: "users", rowSchema: UserSchema, version: "version" }),
      Demo.table({ name: "teams", rowSchema: TeamSchema, version: "version" }),
      Demo.table({ name: "catalog_types", rowSchema: CatalogTypeSchema, version: "version" }),
      Demo.table({ name: "catalog_entries", rowSchema: CatalogEntrySchema, version: "version" }),
      Demo.table({ name: "severities", rowSchema: SeveritySchema, version: "version" }),
      Demo.table({
        name: "incident_statuses",
        rowSchema: IncidentStatusSchema,
        version: "version",
      }),
      Demo.table({ name: "incident_types", rowSchema: IncidentTypeSchema, version: "version" }),
      Demo.table({ name: "incident_roles", rowSchema: IncidentRoleSchema, version: "version" }),
      Demo.table({
        name: "incident_timestamps",
        rowSchema: IncidentTimestampSchema,
        version: "version",
      }),
      Demo.table({ name: "custom_fields", rowSchema: CustomFieldSchema, version: "version" }),
      Demo.table({
        name: "custom_field_options",
        rowSchema: CustomFieldOptionSchema,
        version: "version",
      }),
      Demo.table({ name: "alert_sources", rowSchema: AlertSourceSchema, version: "version" }),
      Demo.table({ name: "call_routes", rowSchema: CallRouteSchema, version: "version" }),
      Demo.table({
        name: "incident_templates",
        rowSchema: IncidentTemplateSchema,
        version: "version",
      }),
      Demo.table({ name: "pay_configs", rowSchema: PayConfigSchema, version: "version" }),
      Demo.table({ name: "pay_reports", rowSchema: PayReportSchema, version: "version" }),
      Demo.table({
        name: "status_page_groups",
        rowSchema: StatusPageGroupSchema,
        version: "version",
      }),
      Demo.table({
        name: "status_page_availability",
        rowSchema: StatusPageAvailabilitySchema,
        version: "version",
      }),
      Demo.table({ name: "alert_tags", rowSchema: AlertTagSchema, version: "version" }),
      Demo.table({ name: "alert_routes", rowSchema: AlertRouteSchema, version: "version" }),
      Demo.table({ name: "alert_attributes", rowSchema: AlertAttributeSchema, version: "version" }),
      Demo.table({ name: "escalation_paths", rowSchema: EscalationPathSchema, version: "version" }),
      Demo.table({ name: "schedules", rowSchema: ScheduleSchema, version: "version" }),
      Demo.table({ name: "schedule_shifts", rowSchema: ScheduleShiftSchema, version: "version" }),
      Demo.table({
        name: "schedule_overrides",
        rowSchema: ScheduleOverrideSchema,
        version: "version",
      }),
      Demo.table({
        name: "on_call_notification_pauses",
        rowSchema: NotificationPauseSchema,
        version: "version",
      }),
      Demo.table({
        name: "maintenance_windows",
        rowSchema: MaintenanceWindowSchema,
        version: "version",
      }),
      Demo.table({ name: "workflows", rowSchema: WorkflowSchema, version: "version" }),
      Demo.table({ name: "status_pages", rowSchema: StatusPageSchema, version: "version" }),
      Demo.table({
        name: "status_page_components",
        rowSchema: StatusPageComponentSchema,
        version: "version",
      }),
      Demo.table({
        name: "status_page_maintenances",
        rowSchema: StatusPageMaintenanceSchema,
        version: "version",
      }),
      Demo.table({ name: "policies", rowSchema: PolicySchema, version: "version" }),
    ],
    rows: (context) => {
      const rows = setupRows(context);
      const version = context.now;
      const stamp = { version, created_at: version, updated_at: version };
      return {
        ...rows,
        status_page_groups: rows.status_pages.map((page) => ({
          id: `group-${page.id}`,
          name: "Core services",
          description: null,
          hidden: false,
          display_aggregated_uptime: true,
          status_page_id: page.id,
          sub_page_id: null,
          component_ids: rows.status_page_components.map(({ id }) => id),
          version,
        })),
        status_page_availability: rows.status_pages.flatMap((page) =>
          rows.status_page_components.map((component) => ({
            id: `availability-${component.id}`,
            status_page_id: page.id,
            component_id: component.id,
            start_at: new Date(version.getTime() - 86_400_000),
            end_at: version,
            data_available_since: new Date(version.getTime() - 30 * 86_400_000),
            availability_percent: "99.95",
            version,
          })),
        ),
        call_routes: [
          {
            ...stamp,
            id: "route-1",
            name: "Operations desk",
            current_state: "active",
            country_code: "US",
            custom_language: "en-US",
            phone_number: "+18005550100",
            phone_number_type: "toll_free",
            responder_caller_id: "route_number",
            use_caller_allowlist: true,
            path: json([{ type: "escalation_path", escalation_path_id: "path-1" }]),
            options: null,
          },
        ],
        incident_templates: [
          {
            ...stamp,
            id: "template-1",
            name: "Payments incident",
            template: '{"summary":{"autogenerated":false}}',
          },
        ],
        pay_configs: [
          {
            ...stamp,
            id: "pay-config-1",
            name: "Weekday on call",
            timezone: "America/New_York",
            currency: "USD",
            base_rate_cents: 1000n,
            rate_time_unit: "hour",
            weekly_rules: "[]",
            one_off_rules: "[]",
            published_at: version,
          },
        ],
        pay_reports: [
          {
            ...stamp,
            id: "pay-report-1",
            name: "October on-call pay",
            start_date: "2026-10-01",
            end_date: "2026-10-31",
            schedule_ids: rows.schedules.map(({ id }) => id),
            status: "complete",
            overlapping_shifts: "count_once",
            unpaid_shifts: "exclude",
            total_duration_seconds: 7200n,
            total_pay_by_currency: '{"USD":2000}',
            published_at: version,
          },
        ],
      };
    },
  },
  group: {
    tables: [
      Demo.table({ name: "incidents", rowSchema: IncidentSchema, version: "version" }),
      Demo.table({ name: "incident_updates", rowSchema: IncidentUpdateSchema, version: "version" }),
      Demo.table({
        name: "incident_timeline_items",
        rowSchema: TimelineItemSchema,
        version: "version",
      }),
      Demo.table({
        name: "incident_activity_log_entries",
        rowSchema: ActivityLogEntrySchema,
        version: "version",
      }),
      Demo.table({
        name: "incident_participants",
        rowSchema: ParticipantSchema,
        version: "version",
      }),
      Demo.table({
        name: "incident_relationships",
        rowSchema: RelationshipSchema,
        version: "version",
      }),
      Demo.table({ name: "incident_attachments", rowSchema: AttachmentSchema, version: "version" }),
      Demo.table({ name: "incident_alerts", rowSchema: IncidentAlertSchema, version: "version" }),
      Demo.table({
        name: "incident_call_sessions",
        rowSchema: CallSessionSchema,
        version: "version",
      }),
      Demo.table({
        name: "incident_participant_workloads",
        rowSchema: ParticipantWorkloadSchema,
        version: "version",
      }),
      Demo.table({
        name: "postmortem_contents",
        rowSchema: PostmortemContentSchema,
        version: "version",
      }),
      Demo.table({
        name: "postmortem_documents",
        rowSchema: PostmortemDocumentSchema,
        version: "version",
      }),
      Demo.table({
        name: "status_page_incident_links",
        rowSchema: StatusPageIncidentLinksSchema,
        version: "version",
      }),
      Demo.table({ name: "follow_ups", rowSchema: FollowUpSchema, version: "version" }),
      Demo.table({ name: "actions", rowSchema: ActionSchema, version: "version" }),
      Demo.table({ name: "alerts", rowSchema: AlertSchema, version: "version" }),
      Demo.table({
        name: "incident_call_transcripts",
        rowSchema: CallTranscriptEntrySchema,
        version: "version",
      }),
      Demo.table({ name: "alert_notes", rowSchema: AlertNoteSchema, version: "version" }),
      Demo.table({ name: "escalations", rowSchema: EscalationSchema, version: "version" }),
      Demo.table({ name: "workflow_runs", rowSchema: WorkflowRunSchema, version: "version" }),
      Demo.table({
        name: "status_page_incidents",
        rowSchema: StatusPageIncidentSchema,
        version: "version",
      }),
      Demo.table({ name: "policy_findings", rowSchema: PolicyFindingSchema, version: "version" }),
    ],
    rows: (index, context) => {
      const rows = incidentRows(index, context);
      return {
        ...rows,
        status_page_incident_links: rows.status_page_incidents.map((incident) => ({
          id: incident.id,
          status_page_id: incident.status_page_id,
          version: context.now,
          incidents: rows.incidents
            .slice(0, 1)
            .map(({ id }) => ({ id, linked_at: incident.published_at })),
        })),
        incident_call_transcripts: rows.incident_call_sessions.map((session) => ({
          id: `transcript-${session.id}`,
          call_session_id: session.id,
          incident_id: session.incident_id,
          participant_name: "Incident lead",
          timestamp: session.started_at,
          content: "We are checking the payment queue.",
          medium: "audio",
          version: context.now,
        })),
      };
    },
  },
});

export const demoCommand = ConnectorApp.makeDemoCommand(demo).pipe(
  Command.provide(RuntimeConfig.layerHosted()),
);

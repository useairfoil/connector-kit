import * as Iceberg from "@useairfoil/connector-kit/iceberg";
import * as Manifest from "@useairfoil/connector-kit/manifest";

import { tableSchemas } from "./tables";
import { webhookSubscriptions } from "./webhook/events";

const connectionFields = {
  apiKey: Manifest.secret({
    runtimeKey: "INCIDENT_IO_API_KEY",
    description: "incident.io API key with read-only roles, for example inc_...",
  }),
};

const webhookFields = {
  webhookSecret: Manifest.secret({
    runtimeKey: "INCIDENT_IO_WEBHOOK_SECRET",
    description: "Signing secret of the incident.io webhook endpoint, for example whsec_...",
  }),
};

export const IncidentIoConnectionConfigDef = Manifest.defineConfig(connectionFields);
export const IncidentIoWebhookConfigDef = Manifest.defineConfig(webhookFields);
export const IncidentIoConfigDef = Manifest.defineConfig({
  ...connectionFields,
  ...webhookFields,
});

export type IncidentIoConnectionConfig = Manifest.ConfigValuesOf<
  typeof IncidentIoConnectionConfigDef
>;
export type IncidentIoWebhookConfig = Manifest.ConfigValuesOf<typeof IncidentIoWebhookConfigDef>;
export type IncidentIoConfig = Manifest.ConfigValuesOf<typeof IncidentIoConfigDef>;

const capabilities = ["backfill", "changes"] as const;
const withWebhook = ["backfill", "changes", "webhook"] as const;

export const manifest = Manifest.define({
  name: "producer-incident-io",
  title: "incident.io",
  webhook: {
    path: "/webhook",
    requirement: "required",
    events: webhookSubscriptions,
    configFields: ["webhookSecret"],
    documentationUrl: "https://api-docs.incident.io/#section/Webhooks",
  },
  config: IncidentIoConfigDef.spec,
  resources: [
    {
      name: "incidents",
      description: Iceberg.resolveDescription(tableSchemas.incidents),
      capabilities: withWebhook,
    },
    {
      name: "incident_updates",
      description: Iceberg.resolveDescription(tableSchemas.incident_updates),
      capabilities: withWebhook,
    },
    {
      name: "incident_timeline_items",
      description: Iceberg.resolveDescription(tableSchemas.incident_timeline_items),
      capabilities: withWebhook,
    },
    {
      name: "incident_activity_log_entries",
      description: Iceberg.resolveDescription(tableSchemas.incident_activity_log_entries),
      capabilities: withWebhook,
    },
    {
      name: "incident_participants",
      description: Iceberg.resolveDescription(tableSchemas.incident_participants),
      capabilities: withWebhook,
    },
    {
      name: "incident_relationships",
      description: Iceberg.resolveDescription(tableSchemas.incident_relationships),
      capabilities: withWebhook,
    },
    {
      name: "incident_attachments",
      description: Iceberg.resolveDescription(tableSchemas.incident_attachments),
      capabilities: withWebhook,
    },
    {
      name: "incident_alerts",
      description: Iceberg.resolveDescription(tableSchemas.incident_alerts),
      capabilities: withWebhook,
    },
    {
      name: "incident_call_sessions",
      description: Iceberg.resolveDescription(tableSchemas.incident_call_sessions),
      capabilities,
    },
    {
      name: "incident_call_transcripts",
      description: Iceberg.resolveDescription(tableSchemas.incident_call_transcripts),
      capabilities,
    },
    {
      name: "incident_participant_workloads",
      description: Iceberg.resolveDescription(tableSchemas.incident_participant_workloads),
      capabilities,
    },
    {
      name: "postmortem_documents",
      description: Iceberg.resolveDescription(tableSchemas.postmortem_documents),
      capabilities: withWebhook,
    },
    {
      name: "follow_ups",
      description: Iceberg.resolveDescription(tableSchemas.follow_ups),
      capabilities: withWebhook,
    },
    {
      name: "actions",
      description: Iceberg.resolveDescription(tableSchemas.actions),
      capabilities: withWebhook,
    },
    {
      name: "alerts",
      description: Iceberg.resolveDescription(tableSchemas.alerts),
      capabilities: withWebhook,
    },
    {
      name: "alert_notes",
      description: Iceberg.resolveDescription(tableSchemas.alert_notes),
      capabilities,
    },
    {
      name: "alert_sources",
      description: Iceberg.resolveDescription(tableSchemas.alert_sources),
      capabilities,
    },
    {
      name: "alert_tags",
      description: Iceberg.resolveDescription(tableSchemas.alert_tags),
      capabilities,
    },
    {
      name: "postmortem_contents",
      description: Iceberg.resolveDescription(tableSchemas.postmortem_contents),
      capabilities,
    },
    {
      name: "call_routes",
      description: Iceberg.resolveDescription(tableSchemas.call_routes),
      capabilities,
    },
    {
      name: "incident_templates",
      description: Iceberg.resolveDescription(tableSchemas.incident_templates),
      capabilities,
    },
    {
      name: "pay_configs",
      description: Iceberg.resolveDescription(tableSchemas.pay_configs),
      capabilities,
    },
    {
      name: "pay_reports",
      description: Iceberg.resolveDescription(tableSchemas.pay_reports),
      capabilities,
    },

    {
      name: "alert_routes",

      description: Iceberg.resolveDescription(tableSchemas.alert_routes),

      capabilities,
    },
    {
      name: "alert_attributes",
      description: Iceberg.resolveDescription(tableSchemas.alert_attributes),
      capabilities,
    },
    {
      name: "escalations",
      description: Iceberg.resolveDescription(tableSchemas.escalations),
      capabilities: withWebhook,
    },
    {
      name: "escalation_paths",
      description: Iceberg.resolveDescription(tableSchemas.escalation_paths),
      capabilities,
    },
    {
      name: "schedules",
      description: Iceberg.resolveDescription(tableSchemas.schedules),
      capabilities: withWebhook,
    },
    {
      name: "schedule_shifts",
      description: Iceberg.resolveDescription(tableSchemas.schedule_shifts),
      capabilities: withWebhook,
    },
    {
      name: "schedule_overrides",
      description: Iceberg.resolveDescription(tableSchemas.schedule_overrides),
      capabilities,
    },
    {
      name: "on_call_notification_pauses",
      description: Iceberg.resolveDescription(tableSchemas.on_call_notification_pauses),
      capabilities,
    },
    {
      name: "maintenance_windows",
      description: Iceberg.resolveDescription(tableSchemas.maintenance_windows),
      capabilities,
    },
    {
      name: "catalog_types",
      description: Iceberg.resolveDescription(tableSchemas.catalog_types),
      capabilities,
    },
    {
      name: "catalog_entries",
      description: Iceberg.resolveDescription(tableSchemas.catalog_entries),
      capabilities,
    },
    {
      name: "users",
      description: Iceberg.resolveDescription(tableSchemas.users),
      capabilities,
    },
    {
      name: "teams",
      description: Iceberg.resolveDescription(tableSchemas.teams),
      capabilities,
    },
    {
      name: "severities",
      description: Iceberg.resolveDescription(tableSchemas.severities),
      capabilities,
    },
    {
      name: "incident_statuses",
      description: Iceberg.resolveDescription(tableSchemas.incident_statuses),
      capabilities,
    },
    {
      name: "incident_types",
      description: Iceberg.resolveDescription(tableSchemas.incident_types),
      capabilities,
    },
    {
      name: "incident_roles",
      description: Iceberg.resolveDescription(tableSchemas.incident_roles),
      capabilities,
    },
    {
      name: "incident_timestamps",
      description: Iceberg.resolveDescription(tableSchemas.incident_timestamps),
      capabilities,
    },
    {
      name: "custom_fields",
      description: Iceberg.resolveDescription(tableSchemas.custom_fields),
      capabilities,
    },
    {
      name: "custom_field_options",
      description: Iceberg.resolveDescription(tableSchemas.custom_field_options),
      capabilities,
    },
    {
      name: "workflows",
      description: Iceberg.resolveDescription(tableSchemas.workflows),
      capabilities,
    },
    {
      name: "workflow_runs",
      description: Iceberg.resolveDescription(tableSchemas.workflow_runs),
      capabilities,
    },
    {
      name: "status_pages",
      description: Iceberg.resolveDescription(tableSchemas.status_pages),
      capabilities,
    },
    {
      name: "status_page_components",
      description: Iceberg.resolveDescription(tableSchemas.status_page_components),
      capabilities,
    },
    {
      name: "status_page_incidents",
      description: Iceberg.resolveDescription(tableSchemas.status_page_incidents),
      capabilities: withWebhook,
    },
    {
      name: "status_page_maintenances",
      description: Iceberg.resolveDescription(tableSchemas.status_page_maintenances),
      capabilities,
    },
    {
      name: "policies",
      description: Iceberg.resolveDescription(tableSchemas.policies),
      capabilities,
    },
    {
      name: "policy_findings",
      description: Iceberg.resolveDescription(tableSchemas.policy_findings),
      capabilities,
    },
    {
      name: "status_page_groups",
      description: Iceberg.resolveDescription(tableSchemas.status_page_groups),
      capabilities,
    },
    {
      name: "status_page_availability",
      description: Iceberg.resolveDescription(tableSchemas.status_page_availability),
      capabilities,
    },
    {
      name: "status_page_incident_links",
      description: Iceberg.resolveDescription(tableSchemas.status_page_incident_links),
      capabilities,
    },
  ],
});

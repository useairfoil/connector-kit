import * as Manifest from "@useairfoil/connector-kit/manifest";

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
    { name: "incidents", capabilities: withWebhook },
    { name: "incident_updates", capabilities: withWebhook },
    { name: "incident_timeline_items", capabilities: withWebhook },
    { name: "incident_activity_log_entries", capabilities: withWebhook },
    { name: "incident_participants", capabilities: withWebhook },
    { name: "incident_relationships", capabilities: withWebhook },
    { name: "incident_attachments", capabilities: withWebhook },
    { name: "incident_alerts", capabilities: withWebhook },
    { name: "incident_call_sessions", capabilities },
    { name: "incident_participant_workloads", capabilities },
    { name: "postmortem_documents", capabilities: withWebhook },
    { name: "follow_ups", capabilities: withWebhook },
    { name: "actions", capabilities: withWebhook },
    { name: "alerts", capabilities: withWebhook },
    { name: "alert_notes", capabilities },
    { name: "alert_sources", capabilities },
    { name: "alert_routes", capabilities },
    { name: "alert_attributes", capabilities },
    { name: "escalations", capabilities: withWebhook },
    { name: "escalation_paths", capabilities },
    { name: "schedules", capabilities: withWebhook },
    { name: "schedule_shifts", capabilities: withWebhook },
    { name: "schedule_overrides", capabilities },
    { name: "on_call_notification_pauses", capabilities },
    { name: "maintenance_windows", capabilities },
    { name: "catalog_types", capabilities },
    { name: "catalog_entries", capabilities },
    { name: "users", capabilities },
    { name: "teams", capabilities },
    { name: "severities", capabilities },
    { name: "incident_statuses", capabilities },
    { name: "incident_types", capabilities },
    { name: "incident_roles", capabilities },
    { name: "incident_timestamps", capabilities },
    { name: "custom_fields", capabilities },
    { name: "custom_field_options", capabilities },
    { name: "workflows", capabilities },
    { name: "workflow_runs", capabilities },
    { name: "status_pages", capabilities },
    { name: "status_page_components", capabilities },
    { name: "status_page_incidents", capabilities: withWebhook },
    { name: "status_page_maintenances", capabilities },
    { name: "policies", capabilities },
    { name: "policy_findings", capabilities },
  ],
});

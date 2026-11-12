export const webhookEvents = {
  incident_incident_created_v2: "incident.incident_created_v2",
  incident_incident_updated_v2: "incident.incident_updated_v2",
  incident_incident_status_updated_v2: "incident.incident_status_updated_v2",
  incident_follow_up_created_v2: "incident.follow_up_created_v2",
  incident_follow_up_updated_v2: "incident.follow_up_updated_v2",
  incident_action_created_v1: "incident.action_created_v1",
  incident_action_updated_v1: "incident.action_updated_v1",
  incident_postmortem_document_status_updated_v1: "incident.postmortem_document_status_updated_v1",
  alert_alert_created_v1: "alert.alert_created_v1",
  alert_alert_resolved_v1: "alert.alert_resolved_v1",
  escalation_escalation_created_v1: "escalation.escalation_created_v1",
  escalation_escalation_status_updated_v1: "escalation.escalation_status_updated_v1",
  schedule_created_v1: "schedule.created_v1",
  schedule_updated_v1: "schedule.updated_v1",
  schedule_deleted_v1: "schedule.deleted_v1",
  schedule_shift_change_v1: "schedule.shift_change_v1",
  status_page_incident_update_shared_v1: "status_page_incident.update_shared_v1",
} as const;

export const webhookSubscriptions = [
  {
    resource: "incidents",
    types: [
      webhookEvents.incident_incident_created_v2,
      webhookEvents.incident_incident_updated_v2,
      webhookEvents.incident_incident_status_updated_v2,
    ],
  },
  {
    resource: "incident_updates",
    types: [
      webhookEvents.incident_incident_created_v2,
      webhookEvents.incident_incident_updated_v2,
      webhookEvents.incident_incident_status_updated_v2,
    ],
  },
  {
    resource: "incident_timeline_items",
    types: [
      webhookEvents.incident_incident_created_v2,
      webhookEvents.incident_incident_updated_v2,
      webhookEvents.incident_incident_status_updated_v2,
    ],
  },
  {
    resource: "incident_activity_log_entries",
    types: [
      webhookEvents.incident_incident_created_v2,
      webhookEvents.incident_incident_updated_v2,
      webhookEvents.incident_incident_status_updated_v2,
    ],
  },
  {
    resource: "incident_participants",
    types: [
      webhookEvents.incident_incident_created_v2,
      webhookEvents.incident_incident_updated_v2,
      webhookEvents.incident_incident_status_updated_v2,
    ],
  },
  {
    resource: "incident_relationships",
    types: [
      webhookEvents.incident_incident_created_v2,
      webhookEvents.incident_incident_updated_v2,
      webhookEvents.incident_incident_status_updated_v2,
    ],
  },
  {
    resource: "incident_attachments",
    types: [
      webhookEvents.incident_incident_created_v2,
      webhookEvents.incident_incident_updated_v2,
      webhookEvents.incident_incident_status_updated_v2,
    ],
  },
  {
    resource: "incident_alerts",
    types: [
      webhookEvents.incident_incident_created_v2,
      webhookEvents.incident_incident_updated_v2,
      webhookEvents.incident_incident_status_updated_v2,
    ],
  },
  {
    resource: "follow_ups",
    types: [
      webhookEvents.incident_follow_up_created_v2,
      webhookEvents.incident_follow_up_updated_v2,
    ],
  },
  {
    resource: "actions",
    types: [webhookEvents.incident_action_created_v1, webhookEvents.incident_action_updated_v1],
  },
  {
    resource: "postmortem_documents",
    types: [webhookEvents.incident_postmortem_document_status_updated_v1],
  },
  {
    resource: "alerts",
    types: [webhookEvents.alert_alert_created_v1, webhookEvents.alert_alert_resolved_v1],
  },
  {
    resource: "escalations",
    types: [
      webhookEvents.escalation_escalation_created_v1,
      webhookEvents.escalation_escalation_status_updated_v1,
    ],
  },
  {
    resource: "schedules",
    types: [
      webhookEvents.schedule_created_v1,
      webhookEvents.schedule_updated_v1,
      webhookEvents.schedule_deleted_v1,
    ],
  },
  { resource: "schedule_shifts", types: [webhookEvents.schedule_shift_change_v1] },
  {
    resource: "status_page_incidents",
    types: [webhookEvents.status_page_incident_update_shared_v1],
  },
];

import type { Demo } from "@useairfoil/connector-kit";

import { alertRows } from "./alerts";
import { followUpRows } from "./follow-ups";
import { participantRows, updateRows } from "./response";
import {
  affectedServiceField,
  app,
  clock,
  customerImpactField,
  day,
  hour,
  impactOptions,
  type IncidentGroup,
  json,
  minute,
  problems,
  roleId,
  type Rows,
  serviceEntryId,
  services,
  severities,
  severityId,
  statuses,
  statusId,
  teamId,
  teams,
  timestampId,
  ulid,
  userCount,
  userId,
  workflowId,
  workflows,
} from "./shared";

/** One group is one incident: the alert that started it, the response, and what came after. */
export const incidentRows = (index: number, context: Demo.DemoContext): Rows => {
  const { faker, now } = context;
  const { at, later } = clock(context);

  const rows: Rows = {
    incidents: [],
    incident_updates: [],
    incident_timeline_items: [],
    incident_activity_log_entries: [],
    incident_participants: [],
    incident_relationships: [],
    incident_attachments: [],
    incident_alerts: [],
    incident_call_sessions: [],
    incident_participant_workloads: [],
    postmortem_documents: [],
    postmortem_contents: [],
    follow_ups: [],
    actions: [],
    alerts: [],
    alert_notes: [],
    escalations: [],
    workflow_runs: [],
    status_page_incidents: [],
    policy_findings: [],
  };

  const id = ulid("INC", index);
  const reference = `INC-${index + 1}`;
  const [name, serviceName] = faker.helpers.arrayElement(problems);
  const service = services.indexOf(serviceName);
  const team = service % teams.length;

  const severity = faker.helpers.weightedArrayElement([
    { weight: 10, value: 0 },
    { weight: 30, value: 1 },
    { weight: 60, value: 2 },
  ]);

  const started = at(now.getTime() - faker.number.int({ min: hour, max: 360 * day }));
  const reported = later(started, minute, 30 * minute);

  // Most incidents are over. Recent ones may still be live.
  const open =
    now.getTime() - reported.getTime() < 2 * day && faker.datatype.boolean({ probability: 0.6 });

  const fixed = open ? null : later(reported, 15 * minute, 8 * hour);
  const resolved = fixed ? later(fixed, 10 * minute, 2 * hour) : null;
  // Live incidents are still investigating or fixing. Monitoring needs a fix.
  const finalStatus = open ? faker.number.int({ min: 1, max: 2 }) : severity < 2 ? 4 : 5;
  const lead = team + teams.length * faker.number.int({ max: 3 });

  const responders = faker.helpers.arrayElements(
    Array.from({ length: userCount }, (_, u) => u).filter((u) => u !== lead),
    { min: 1, max: 4 },
  );

  const slackChannel = `C0${faker.string.alphanumeric({ length: 9, casing: "upper" })}`;

  const channelName = `inc-${index + 1}-${name
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .slice(0, 30)
    .replace(/-+$/, "")}`;

  const permalink = `${app}/incidents/${index + 1}`;

  const alertId = ulid("ALR", index);

  const incident: IncidentGroup = {
    ...context,
    ...clock(context),
    rows,
    index,
    id,
    name,
    serviceName,
    service,
    team,
    severity,
    started,
    reported,
    fixed,
    resolved,
    finalStatus,
    lead,
    responders,
    permalink,
    alertId,
  };

  alertRows(incident);
  const changes = updateRows(incident);
  const helpers = participantRows(incident);

  if (severity < 2) {
    rows.incident_call_sessions.push({
      id: ulid("ICS", index),
      version: now,
      incident_id: id,
      started_at: later(reported, minute, 10 * minute),
      ended_at: resolved,
    });
  }

  if (fixed) {
    rows.incident_attachments.push({
      id: ulid("IAT", index),
      version: now,
      incident_id: id,
      resource_type: "github_pull_request",
      external_id: `acme-labs/api#${2000 + index}`,
      title: `Fix ${name.toLowerCase()}`,
      permalink: `https://github.com/acme-labs/api/pull/${2000 + index}`,
    });
  }

  if (index > 0 && faker.datatype.boolean({ probability: 0.1 })) {
    rows.incident_relationships.push({
      id: `${id}:${ulid("REL", index)}`,
      version: now,
      relationship_id: ulid("REL", index),
      incident_id: id,
      related_incident_id: ulid("INC", index - 1),
      related_incident_name: "Earlier incident on the same service",
      related_incident_number: BigInt(index),
    });
  }

  followUpRows(incident, changes, helpers);

  ["Check the dashboards", "Roll back the last deploy", "Tell support"]
    .slice(0, faker.number.int({ max: 2 }))
    .forEach((description, a) => {
      const created = later(reported, minute, 30 * minute);
      const done = resolved ? later(created, minute, hour) : null;

      rows.actions.push({
        id: ulid("ACT", index, a),
        version: done ?? created,
        created_at: created,
        updated_at: done ?? created,
        incident_id: id,
        description,
        status: done ? "completed" : "outstanding",
        assignee_id: userId(faker.helpers.arrayElement(helpers)),
        completed_at: done,
        creator_user_id: userId(lead),
      });
    });

  // Workflows that ran: paging for critical incidents, updates for all, and a
  // post-mortem doc once a serious one is resolved.
  [severity === 0 ? 0 : null, 1, resolved && severity < 2 ? 2 : null].forEach((w, r) => {
    if (w === null) return;
    const scheduled = r === 2 && resolved ? resolved : reported;

    rows.workflow_runs.push({
      id: ulid("WFR", index, r),
      version: later(scheduled, 1_000, minute),
      created_at: scheduled,
      updated_at: later(scheduled, 1_000, minute),
      workflow_id: workflowId(w),
      workflow_name: workflows[w] ?? null,
      workflow_version_id: ulid("WFV", w),
      workflow_version_number: BigInt(w + 2),
      incident_id: id,
      incident_reference: reference,
      scheduled_at: scheduled,
      enqueued_at: scheduled,
      cancelled_at: null,
      error: null,
      progress: json([{ step: 0, status: "completed" }]),
    });
  });

  const lastActivity = new Date(Math.max(...changes.map((change) => change.at.getTime())));

  const durations =
    fixed && resolved
      ? [
          {
            metric_id: ulid("DMT", 0),
            name: "Time to fix",
            status: "success",
            value_seconds: BigInt(Math.round((fixed.getTime() - started.getTime()) / 1000)),
          },
          {
            metric_id: ulid("DMT", 1),
            name: "Duration",
            status: "success",
            value_seconds: BigInt(Math.round((resolved.getTime() - started.getTime()) / 1000)),
          },
        ]
      : [
          {
            metric_id: ulid("DMT", 0),
            name: "Time to fix",
            status: "missing_timestamp",
            value_seconds: null,
          },
        ];

  const impact = severity === 0 ? 3 : severity === 1 ? 2 : faker.number.int({ max: 1 });

  rows.incidents.push({
    id,
    version: lastActivity,
    created_at: reported,
    updated_at: lastActivity,
    reference,
    name,
    summary: fixed ? `A bad deploy broke ${serviceName}. We rolled it back.` : null,
    mode: "standard",
    visibility: "public",
    status_id: statusId(finalStatus),
    status_name: statuses[finalStatus]?.name ?? "Investigating",
    status_category: statuses[finalStatus]?.category ?? "live",
    severity_id: severityId(severity),
    severity_name: severities[severity]?.name ?? "Minor",
    severity_rank: severities[severity]?.rank ?? 1n,
    incident_type_id: ulid("ITY", 0),
    incident_type_name: "Default",
    creator_user_id: null,
    creator_api_key_id: null,
    creator_workflow_id: null,
    creator_alert_id: alertId,
    last_activity_at: lastActivity,
    team_ids: [teamId(team)],
    slack_team_id: "T0ACMEDEMO",
    slack_channel_id: slackChannel,
    slack_channel_name: channelName,
    slack_channel_url: `https://acme.slack.com/archives/${slackChannel}`,
    ms_teams_channel_url: null,
    call_url: severity < 2 ? `https://meet.example.com/${channelName}` : null,
    permalink,
    external_issue_provider: null,
    external_issue_name: null,
    external_issue_permalink: null,
    postmortem_document_ids: rows.postmortem_documents.map((doc) => doc.id),
    postmortem_document_url: rows.postmortem_documents[0]?.document_url ?? null,
    has_debrief: severity === 0,
    role_assignments: [
      {
        role_id: roleId(0),
        role_name: "Incident Lead",
        role_type: "lead",
        assignee_id: userId(lead),
      },
      {
        role_id: roleId(1),
        role_name: "Reporter",
        role_type: "reporter",
        assignee_id: userId(lead),
      },
    ],
    custom_field_values: [
      {
        custom_field_id: affectedServiceField,
        custom_field_name: "Affected service",
        field_type: "single_select",
        value_text: null,
        value_numeric: null,
        value_link: null,
        option_id: null,
        option_value: null,
        catalog_entry_id: serviceEntryId(service),
        catalog_entry_name: serviceName,
      },
      {
        custom_field_id: customerImpactField,
        custom_field_name: "Customer impact",
        field_type: "single_select",
        value_text: null,
        value_numeric: null,
        value_link: null,
        option_id: ulid("CFO", impact),
        option_value: impactOptions[impact] ?? "None",
        catalog_entry_id: null,
        catalog_entry_name: null,
      },
    ],
    timestamps: [
      { timestamp_id: timestampId(0), name: "Impact started", value: started },
      { timestamp_id: timestampId(1), name: "Reported at", value: reported },
      { timestamp_id: timestampId(2), name: "Fixed at", value: fixed },
      { timestamp_id: timestampId(3), name: "Resolved at", value: resolved },
    ],
    duration_metrics: durations,
    workload_minutes_total: rows.incident_participant_workloads.reduce(
      (sum, row) => sum + row.minutes_total,
      0,
    ),
    workload_minutes_working: rows.incident_participant_workloads.reduce(
      (sum, row) => sum + row.minutes_working,
      0,
    ),
    workload_minutes_late: rows.incident_participant_workloads.reduce(
      (sum, row) => sum + row.minutes_late,
      0,
    ),
    workload_minutes_sleeping: 0,
  });

  return rows;
};

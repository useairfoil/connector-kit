import type { Demo } from "@useairfoil/connector-kit";

import { Duration } from "effect";

import type {
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
} from "../schemas/incidents";
import type { Alert, AlertNote, Escalation } from "../schemas/on-call";
import type { PolicyFinding, StatusPageIncident, WorkflowRun } from "../schemas/settings";
import type { Action, FollowUp, PostmortemContent, PostmortemDocument } from "../schemas/tasks";

export const minute = Duration.toMillis(Duration.minutes(1));
export const hour = Duration.toMillis(Duration.hours(1));
export const day = Duration.toMillis(Duration.days(1));
export const app = "https://app.incident.io/acme";

// incident.io IDs are 26-character ULIDs. Demo IDs have the same shape: a
// three-letter block for each kind, and the index at the end.
export const ulid = (kind: string, index: number, part = 0) =>
  `01JD${kind}${String(part).padStart(3, "0")}${String(index).padStart(16, "0")}`;

export const userCount = 24;
export const userId = (u: number) => ulid("USR", u);
export const teams = ["Platform", "Payments", "Mobile", "Data"] as const;
export const teamId = (t: number) => ulid("TEM", t);

export const services = [
  "API",
  "Web app",
  "Checkout",
  "Search",
  "Notifications",
  "Data pipeline",
  "Auth",
  "iOS app",
] as const;

export const serviceEntryId = (s: number) => ulid("CES", s);
export const teamEntryId = (t: number) => ulid("CET", t);

export const severities = [
  { name: "Critical", rank: 3n, description: "Full outage or data loss for many customers." },
  { name: "Major", rank: 2n, description: "A key feature is down or badly degraded." },
  { name: "Minor", rank: 1n, description: "Some customers see a problem with a workaround." },
] as const;

export const severityId = (s: number) => ulid("SEV", s);

export const statuses = [
  { name: "Triage", category: "triage" },
  { name: "Investigating", category: "live" },
  { name: "Fixing", category: "live" },
  { name: "Monitoring", category: "live" },
  { name: "Documenting", category: "learning" },
  { name: "Closed", category: "closed" },
] as const;

export const statusId = (s: number) => ulid("STA", s);

export const roles = [
  { name: "Incident Lead", shortform: "lead", type: "lead" },
  { name: "Reporter", shortform: "reporter", type: "reporter" },
  { name: "Communications Lead", shortform: "comms", type: "custom" },
] as const;

export const roleId = (r: number) => ulid("ROL", r);
export const timestamps = ["Impact started", "Reported at", "Fixed at", "Resolved at"] as const;
export const timestampId = (t: number) => ulid("TSP", t);
export const affectedServiceField = ulid("CFD", 0);
export const customerImpactField = ulid("CFD", 1);
export const impactOptions = ["None", "Some customers", "Many customers", "All customers"] as const;

export const alertSources = [
  { name: "Datadog", type: "datadog" },
  { name: "Sentry", type: "sentry" },
  { name: "PagerDuty migration", type: "http" },
] as const;

export const sourceId = (s: number) => ulid("ASR", s);
export const routeId = (r: number) => ulid("ART", r);
export const pathId = (p: number) => ulid("ESP", p);
export const scheduleId = (s: number) => ulid("SCH", s);
export const workflowId = (w: number) => ulid("WFL", w);

export const workflows = [
  "Page on-call for critical incidents",
  "Post updates to #incidents",
  "Create post-mortem doc",
] as const;

export const statusPageId = ulid("SPG", 0);
export const componentId = (c: number) => ulid("SPC", c);
export const policyId = ulid("POL", 0);

export const json = (value: unknown) => JSON.stringify(value);

export type Rows = {
  readonly incidents: Array<Incident>;
  readonly incident_updates: Array<IncidentUpdate>;
  readonly incident_timeline_items: Array<TimelineItem>;
  readonly incident_activity_log_entries: Array<ActivityLogEntry>;
  readonly incident_participants: Array<Participant>;
  readonly incident_relationships: Array<Relationship>;
  readonly incident_attachments: Array<Attachment>;
  readonly incident_alerts: Array<IncidentAlert>;
  readonly incident_call_sessions: Array<CallSession>;
  readonly incident_participant_workloads: Array<ParticipantWorkload>;
  readonly postmortem_contents: Array<PostmortemContent>;
  readonly postmortem_documents: Array<PostmortemDocument>;
  readonly follow_ups: Array<FollowUp>;
  readonly actions: Array<Action>;
  readonly alerts: Array<Alert>;
  readonly alert_notes: Array<AlertNote>;
  readonly escalations: Array<Escalation>;
  readonly workflow_runs: Array<WorkflowRun>;
  readonly status_page_incidents: Array<StatusPageIncident>;
  readonly policy_findings: Array<PolicyFinding>;
};

export const problems = [
  ["Elevated 5xx errors on API", "API"],
  ["Checkout payments failing", "Checkout"],
  ["Search results empty for some users", "Search"],
  ["Push notifications delayed", "Notifications"],
  ["Login page timing out", "Auth"],
  ["iOS app crashes on launch", "iOS app"],
  ["Nightly data load missing rows", "Data pipeline"],
  ["Web app slow for EU customers", "Web app"],
] as const;

/** Date helpers for one run. `at` keeps a time from going past now. */
export const clock = ({ faker, now }: Demo.DemoContext) => {
  const at = (time: number) => new Date(Math.min(time, now.getTime()));

  const later = (from: Date, min: number, max: number) =>
    at(from.getTime() + faker.number.int({ min, max }));

  return { at, later };
};

/** One incident being built: the run's tools, its rows so far, and what its parts need to know. */
export type IncidentGroup = Demo.DemoContext &
  ReturnType<typeof clock> & {
    readonly rows: Rows;
    readonly index: number;
    readonly id: string;
    readonly name: string;
    readonly serviceName: string;
    readonly service: number;
    readonly team: number;
    readonly severity: number;
    readonly started: Date;
    readonly reported: Date;
    readonly fixed: Date | null;
    readonly resolved: Date | null;
    readonly finalStatus: number;
    readonly lead: number;
    readonly responders: ReadonlyArray<number>;
    readonly permalink: string;
    readonly alertId: string;
  };

export type StatusChange = { readonly status: number; readonly at: Date; readonly message: string };

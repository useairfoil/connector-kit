import { type ConnectorError, Cursor, Fetch, Resource } from "@useairfoil/connector-kit";
import { Array as Arr, DateTime, Duration, Effect, Option, Schema } from "effect";

import type { IncidentIoClientService } from "../client/client";

import {
  type ActivityLogEntry,
  ActivityLogEntryObjectSchema,
  ActivityLogEntrySchema,
  type Attachment,
  AttachmentObjectSchema,
  AttachmentSchema,
  type CallSession,
  CallSessionObjectSchema,
  CallSessionSchema,
  CallTranscriptEntryObjectSchema,
  type CallTranscriptEntry,
  CallTranscriptEntrySchema,
  type Incident,
  type IncidentAlert,
  IncidentAlertObjectSchema,
  IncidentAlertSchema,
  type IncidentObject,
  IncidentObjectSchema,
  IncidentSchema,
  type IncidentUpdate,
  IncidentUpdateObjectSchema,
  IncidentUpdateSchema,
  type Participant,
  ParticipantSchema,
  ParticipantsObjectSchema,
  type ParticipantWorkload,
  ParticipantWorkloadObjectSchema,
  ParticipantWorkloadSchema,
  type Relationship,
  RelationshipObjectSchema,
  RelationshipSchema,
  type TimelineItem,
  TimelineItemObjectSchema,
  TimelineItemSchema,
} from "../schemas/incidents";
import { type WebhookTarget, WebhookTargetSchema } from "../schemas/shared";
import {
  type ListOptions,
  type Params,
  changesInterval,
  changesOverlap,
  findOne,
  listAll,
  readPage,
} from "./pages";

// The list leaves out test and tutorial incidents unless asked.
const incidentModes = ["standard", "retrospective", "test", "tutorial"];
// Some lists of open incidents, such as participants, change without a new
// `updated_at`, so the feed reads them every run.
const openCategories = ["triage", "live", "paused"];
const concurrency = 10;

const incidentList = (params: Params = {}): ListOptions<IncidentObject> => ({
  path: "/v2/incidents",
  key: "incidents",
  item: IncidentObjectSchema,
  params: { page_size: "250", mode: { one_of: incidentModes }, ...params },
});

const toIncidentRow = (incident: IncidentObject): Incident => ({
  id: incident.id,
  version: incident.updated_at,
  created_at: incident.created_at,
  updated_at: incident.updated_at,
  reference: incident.reference,
  name: incident.name,
  summary: incident.summary,
  mode: incident.mode,
  visibility: incident.visibility,
  status_id: incident.incident_status.id,
  status_name: incident.incident_status.name,
  status_category: incident.incident_status.category,
  severity_id: incident.severity?.id,
  severity_name: incident.severity?.name,
  severity_rank: incident.severity?.rank,
  incident_type_id: incident.incident_type?.id,
  incident_type_name: incident.incident_type?.name,
  creator_user_id: incident.creator.user?.id,
  creator_api_key_id: incident.creator.api_key?.id,
  creator_workflow_id: incident.creator.workflow?.id,
  creator_alert_id: incident.creator.alert?.id,
  last_activity_at: incident.last_activity_at,
  team_ids: incident.team_ids,
  slack_team_id: incident.slack_team_id,
  slack_channel_id: incident.slack_channel_id,
  slack_channel_name: incident.slack_channel_name,
  slack_channel_url: incident.slack_channel_url,
  ms_teams_channel_url: incident.ms_teams_channel_url,
  call_url: incident.call_url,
  permalink: incident.permalink,
  external_issue_provider: incident.external_issue_reference?.provider,
  external_issue_name: incident.external_issue_reference?.issue_name,
  external_issue_permalink: incident.external_issue_reference?.issue_permalink,
  postmortem_document_ids: incident.postmortem_document_ids ?? [],
  postmortem_document_url: incident.postmortem_document_url,
  has_debrief: incident.has_debrief,
  debriefs: incident.debriefs,
  role_assignments: incident.incident_role_assignments.map(({ role, assignee }) => ({
    role_id: role.id,
    role_name: role.name,
    role_type: role.role_type,
    assignee_id: assignee?.id,
  })),
  custom_field_values: incident.custom_field_entries.flatMap(({ custom_field, values }) =>
    values.map((value) => ({
      custom_field_id: custom_field.id,
      custom_field_name: custom_field.name,
      field_type: custom_field.field_type,
      value_text: value.value_text,
      value_numeric: value.value_numeric,
      value_link: value.value_link,
      option_id: value.value_option?.id,
      option_value: value.value_option?.value,
      catalog_entry_id: value.value_catalog_entry?.id,
      catalog_entry_name: value.value_catalog_entry?.name,
    })),
  ),
  timestamps: (incident.incident_timestamp_values ?? []).map(({ incident_timestamp, value }) => ({
    timestamp_id: incident_timestamp.id,
    name: incident_timestamp.name,
    value: value?.value,
  })),
  duration_metrics: (incident.duration_metrics ?? []).map(
    ({ duration_metric, status, value_seconds }) => ({
      metric_id: duration_metric.id,
      name: duration_metric.name,
      status,
      value_seconds,
    }),
  ),
  workload_minutes_total: incident.workload_minutes_total,
  workload_minutes_working: incident.workload_minutes_working,
  workload_minutes_late: incident.workload_minutes_late,
  workload_minutes_sleeping: incident.workload_minutes_sleeping,
});

type ReadFor<Row> = (incidentId: string) => Effect.Effect<ReadonlyArray<Row>, ConnectorError>;

/** `incidents` and the lists read for each incident, with one changes feed. */
export const makeIncidents = (client: IncidentIoClientService) => {
  /** Newest first, with no date filter. Drops incidents made after the cutoff. */
  const incidentPages = <Row extends object>(
    rows: (
      incidents: ReadonlyArray<IncidentObject>,
    ) => Effect.Effect<ReadonlyArray<Row>, ConnectorError>,
  ) =>
    Fetch.page({
      pageCursor: Cursor.string(),
      cutoff: Cursor.isoDateTime(),
      fetch: ({ pageCursor, cutoff }) =>
        Effect.gen(function* () {
          const until = DateTime.toEpochMillis(DateTime.makeUnsafe(String(cutoff)));
          const page = yield* readPage(
            client,
            incidentList(),
            Option.fromNullishOr(typeof pageCursor === "string" ? pageCursor : undefined),
          );
          return {
            rows: yield* rows(
              page.items.filter((incident) => incident.created_at.getTime() <= until),
            ),
            hasMore: Option.isSome(page.next),
            ...Option.match(page.next, {
              onNone: () => ({}),
              onSome: (nextPageCursor) => ({ nextPageCursor }),
            }),
          };
        }),
    });

  /** Incidents changed since the cursor, and the open ones. */
  const incidentsToRead = (
    since: string,
    withOpen: boolean,
    lookBack: Duration.Input = changesOverlap,
  ) =>
    Effect.gen(function* () {
      const now = yield* DateTime.now;
      const from = DateTime.subtractDuration(DateTime.makeUnsafe(since), lookBack);
      // The incidents list only filters by date, so drop older rows here.
      const changed = (yield* listAll(
        client,
        incidentList({ updated_at: { gte: DateTime.formatIsoDateUtc(from) } }),
      )).filter((incident) => incident.updated_at.getTime() >= DateTime.toEpochMillis(from));
      const open = withOpen
        ? yield* listAll(client, incidentList({ status_category: { one_of: openCategories } }))
        : [];
      return {
        changed,
        ids: Arr.dedupe([...changed, ...open].map((incident) => incident.id)),
        cursor: DateTime.formatIso(now),
      };
    });

  /** Sources for a list read one incident at a time. Changes come from the feed. */
  const perIncident = <Row extends object>(read: ReadFor<Row>) => ({
    // Checks the list on one incident, if there is one.
    check: readPage(client, incidentList({ page_size: "1" })).pipe(
      Effect.flatMap(({ items }) => Effect.forEach(items, (incident) => read(incident.id))),
      Effect.asVoid,
    ),
    backfill: incidentPages((incidents) =>
      Effect.forEach(incidents, (incident) => read(incident.id), { concurrency }).pipe(
        Effect.map(Arr.flatten),
      ),
    ),
    webhook: {
      schema: WebhookTargetSchema,
      handler: ({ payload }: { readonly payload: WebhookTarget }) => read(payload.id),
    },
  });

  const readUpdates: ReadFor<IncidentUpdate> = (incidentId) =>
    listAll(client, {
      path: "/v2/incident_updates",
      key: "incident_updates",
      item: IncidentUpdateObjectSchema,
      params: { incident_id: incidentId, page_size: "250" },
      emptyIfMissing: true,
    }).pipe(
      Effect.map((updates) =>
        updates.map((update) => ({
          id: update.id,
          version: update.created_at,
          created_at: update.created_at,
          incident_id: update.incident_id,
          message: update.message,
          new_status_id: update.new_incident_status.id,
          new_status_name: update.new_incident_status.name,
          new_status_category: update.new_incident_status.category,
          new_severity_id: update.new_severity?.id,
          new_severity_name: update.new_severity?.name,
          merged_into_incident_id: update.merged_into_incident_id,
          updater_user_id: update.updater.user?.id,
          updater_api_key_id: update.updater.api_key?.id,
          updater_workflow_id: update.updater.workflow?.id,
        })),
      ),
    );

  const readTimelineItems: ReadFor<TimelineItem> = (incidentId) =>
    listAll(client, {
      path: "/v2/incident_timeline_items",
      key: "incident_timeline_items",
      item: TimelineItemObjectSchema,
      params: { incident_id: incidentId, page_size: "250" },
      emptyIfMissing: true,
    }).pipe(
      Effect.map((items) =>
        items.map(({ creator, ...item }) => ({
          ...item,
          version: item.updated_at,
          creator_user_id: creator.user?.id,
        })),
      ),
    );

  const readActivityLog: ReadFor<ActivityLogEntry> = (incidentId) =>
    listAll(client, {
      path: "/v2/incident_activity_log_entries",
      key: "incident_activity_log_entries",
      item: ActivityLogEntryObjectSchema,
      params: { incident_id: incidentId, page_size: "250" },
      emptyIfMissing: true,
    }).pipe(
      Effect.map((entries) => entries.map((entry) => ({ ...entry, version: entry.created_at }))),
    );

  const readParticipants: ReadFor<Participant> = (incidentId) =>
    Effect.gen(function* () {
      const version = yield* DateTime.nowAsDate;
      const found = yield* client.find(
        Schema.Struct({ incident_participants: ParticipantsObjectSchema }),
        "/v2/incident_participants",
        { incident_id: incidentId },
      );
      return Option.match(found, {
        onNone: () => [],
        onSome: ({ incident_participants: { active, passive } }) =>
          [
            ...active.map((participant) => ({ participant, active: true })),
            ...passive.map((participant) => ({ participant, active: false })),
          ].map(({ participant, active }) => ({
            id: `${incidentId}:${participant.user.id}`,
            version,
            incident_id: incidentId,
            user_id: participant.user.id,
            participant_type: participant.participant_type,
            active,
          })),
      });
    });

  const readRelationships: ReadFor<Relationship> = (incidentId) =>
    Effect.gen(function* () {
      const version = yield* DateTime.nowAsDate;
      const relationships = yield* listAll(client, {
        path: "/v1/incident_relationships",
        key: "incident_relationships",
        item: RelationshipObjectSchema,
        params: { incident_id: incidentId, page_size: "250" },
        emptyIfMissing: true,
      });
      // Both incidents list the same relationship, so the key has the incident too.
      return relationships.map((relationship) => ({
        id: `${incidentId}:${relationship.id}`,
        version,
        relationship_id: relationship.id,
        incident_id: incidentId,
        related_incident_id: relationship.incident.id,
        related_incident_name: relationship.incident.name,
        related_incident_number: relationship.incident.external_id,
      }));
    });

  const readAttachments: ReadFor<Attachment> = (incidentId) =>
    Effect.gen(function* () {
      const version = yield* DateTime.nowAsDate;
      const attachments = yield* listAll(client, {
        path: "/v1/incident_attachments",
        key: "incident_attachments",
        item: AttachmentObjectSchema,
        params: { incident_id: incidentId },
        emptyIfMissing: true,
      });
      return attachments.map(({ resource, ...attachment }) => ({
        ...attachment,
        ...resource,
        version,
      }));
    });

  const readIncidentAlerts: ReadFor<IncidentAlert> = (incidentId) =>
    Effect.gen(function* () {
      const version = yield* DateTime.nowAsDate;
      const links = yield* listAll(client, {
        path: "/v2/incident_alerts",
        key: "incident_alerts",
        item: IncidentAlertObjectSchema,
        params: { incident_id: incidentId, page_size: "50" },
        emptyIfMissing: true,
      });
      return links.map((link) => ({
        id: link.id,
        version,
        incident_id: link.incident.id,
        alert_id: link.alert.id,
        alert_route_id: link.alert_route_id,
      }));
    });

  const readCallSessions: ReadFor<CallSession> = (incidentId) =>
    Effect.gen(function* () {
      const version = yield* DateTime.nowAsDate;
      const sessions = yield* listAll(client, {
        path: "/v2/call_sessions",
        key: "call_sessions",
        item: CallSessionObjectSchema,
        params: { incident_id: incidentId, page_size: "250" },
        emptyIfMissing: true,
      });
      return sessions.map((session) => ({ ...session, version }));
    });

  const readTranscripts: ReadFor<CallTranscriptEntry> = (incident_id) =>
    Effect.gen(function* () {
      const sessions = yield* readCallSessions(incident_id);
      const version = yield* DateTime.nowAsDate;
      const bySession = yield* Effect.forEach(sessions, (session) =>
        listAll(client, {
          path: "/v2/call_transcript_entries",
          key: "call_transcript_entries",
          item: CallTranscriptEntryObjectSchema,
          params: { call_session_id: session.id, page_size: "250" },
          emptyIfMissing: true,
        }).pipe(
          Effect.map((entries) =>
            entries.map((entry) => ({
              ...entry,
              call_session_id: session.id,
              incident_id,
              version,
            })),
          ),
        ),
      );
      return bySession.flat();
    });

  const readWorkloads: ReadFor<ParticipantWorkload> = (incidentId) =>
    Effect.gen(function* () {
      const version = yield* DateTime.nowAsDate;
      const workloads = yield* listAll(client, {
        path: "/v2/incident_participant_workloads",
        key: "incident_participant_workloads",
        item: ParticipantWorkloadObjectSchema,
        params: { incident_id: incidentId },
        emptyIfMissing: true,
      });
      return workloads.map(({ user, participant_type, archived_at, workload }) => ({
        id: `${incidentId}:${user.id}:${participant_type ?? ""}`,
        version,
        incident_id: incidentId,
        user_id: user.id,
        participant_type,
        archived_at,
        minutes_total: workload.minutes_spent_on_incident,
        minutes_working: workload.minutes_spent_on_incident_in_working_hours,
        minutes_late: workload.minutes_spent_on_incident_in_late_hours,
        minutes_sleeping: workload.minutes_spent_on_incident_in_sleeping_hours,
      }));
    });

  const Incidents = Resource.entity({
    name: "incidents",
    rowSchema: IncidentSchema,
    version: "version",

    check: readPage(client, incidentList({ page_size: "1" })).pipe(Effect.asVoid),
    backfill: incidentPages((incidents) => Effect.succeed(incidents.map(toIncidentRow))),
    webhook: {
      schema: WebhookTargetSchema,
      handler: ({ payload }) =>
        findOne(client, {
          path: `/v2/incidents/${payload.id}`,
          key: "incident",
          item: IncidentObjectSchema,
          toRow: toIncidentRow,
        }),
    },
  });

  const IncidentUpdates = Resource.entity({
    name: "incident_updates",
    rowSchema: IncidentUpdateSchema,
    version: "version",
    ...perIncident(readUpdates),
  });

  const TimelineItems = Resource.entity({
    name: "incident_timeline_items",
    rowSchema: TimelineItemSchema,
    version: "version",
    ...perIncident(readTimelineItems),
  });

  const ActivityLogEntries = Resource.entity({
    name: "incident_activity_log_entries",
    rowSchema: ActivityLogEntrySchema,
    version: "version",
    ...perIncident(readActivityLog),
  });

  const Participants = Resource.entity({
    name: "incident_participants",
    rowSchema: ParticipantSchema,
    version: "version",
    ...perIncident(readParticipants),
  });

  const Relationships = Resource.entity({
    name: "incident_relationships",
    rowSchema: RelationshipSchema,
    version: "version",
    ...perIncident(readRelationships),
  });

  const Attachments = Resource.entity({
    name: "incident_attachments",
    rowSchema: AttachmentSchema,
    version: "version",
    ...perIncident(readAttachments),
  });

  const IncidentAlerts = Resource.entity({
    name: "incident_alerts",
    rowSchema: IncidentAlertSchema,
    version: "version",
    ...perIncident(readIncidentAlerts),
  });

  /**
   * For lists that need an extra role. They poll on their own and take no
   * webhooks, so a missing role doesn't stop the feed or the incident webhook
   * for the other incident tables.
   */
  const roleGated = <Row extends object>(read: ReadFor<Row>, lookBack?: Duration.Input) => {
    const { check, backfill } = perIncident(read);
    return {
      check,
      backfill,
      changes: Fetch.changes({
        cursor: Cursor.string(),
        interval: changesInterval,
        fetch: ({ cursor }) =>
          Effect.gen(function* () {
            const { ids, cursor: next } = yield* incidentsToRead(String(cursor), true, lookBack);
            const rows = yield* Effect.forEach(ids, read, { concurrency });
            return { rows: rows.flat(), cursor: next };
          }),
      }),
    };
  };

  // Needs the `call_transcripts_viewer` role.
  const CallSessions = Resource.entity({
    name: "incident_call_sessions",
    rowSchema: CallSessionSchema,
    version: "version",
    ...roleGated(readCallSessions),
  });

  // Needs the `call_transcripts_viewer` role. Read a day back, like workloads,
  // in case a transcript lands after the incident's last change.
  const CallTranscripts = Resource.entity({
    name: "incident_call_transcripts",
    rowSchema: CallTranscriptEntrySchema,
    version: "version",
    ...roleGated(readTranscripts, Duration.days(1)),
  });

  // Needs the workload roles. incident.io updates workload now and then, so the
  // last figures can come after an incident closes. Read a day back.
  const Workloads = Resource.entity({
    name: "incident_participant_workloads",
    rowSchema: ParticipantWorkloadSchema,
    version: "version",
    ...roleGated(readWorkloads, Duration.days(1)),
  });

  const lists = [
    IncidentUpdates,
    TimelineItems,
    ActivityLogEntries,
    Participants,
    Relationships,
    Attachments,
    IncidentAlerts,
  ] as const;

  const feed = Fetch.feed({
    resources: [Incidents, ...lists],
    cursor: Cursor.string(),
    interval: changesInterval,
    // The first cursor is the backfill cutoff.
    fetch: ({ cursor, selected }) =>
      Effect.gen(function* () {
        const {
          changed,
          ids,
          cursor: next,
        } = yield* incidentsToRead(
          String(cursor),
          lists.some((resource) => selected.has(resource.name)),
        );
        const each = <Row>(name: string, read: ReadFor<Row>) =>
          selected.has(name)
            ? Effect.forEach(ids, read, { concurrency }).pipe(Effect.map(Arr.flatten))
            : Effect.succeed([]);

        const rows = yield* Effect.all({
          incidents: Effect.succeed(selected.has(Incidents.name) ? changed.map(toIncidentRow) : []),
          incident_updates: each(IncidentUpdates.name, readUpdates),
          incident_timeline_items: each(TimelineItems.name, readTimelineItems),
          incident_activity_log_entries: each(ActivityLogEntries.name, readActivityLog),
          incident_participants: each(Participants.name, readParticipants),
          incident_relationships: each(Relationships.name, readRelationships),
          incident_attachments: each(Attachments.name, readAttachments),
          incident_alerts: each(IncidentAlerts.name, readIncidentAlerts),
        });
        return { rows, cursor: next };
      }),
  });

  return {
    resources: [Incidents, ...lists, CallSessions, CallTranscripts, Workloads] as const,
    // Incident events read these again.
    webhookTargets: [Incidents, ...lists],
    feed,
  };
};

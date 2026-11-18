import { ConnectorError, Cursor, Fetch, Resource } from "@useairfoil/connector-kit";
import { Array as Arr, DateTime, Duration, Effect, Option, Schema, Stream } from "effect";

import type { IncidentIoClientService } from "../client/client";

import {
  type ScheduleObject,
  type EscalationObject,
  type AlertObject,
  type Alert,
  AlertAttributeObjectSchema,
  AlertAttributeSchema,
  AlertNoteObjectSchema,
  AlertNoteSchema,
  AlertObjectSchema,
  AlertRouteObjectSchema,
  AlertRouteSchema,
  AlertSchema,
  AlertSourceObjectSchema,
  AlertSourceSchema,
  AlertTagObjectSchema,
  AlertTagSchema,
  CallRouteObjectSchema,
  CallRouteSchema,
  type Escalation,
  EscalationObjectSchema,
  EscalationPathObjectSchema,
  EscalationPathSchema,
  EscalationSchema,
  MaintenanceWindowObjectSchema,
  MaintenanceWindowSchema,
  NotificationPauseObjectSchema,
  NotificationPauseSchema,
  PayConfigObjectSchema,
  PayConfigSchema,
  type PayReport,
  type PayReportObject,
  PayReportObjectSchema,
  PayReportSchema,
  type Schedule,
  ScheduleEntryObjectSchema,
  ScheduleObjectSchema,
  ScheduleOverrideObjectSchema,
  ScheduleOverrideSchema,
  ScheduleSchema,
  type ScheduleShift,
  ScheduleShiftSchema,
} from "../schemas/on-call";
import { Optional, PaginationMetaSchema, Ref, WebhookTargetSchema } from "../schemas/shared";
import { findOne, listAll, listSources, polled } from "./pages";

// Shifts can still change until they end, so each read covers the past week.
const shiftWindow = Duration.days(7);

const toAlert = ({ alert_group_ids, tags, attributes, ...alert }: AlertObject): Alert => ({
  ...alert,
  version: alert.updated_at,
  alert_group_ids: alert_group_ids ?? [],
  tags: (tags ?? []).map((tag) => ({ tag_id: tag.id, name: tag.name })),
  attributes: attributes.flatMap(({ attribute, value, array_value }) =>
    [...(value ? [value] : []), ...(array_value ?? [])].map((item) => ({
      attribute_id: attribute.id,
      attribute_name: attribute.name,
      label: item.label,
      literal: item.literal,
      catalog_entry_id: item.catalog_entry?.id,
    })),
  ),
});

export const makeAlerts = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "alerts",
    rowSchema: AlertSchema,
    version: "version",
    ...polled(client, {
      path: "/v2/alerts",
      key: "alerts",
      item: AlertObjectSchema,
      params: { page_size: "50" },
      toRow: toAlert,
    }),
    webhook: {
      schema: WebhookTargetSchema,
      handler: ({ payload }) =>
        findOne(client, {
          path: `/v2/alerts/${payload.id}`,
          key: "alert",
          item: AlertObjectSchema,
          toRow: toAlert,
        }),
    },
  });

// Notes are listed one alert at a time, so read the alerts that have notes first.
export const makeAlertNotes = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "alert_notes",
    rowSchema: AlertNoteSchema,
    version: "version",
    ...listSources(
      listAll(client, {
        path: "/v2/alerts",
        key: "alerts",
        item: Ref,
        params: { page_size: "50", has_notes: { is: "true" } },
      }).pipe(
        Effect.flatMap((alerts) =>
          Effect.forEach(alerts, (alert) =>
            listAll(client, {
              path: "/v1/alert_notes",
              key: "alert_notes",
              item: AlertNoteObjectSchema,
              params: { alert_id: alert.id, page_size: "250" },
            }),
          ),
        ),
        Effect.map(Arr.flatten),
        Effect.map((notes) =>
          notes.map(({ creator, ...note }) => ({
            ...note,
            version: note.updated_at,
            creator_user_id: creator.user?.id,
          })),
        ),
      ),
    ),
  });

export const makeAlertSources = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "alert_sources",
    rowSchema: AlertSourceSchema,
    version: "version",
    ...listSources(
      Effect.gen(function* () {
        const version = yield* DateTime.nowAsDate;
        const sources = yield* listAll(client, {
          path: "/v2/alert_sources",
          key: "alert_sources",
          item: AlertSourceObjectSchema,
        });
        return sources.map((source) => ({
          ...source,
          version,
          owning_team_ids: source.owning_team_ids ?? [],
        }));
      }),
    ),
  });

export const makeAlertTags = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "alert_tags",
    rowSchema: AlertTagSchema,
    version: "version",
    ...listSources(
      Effect.gen(function* () {
        const version = yield* DateTime.nowAsDate;
        const tags = yield* listAll(client, {
          path: "/v2/alert_tags",
          key: "alert_tags",
          item: AlertTagObjectSchema,
          params: { page_size: "250" },
        });
        return tags.map((tag) => ({ ...tag, version }));
      }),
    ),
  });

export const makeAlertRoutes = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "alert_routes",
    rowSchema: AlertRouteSchema,
    version: "version",
    ...listSources(
      Effect.gen(function* () {
        const version = yield* DateTime.nowAsDate;
        const routes = yield* listAll(client, {
          path: "/v3/alert_routes",
          key: "alert_routes",
          item: AlertRouteObjectSchema,
        });
        return routes.map((route) => ({ ...route, version }));
      }),
    ),
  });

export const makeAlertAttributes = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "alert_attributes",
    rowSchema: AlertAttributeSchema,
    version: "version",
    ...listSources(
      Effect.gen(function* () {
        const version = yield* DateTime.nowAsDate;
        const attributes = yield* listAll(client, {
          path: "/v2/alert_attributes",
          key: "alert_attributes",
          item: AlertAttributeObjectSchema,
        });
        return attributes.map((attribute) => ({ ...attribute, version }));
      }),
    ),
  });

const toEscalation = ({
  priority,
  creator,
  related_incidents,
  related_alerts,
  events,
  ...escalation
}: EscalationObject): Escalation => ({
  ...escalation,
  version: escalation.updated_at,
  priority_name: priority?.name,
  creator_user_id: creator.user?.id,
  creator_workflow_id: creator.workflow?.id,
  creator_alert_id: creator.alert?.id,
  related_incident_ids: related_incidents.map((incident) => incident.id),
  related_alert_ids: related_alerts.map((alert) => alert.id),
  events: events.map(({ id, users, ...event }) => ({
    ...event,
    event_id: id,
    user_ids: (users ?? []).map((user) => user.id),
  })),
});

export const makeEscalations = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "escalations",
    rowSchema: EscalationSchema,
    version: "version",
    ...polled(client, {
      path: "/v2/escalations",
      key: "escalations",
      item: EscalationObjectSchema,
      params: { page_size: "50" },
      datesOnly: { createdAt: (escalation) => escalation.created_at },
      toRow: toEscalation,
    }),
    webhook: {
      schema: WebhookTargetSchema,
      handler: ({ payload }) =>
        findOne(client, {
          path: `/v2/escalations/${payload.id}`,
          key: "escalation",
          item: EscalationObjectSchema,
          toRow: toEscalation,
        }),
    },
  });

export const makeEscalationPaths = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "escalation_paths",
    rowSchema: EscalationPathSchema,
    version: "version",
    ...listSources(
      Effect.gen(function* () {
        const version = yield* DateTime.nowAsDate;
        const paths = yield* listAll(client, {
          path: "/v2/escalation_paths",
          key: "escalation_paths",
          item: EscalationPathObjectSchema,
          params: { page_size: "25" },
        });
        return paths.map((path) => ({ ...path, version }));
      }),
    ),
  });

const listSchedules = (client: IncidentIoClientService) =>
  listAll(client, {
    path: "/v2/schedules",
    key: "schedules",
    item: ScheduleObjectSchema,
    params: { page_size: "250" },
  });

const toSchedule = ({ annotations, ...schedule }: ScheduleObject): Schedule => ({
  ...schedule,
  version: schedule.updated_at,
  annotations: new Map(Object.entries(annotations)),
});

export const makeSchedules = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "schedules",
    rowSchema: ScheduleSchema,
    version: "version",
    ...listSources(
      listSchedules(client).pipe(Effect.map((schedules) => schedules.map(toSchedule))),
    ),
    webhook: {
      schema: WebhookTargetSchema,
      // A deleted schedule can't come back, so other rows leave `_deleted` out.
      handler: ({ payload }) =>
        payload.event === "schedule.deleted_v1"
          ? Effect.succeed([{ id: payload.id, version: payload.time, _deleted: true as const }])
          : findOne(client, {
              path: `/v2/schedules/${payload.id}`,
              key: "schedule",
              item: ScheduleObjectSchema,
              toRow: toSchedule,
            }),
    },
  });

const readShifts = (
  client: IncidentIoClientService,
  scheduleId: string,
  window?: { readonly start: DateTime.Utc; readonly end: DateTime.Utc },
): Effect.Effect<ReadonlyArray<ScheduleShift>, ConnectorError> =>
  Effect.gen(function* () {
    const end = window?.end ?? (yield* DateTime.now);
    const start = window?.start ?? DateTime.subtractDuration(end, shiftWindow);
    const version = DateTime.toDateUtc(end);
    // The next page goes in `entry_window_start`, with the same end.
    const entries = yield* Stream.paginate(DateTime.formatIso(start), (after) =>
      client
        .get(
          Schema.Struct({
            schedule_entries: Schema.Struct({ final: Schema.Array(ScheduleEntryObjectSchema) }),
            pagination_meta: Optional(PaginationMetaSchema),
          }),
          "/v2/schedule_entries",
          {
            schedule_id: scheduleId,
            entry_window_start: after,
            entry_window_end: DateTime.formatIso(end),
          },
        )
        .pipe(
          Effect.map(
            ({ schedule_entries, pagination_meta }) =>
              [schedule_entries.final, Option.fromNullishOr(pagination_meta?.after)] as const,
          ),
        ),
    ).pipe(Stream.runCollect);
    return entries
      .filter(
        (entry) =>
          entry.end_at.getTime() <= version.getTime() &&
          (!window || entry.end_at.getTime() >= DateTime.toEpochMillis(start)),
      )
      .map(({ user, ...entry }) => {
        // The spec says `fingerprint` stays the same for a shift across reads.
        const shift =
          entry.fingerprint ??
          `${entry.rotation_id ?? ""}:${user?.id ?? ""}:${entry.start_at.toISOString()}`;
        return {
          ...entry,
          id: `${scheduleId}:${shift}`,
          version,
          schedule_id: scheduleId,
          user_id: user?.id,
        };
      });
  });

const ShiftCursorSchema = Schema.fromJsonString(
  Schema.Struct({ schedule_id: Schema.String, start: Schema.DateTimeUtcFromString }),
);

const shiftCursorError = (cause: Schema.SchemaError) =>
  new ConnectorError({ message: "Invalid schedule shift cursor", cause });

// Backfill reads each schedule from the time it was made, a week per page.
const backfillShifts = (client: IncidentIoClientService) =>
  Fetch.page({
    pageCursor: Cursor.string(),
    cutoff: Cursor.isoDateTime(),
    fetch: ({ cutoff, pageCursor }) =>
      Effect.gen(function* () {
        const end = DateTime.makeUnsafe(String(cutoff));
        const position =
          typeof pageCursor === "string"
            ? yield* Schema.decodeUnknownEffect(ShiftCursorSchema)(pageCursor).pipe(
                Effect.mapError(shiftCursorError),
              )
            : undefined;
        // In ID order, so a schedule deleted mid-backfill doesn't lose our place.
        const schedules = (yield* listSchedules(client))
          .filter((schedule) => schedule.created_at.getTime() < DateTime.toEpochMillis(end))
          .toSorted((a, b) => a.id.localeCompare(b.id));
        const schedule = position
          ? schedules.find(({ id }) => id >= position.schedule_id)
          : schedules[0];
        if (!schedule) return { rows: [], hasMore: false };
        const start =
          position?.schedule_id === schedule.id
            ? position.start
            : DateTime.fromDateUnsafe(schedule.created_at);
        const through = DateTime.min(DateTime.addDuration(start, shiftWindow), end);
        const rows = yield* readShifts(client, schedule.id, { start, end: through });
        const following = schedules.find(({ id }) => id > schedule.id);
        const next = DateTime.isLessThan(through, end)
          ? { schedule_id: schedule.id, start: through }
          : following && {
              schedule_id: following.id,
              start: DateTime.fromDateUnsafe(following.created_at),
            };
        return {
          rows,
          hasMore: next !== undefined,
          ...(next
            ? {
                nextPageCursor: yield* Schema.encodeEffect(ShiftCursorSchema)(next).pipe(
                  Effect.mapError(shiftCursorError),
                ),
              }
            : {}),
        };
      }),
  });

export const makeScheduleShifts = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "schedule_shifts",
    rowSchema: ScheduleShiftSchema,
    version: "version",
    ...listSources(
      listSchedules(client).pipe(
        Effect.flatMap((schedules) =>
          Effect.forEach(schedules, (schedule) => readShifts(client, schedule.id)),
        ),
        Effect.map(Arr.flatten),
      ),
    ),
    backfill: backfillShifts(client),
    webhook: {
      schema: WebhookTargetSchema,
      handler: ({ payload }) => readShifts(client, payload.id),
    },
  });

export const makeScheduleOverrides = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "schedule_overrides",
    rowSchema: ScheduleOverrideSchema,
    version: "version",
    ...listSources(
      listSchedules(client).pipe(
        Effect.flatMap((schedules) =>
          Effect.forEach(schedules, (schedule) =>
            listAll(client, {
              path: "/v2/schedule_overrides",
              key: "overrides",
              item: ScheduleOverrideObjectSchema,
              params: { schedule_id: schedule.id, page_size: "250" },
            }),
          ),
        ),
        Effect.map((overrides) =>
          overrides.flat().map(({ user, ...override }) => ({
            ...override,
            version: override.updated_at,
            user_id: user?.id,
          })),
        ),
      ),
    ),
  });

export const makeNotificationPauses = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "on_call_notification_pauses",
    rowSchema: NotificationPauseSchema,
    version: "version",
    ...listSources(
      listAll(client, {
        path: "/v2/on_call_notification_pauses",
        key: "on_call_notification_pauses",
        item: NotificationPauseObjectSchema,
        // Without `from`, only active and upcoming pauses come back.
        params: { page_size: "250", from: "2000-01-01T00:00:00Z" },
      }).pipe(
        Effect.map((pauses) => pauses.map((pause) => ({ ...pause, version: pause.updated_at }))),
      ),
    ),
  });

export const makeMaintenanceWindows = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "maintenance_windows",
    rowSchema: MaintenanceWindowSchema,
    version: "version",
    ...listSources(
      listAll(client, {
        path: "/v1/maintenance_windows",
        key: "maintenance_windows",
        item: MaintenanceWindowObjectSchema,
        params: { page_size: "50" },
      }).pipe(
        Effect.map((windows) =>
          windows.map(({ lead, owning_team_ids, ...window }) => ({
            ...window,
            version: window.updated_at,
            lead_user_id: lead.user?.id,
            owning_team_ids: owning_team_ids ?? [],
          })),
        ),
      ),
    ),
  });

export const makeCallRoutes = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "call_routes",
    rowSchema: CallRouteSchema,
    version: "version",
    ...listSources(
      listAll(client, {
        path: "/v2/call_routes",
        key: "call_routes",
        item: CallRouteObjectSchema,
        params: { page_size: "250" },
      }).pipe(Effect.map((items) => items.map((item) => ({ ...item, version: item.updated_at })))),
    ),
  });

export const makePayConfigs = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "pay_configs",
    rowSchema: PayConfigSchema,
    version: "version",
    ...listSources(
      listAll(client, {
        path: "/v2/pay_configs",
        key: "pay_configs",
        item: PayConfigObjectSchema,
        params: { page_size: "250" },
      }).pipe(Effect.map((items) => items.map((item) => ({ ...item, version: item.updated_at })))),
    ),
  });

const toPayReport = ({ creator, ...report }: PayReportObject): PayReport => ({
  ...report,
  version: report.updated_at,
  creator_user_id: creator?.user?.id,
});

export const makePayReports = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "pay_reports",
    rowSchema: PayReportSchema,
    version: "version",
    ...listSources(
      listAll(client, {
        path: "/v2/pay_reports",
        key: "pay_reports",
        item: PayReportObjectSchema,
        params: { page_size: "50" },
      }).pipe(Effect.map((reports) => reports.map(toPayReport))),
    ),
  });

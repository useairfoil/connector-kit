import { ConnectorError, Resource } from "@useairfoil/connector-kit";
import { Array as Arr, Effect, Option, Predicate, Schema } from "effect";

import type { ZendeskClientService } from "../client/client";

import { asText } from "../schemas/shared";
import {
  FieldChangeEventSchema,
  type ExportAudit,
  ExportAuditSchema,
  ExportEventSchema,
  type TicketAudit,
  TicketAuditSchema,
  type TicketFieldChange,
  TicketFieldChangeSchema,
  type TicketMetricEvent,
  type TicketMetricEventObject,
  TicketMetricEventObjectSchema,
  TicketMetricEventSchema,
  isFieldChangeEvent,
} from "../schemas/ticket-events";
import { timeExport } from "./exports";

const TicketAuditPageSchema = Schema.Struct({
  ticket_events: Schema.Array(ExportAuditSchema),
  end_time: Schema.NullOr(Schema.Number),
  end_of_stream: Schema.Boolean,
});

// Keys that aren't the changed field. `added_tags` and `removed_tags` come with `tags`.
const eventKeys = new Set([
  "id",
  "via",
  "via_reference_id",
  "event_type",
  "previous_value",
  "rel",
  "revision_id",
  "added_tags",
  "removed_tags",
]);

const decodeChange = (value: unknown) =>
  Schema.decodeUnknownEffect(FieldChangeEventSchema)(value).pipe(
    Effect.mapError(
      (cause) =>
        new ConnectorError({ message: "Zendesk ticket change event does not decode", cause }),
    ),
  );

// Custom fields come as `custom_ticket_fields: { [fieldId]: value }`.
const changedField = (event: object) =>
  Arr.findFirst(Object.entries(event), ([key]) => !eventKeys.has(key)).pipe(
    Option.flatMap(([key, value]) =>
      key === "custom_ticket_fields" && Predicate.isObject(value)
        ? Arr.head(Object.entries(value))
        : Option.some([key, value] as const),
    ),
  );

const toChanges = (audit: ExportAudit) =>
  Effect.forEach(audit.child_events.filter(isFieldChangeEvent), (child) =>
    decodeChange(child).pipe(
      Effect.map((event) =>
        Option.toArray(changedField(event)).map(
          ([name, value]): TicketFieldChange => ({
            id: event.id,
            version: audit.created_at,
            ticket_id: audit.ticket_id,
            updater_id: audit.updater_id,
            event_type: event.event_type,
            field_name: name,
            value: asText(value),
            previous_value: event.previous_value ?? null,
            via: event.via,
          }),
        ),
      ),
    ),
  ).pipe(Effect.map((changes) => changes.flat()));

export const makeTicketFieldHistory = (client: ZendeskClientService) =>
  Resource.entity({
    name: "ticket_field_history",
    rowSchema: TicketFieldChangeSchema,
    version: "version",
    ...timeExport({
      client,
      path: "/incremental/ticket_events",
      schema: TicketAuditPageSchema,
      rows: (page) =>
        Effect.forEach(page.ticket_events, toChanges).pipe(Effect.map((rows) => rows.flat())),
    }),
  });

const TicketMetricEventPageSchema = Schema.Struct({
  ticket_metric_events: Schema.Array(TicketMetricEventObjectSchema),
  end_time: Schema.NullOr(Schema.Number),
  end_of_stream: Schema.Boolean,
});

// `deleted` is set on the events of a deleted ticket. Tickets can be restored,
// so other rows send `_deleted: false`.
const toMetricEvent = ({
  deleted,
  sla,
  status,
  ...event
}: TicketMetricEventObject): TicketMetricEvent => ({
  ...event,
  version: event.time,
  _deleted: deleted,
  sla_policy_id: sla?.policy.id ?? null,
  sla_target_in_seconds: sla?.target_in_seconds ?? null,
  sla_business_hours: sla?.business_hours ?? null,
  status_calendar: status?.calendar ?? null,
  status_business: status?.business ?? null,
});

export const makeTicketMetricEvents = (client: ZendeskClientService) =>
  Resource.entity({
    name: "ticket_metric_events",
    rowSchema: TicketMetricEventSchema,
    version: "version",
    ...timeExport({
      client,
      path: "/incremental/ticket_metric_events",
      schema: TicketMetricEventPageSchema,
      rows: (page) => Effect.succeed(page.ticket_metric_events.map(toMetricEvent)),
    }),
  });

const decodeEvent = (value: unknown) =>
  Schema.decodeUnknownEffect(ExportEventSchema)(value).pipe(
    Effect.mapError(
      (cause) => new ConnectorError({ message: "Zendesk ticket event does not decode", cause }),
    ),
  );

const toAudit = (audit: ExportAudit) =>
  Effect.forEach(audit.child_events, decodeEvent).pipe(
    Effect.map(
      (events): TicketAudit => ({
        id: audit.id,
        version: audit.created_at,
        ticket_id: audit.ticket_id,
        author_id: audit.updater_id,
        created_at: audit.created_at,
        events: events.map((event) => {
          const field = isFieldChangeEvent(event)
            ? Option.getOrUndefined(changedField(event))
            : undefined;
          return {
            id: event.id,
            type: event.event_type,
            field_name: field?.[0],
            value: field === undefined ? undefined : asText(field[1]),
            previous_value: event.previous_value,
            public: event.comment_public,
          };
        }),
      }),
    ),
  );

export const makeTicketAudits = (client: ZendeskClientService) =>
  Resource.entity({
    name: "ticket_audits",
    rowSchema: TicketAuditSchema,
    version: "version",
    ...timeExport({
      client,
      path: "/incremental/ticket_events",
      schema: TicketAuditPageSchema,
      rows: (page) => Effect.forEach(page.ticket_events, toAudit),
    }),
  });

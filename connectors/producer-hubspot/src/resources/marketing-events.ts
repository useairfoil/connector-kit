import { Cursor, Fetch, Resource } from "@useairfoil/connector-kit";
import { Duration, Effect, Option, Stream } from "effect";

import { HUBSPOT_API_VERSION, type HubSpotClientService } from "../client/client";
import { listPage } from "../schemas/api";
import {
  type MarketingEvent,
  type MarketingEventObject,
  MarketingEventObjectSchema,
  MarketingEventSchema,
  type MarketingParticipation,
  MarketingParticipationSchema,
  ParticipationObjectSchema,
} from "../schemas/marketing";

const eventsPath = `/marketing/marketing-events/${HUBSPOT_API_VERSION}`;
const EventPageSchema = listPage(MarketingEventObjectSchema);
const ParticipationPageSchema = listPage(ParticipationObjectSchema);
// Events have no updated-since filter, so changes read them all.
const changesInterval = Duration.hours(1);

const afterParam = (after: string | undefined): Readonly<Record<string, string>> =>
  after === undefined ? {} : { after };

// The first changes cursor is the backfill cutoff.
const changesAfter = (cursor: string) =>
  cursor.startsWith("after:") ? cursor.slice(6) : undefined;

const toEventRow = (event: MarketingEventObject, fetchedAt: Date): MarketingEvent => ({
  id: event.objectId,
  version: fetchedAt,
  event_name: event.eventName,
  event_type: event.eventType,
  event_status: event.eventStatus,
  event_organizer: event.eventOrganizer,
  event_description: event.eventDescription,
  event_url: event.eventUrl,
  external_event_id: event.externalEventId,
  event_cancelled: event.eventCancelled,
  event_completed: event.eventCompleted,
  start_date_time: event.startDateTime,
  end_date_time: event.endDateTime,
  registrants: event.registrants,
  attendees: event.attendees,
  cancellations: event.cancellations,
  no_shows: event.noShows,
  created_at: event.createdAt,
  updated_at: event.updatedAt,
});

const readEvents = (client: HubSpotClientService, limit: string, after?: string) =>
  client.get(EventPageSchema, eventsPath, { limit, ...afterParam(after) }).pipe(
    Effect.map(({ body, fetchedAt }) => ({
      rows: body.results.map((event) => toEventRow(event, fetchedAt)),
      next: body.paging?.next.after,
    })),
  );

export const makeMarketingEvents = (client: HubSpotClientService) =>
  Resource.entity({
    name: "marketing_events",
    rowSchema: MarketingEventSchema,
    version: "version",

    check: readEvents(client, "1").pipe(Effect.asVoid),
    backfill: Fetch.page({
      pageCursor: Cursor.string(),
      cutoff: Cursor.isoDateTime(),
      fetch: ({ pageCursor }) =>
        readEvents(client, "100", typeof pageCursor === "string" ? pageCursor : undefined).pipe(
          Effect.map(({ rows, next }) => ({
            rows,
            nextPageCursor: next,
            hasMore: next !== undefined,
          })),
        ),
    }),
    changes: Fetch.changes({
      cursor: Cursor.string(),
      interval: changesInterval,
      fetch: ({ cursor }) =>
        readEvents(client, "100", changesAfter(String(cursor))).pipe(
          Effect.map(({ rows, next }) => ({
            rows,
            cursor: next === undefined ? "" : `after:${next}`,
            hasMore: next !== undefined,
          })),
        ),
    }),
  });

const eventParticipations = (client: HubSpotClientService, eventId: string) =>
  Stream.paginate(Option.none<string>(), (after) =>
    client
      .get(ParticipationPageSchema, `${eventsPath}/participations/${eventId}/breakdown`, {
        limit: "100",
        ...afterParam(Option.getOrUndefined(after)),
      })
      .pipe(
        Effect.map(
          ({ body, fetchedAt }) =>
            [
              body.results.map(
                ({ id, associations, properties }): MarketingParticipation => ({
                  id,
                  version: fetchedAt,
                  event_id: eventId,
                  contact_id: associations.contact.contactId,
                  attendance_state: properties.attendanceState,
                  occurred_at: properties.occurredAt,
                  attendance_duration_seconds: properties.attendanceDurationSeconds,
                  attendance_percentage: properties.attendancePercentage,
                }),
              ),
              Option.map(Option.fromNullishOr(body.paging?.next.after), Option.some),
            ] as const,
        ),
      ),
  ).pipe(Stream.runCollect);

const readParticipations = (client: HubSpotClientService, limit: string, after?: string) =>
  client.get(EventPageSchema, eventsPath, { limit, ...afterParam(after) }).pipe(
    Effect.flatMap(({ body }) =>
      Effect.forEach(body.results, (event) => eventParticipations(client, event.objectId), {
        concurrency: 4,
      }).pipe(Effect.map((rows) => ({ rows: rows.flat(), next: body.paging?.next.after }))),
    ),
  );

export const makeMarketingParticipations = (client: HubSpotClientService) =>
  Resource.entity({
    name: "marketing_event_participation",
    rowSchema: MarketingParticipationSchema,
    version: "version",

    check: client.get(EventPageSchema, eventsPath, { limit: "1" }).pipe(
      Effect.flatMap(({ body }) =>
        Effect.forEach(body.results, (event) =>
          client.get(
            ParticipationPageSchema,
            `${eventsPath}/participations/${event.objectId}/breakdown`,
            { limit: "1" },
          ),
        ),
      ),
      Effect.asVoid,
    ),
    backfill: Fetch.page({
      pageCursor: Cursor.string(),
      cutoff: Cursor.isoDateTime(),
      fetch: ({ pageCursor }) =>
        readParticipations(
          client,
          "100",
          typeof pageCursor === "string" ? pageCursor : undefined,
        ).pipe(
          Effect.map(({ rows, next }) => ({
            rows,
            nextPageCursor: next,
            hasMore: next !== undefined,
          })),
        ),
    }),
    changes: Fetch.changes({
      cursor: Cursor.string(),
      interval: changesInterval,
      fetch: ({ cursor }) =>
        readParticipations(client, "100", changesAfter(String(cursor))).pipe(
          Effect.map(({ rows, next }) => ({
            rows,
            cursor: next === undefined ? "" : `after:${next}`,
            hasMore: next !== undefined,
          })),
        ),
    }),
  });

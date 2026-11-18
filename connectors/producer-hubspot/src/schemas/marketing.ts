import * as Iceberg from "@useairfoil/connector-kit/iceberg";
import { Schema } from "effect";

import { Long, Timestamp, version } from "./shared";

const optional = <S extends Schema.Top>(schema: S) => Schema.optional(Schema.NullOr(schema));
const text = (description: string) =>
  optional(Schema.String).pipe(Schema.annotateKey({ description }));
const count = (description: string) =>
  optional(Schema.BigInt).pipe(Schema.annotateKey({ description }));

export const MarketingEventSchema = Schema.Struct({
  id: Schema.String.pipe(
    Schema.annotateKey({ description: "CRM object ID of the marketing event." }),
  ),
  version,
  event_name: Schema.String.pipe(Schema.annotateKey({ description: "Event name." })),
  event_type: text("Kind of event, such as WEBINAR."),
  event_status: text("Event status."),
  event_organizer: text("Event organizer."),
  event_description: text("Event description."),
  event_url: text("Public event URL."),
  external_event_id: text("Event ID in the app that created it."),
  event_cancelled: optional(Schema.Boolean).pipe(
    Schema.annotateKey({ description: "Whether the event was cancelled." }),
  ),
  event_completed: optional(Schema.Boolean).pipe(
    Schema.annotateKey({ description: "Whether the event has ended." }),
  ),
  start_date_time: optional(Schema.Date).pipe(
    Schema.annotateKey({ description: "Scheduled start of the event." }),
  ),
  end_date_time: optional(Schema.Date).pipe(
    Schema.annotateKey({ description: "Scheduled end of the event." }),
  ),
  registrants: count("Number of registrations."),
  attendees: count("Number of attendees."),
  cancellations: count("Number of cancelled registrations."),
  no_shows: count("Number of registrants who did not attend."),
  created_at: optional(Schema.Date).pipe(
    Schema.annotateKey({ description: "Time the event was created." }),
  ),
  updated_at: optional(Schema.Date).pipe(
    Schema.annotateKey({ description: "Time the event last changed." }),
  ),
})
  .annotate({ description: "HubSpot marketing events and their attendance counts." })
  .pipe(Iceberg.identifier("id"));

export type MarketingEvent = Schema.Schema.Type<typeof MarketingEventSchema>;

export const MarketingParticipationSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Participation record ID." })),
  version,
  event_id: Schema.String.pipe(Schema.annotateKey({ description: "Marketing event ID." })),
  contact_id: Schema.String.pipe(Schema.annotateKey({ description: "Contact ID." })),
  attendance_state: Schema.String.pipe(
    Schema.annotateKey({ description: "REGISTERED, ATTENDED, CANCELLED, or NO_SHOW." }),
  ),
  occurred_at: Schema.Date.pipe(
    Schema.annotateKey({ description: "Time the participation happened." }),
  ),
  attendance_duration_seconds: count("Time the contact spent at the event, in seconds."),
  attendance_percentage: text("Share of the event the contact attended."),
})
  .annotate({ description: "Contact registration and attendance for marketing events." })
  .pipe(Iceberg.identifier("id"));

export type MarketingParticipation = Schema.Schema.Type<typeof MarketingParticipationSchema>;

export const MarketingEventObjectSchema = Schema.Struct({
  objectId: Schema.String,
  eventName: Schema.String,
  eventType: optional(Schema.String),
  eventStatus: optional(Schema.String),
  eventOrganizer: optional(Schema.String),
  eventDescription: optional(Schema.String),
  eventUrl: optional(Schema.String),
  externalEventId: optional(Schema.String),
  eventCancelled: optional(Schema.Boolean),
  eventCompleted: optional(Schema.Boolean),
  startDateTime: optional(Timestamp),
  endDateTime: optional(Timestamp),
  registrants: optional(Long),
  attendees: optional(Long),
  cancellations: optional(Long),
  noShows: optional(Long),
  createdAt: optional(Timestamp),
  updatedAt: optional(Timestamp),
});

export type MarketingEventObject = Schema.Schema.Type<typeof MarketingEventObjectSchema>;

export const ParticipationObjectSchema = Schema.Struct({
  id: Schema.String,
  associations: Schema.Struct({ contact: Schema.Struct({ contactId: Schema.String }) }),
  properties: Schema.Struct({
    occurredAt: Timestamp,
    attendanceState: Schema.String,
    attendanceDurationSeconds: optional(Long),
    attendancePercentage: optional(Schema.String),
  }),
});

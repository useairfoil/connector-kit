import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { Long, Timestamp, UnixSeconds, deleted, ticketCustomFields } from "./shared";

const minutes = (description: string) =>
  Schema.Struct({
    calendar: Schema.NullOr(Long).pipe(
      Schema.annotateKey({ description: "Minutes in calendar hours." }),
    ),
    business: Schema.NullOr(Long).pipe(
      Schema.annotateKey({ description: "Minutes in business hours." }),
    ),
  }).pipe(Schema.annotateKey({ description }));

const MetricsSchema = Schema.Struct({
  replies: Long.pipe(Schema.annotateKey({ description: "Number of agent replies." })),
  reopens: Long.pipe(
    Schema.annotateKey({ description: "Number of times the ticket was reopened." }),
  ),
  assignee_stations: Long.pipe(
    Schema.annotateKey({ description: "Number of assignees the ticket had." }),
  ),
  group_stations: Long.pipe(
    Schema.annotateKey({ description: "Number of groups the ticket had." }),
  ),
  reply_time_in_minutes: minutes("Time to the first agent reply."),
  first_resolution_time_in_minutes: minutes("Time to the first solve."),
  full_resolution_time_in_minutes: minutes("Time to the last solve."),
  agent_wait_time_in_minutes: minutes("Time spent pending, waiting on the agent."),
  requester_wait_time_in_minutes: minutes("Time spent waiting on the requester."),
  on_hold_time_in_minutes: minutes("Time spent on hold."),
  assigned_at: Schema.NullOr(Timestamp).pipe(
    Schema.annotateKey({ description: "Time of the last assignment." }),
  ),
  initially_assigned_at: Schema.NullOr(Timestamp).pipe(
    Schema.annotateKey({ description: "Time of the first assignment." }),
  ),
  solved_at: Schema.NullOr(Timestamp).pipe(
    Schema.annotateKey({ description: "Time the ticket was last solved." }),
  ),
  latest_comment_added_at: Schema.NullOr(Timestamp).pipe(
    Schema.annotateKey({ description: "Time of the latest comment." }),
  ),
  status_updated_at: Schema.NullOr(Timestamp).pipe(
    Schema.annotateKey({ description: "Time the status last changed." }),
  ),
});

export const TicketSchema = Schema.Struct({
  id: Long.pipe(Schema.annotateKey({ description: "Ticket ID." })),
  version: Schema.Date.pipe(
    Schema.annotateKey({
      description: "Time Zendesk last changed the ticket, system updates included.",
    }),
  ),
  _deleted: deleted("ticket"),
  created_at: Timestamp.pipe(Schema.annotateKey({ description: "Time the ticket was created." })),
  updated_at: Timestamp.pipe(
    Schema.annotateKey({ description: "Time someone last updated the ticket." }),
  ),
  subject: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Ticket subject." }),
  ),
  description: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Text of the first comment." }),
  ),
  status: Schema.String.pipe(
    Schema.annotateKey({
      description: "Status: new, open, pending, hold, solved, closed, or deleted.",
    }),
  ),
  custom_status_id: Schema.NullOr(Long).pipe(
    Schema.annotateKey({ description: "Custom status ID, in `custom_statuses`." }),
  ),
  priority: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Priority: low, normal, high, or urgent." }),
  ),
  type: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Type: problem, incident, question, or task." }),
  ),
  via: Schema.Struct({
    channel: Schema.String.pipe(
      Schema.annotateKey({ description: "Channel, such as email, web, or api." }),
    ),
  }).pipe(Schema.annotateKey({ description: "How the ticket was created." })),
  requester_id: Schema.NullOr(Long).pipe(
    Schema.annotateKey({ description: "User who asked for help." }),
  ),
  submitter_id: Schema.NullOr(Long).pipe(
    Schema.annotateKey({ description: "User who created the ticket." }),
  ),
  assignee_id: Schema.NullOr(Long).pipe(
    Schema.annotateKey({ description: "Agent assigned to the ticket." }),
  ),
  organization_id: Schema.NullOr(Long).pipe(
    Schema.annotateKey({ description: "Organization of the requester." }),
  ),
  group_id: Schema.NullOr(Long).pipe(
    Schema.annotateKey({ description: "Group assigned to the ticket." }),
  ),
  brand_id: Schema.NullOr(Long).pipe(Schema.annotateKey({ description: "Brand of the ticket." })),
  ticket_form_id: Schema.NullOr(Long).pipe(
    Schema.annotateKey({ description: "Form of the ticket." }),
  ),
  problem_id: Schema.NullOr(Long).pipe(
    Schema.annotateKey({ description: "Problem ticket this incident is linked to." }),
  ),
  due_at: Schema.NullOr(Timestamp).pipe(
    Schema.annotateKey({ description: "Due time of a task ticket." }),
  ),
  external_id: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "ID in another system." }),
  ),
  is_public: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the ticket has a public comment." }),
  ),
  satisfaction_rating: Schema.NullOr(
    Schema.Struct({
      score: Schema.String.pipe(
        Schema.annotateKey({ description: "Score: offered, unoffered, good, or bad." }),
      ),
      comment: Schema.optional(Schema.NullOr(Schema.String)).pipe(
        Schema.annotateKey({ description: "Comment left with the rating." }),
      ),
    }),
  ).pipe(
    Schema.annotateKey({
      description: "Customer satisfaction. The full answers are in `survey_responses`.",
    }),
  ),
  tags: Schema.Array(Schema.String).pipe(Schema.annotateKey({ description: "Ticket tags." })),
  custom_fields: Schema.ReadonlyMap(Schema.String, Schema.String).pipe(
    Schema.annotateKey({
      description: "Custom field values by field ID, in `ticket_fields`. Lists are JSON.",
    }),
  ),
  metrics: Schema.NullOr(MetricsSchema).pipe(
    Schema.annotateKey({ description: "Reply, wait, and resolution times." }),
  ),
})
  .annotate({ description: "Zendesk tickets, with their metrics." })
  .pipe(Iceberg.identifier("id"));

export type Ticket = Schema.Schema.Type<typeof TicketSchema>;

export const TicketObjectSchema = TicketSchema.mapFields((fields) => ({
  ...Struct.omit(fields, ["version", "_deleted", "custom_fields", "metrics"]),
  generated_timestamp: UnixSeconds,
  custom_fields: ticketCustomFields,
}));

export type TicketObject = Schema.Schema.Type<typeof TicketObjectSchema>;

export const MetricSetSchema = Schema.Struct({ ticket_id: Long, ...MetricsSchema.fields });

export type MetricSet = Schema.Schema.Type<typeof MetricSetSchema>;

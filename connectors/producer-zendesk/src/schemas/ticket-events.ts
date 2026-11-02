import { Iceberg } from "@useairfoil/connector-kit";
import { Schema } from "effect";

import { TicketEventSchema } from "./comments";
import { Long, TextOrJson, Timestamp, deleted } from "./shared";

export const TicketFieldChangeSchema = Schema.Struct({
  id: Long.pipe(Schema.annotateKey({ description: "Change ID." })),
  version: Schema.Date.pipe(Schema.annotateKey({ description: "Time of the ticket update." })),
  ticket_id: Long.pipe(Schema.annotateKey({ description: "Ticket that changed." })),
  updater_id: Long.pipe(
    Schema.annotateKey({ description: "User who made the update. -1 for Zendesk itself." }),
  ),
  event_type: Schema.String.pipe(
    Schema.annotateKey({ description: "Create for the first value, or Change." }),
  ),
  field_name: Schema.String.pipe(
    Schema.annotateKey({
      description: "Field that changed, such as status, or a custom field ID from `ticket_fields`.",
    }),
  ),
  value: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "New value. Lists are JSON." }),
  ),
  previous_value: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Value before the change. Empty for Create and for tags." }),
  ),
  via: Schema.String.pipe(
    Schema.annotateKey({ description: "What made the change, such as Web form or Rule." }),
  ),
})
  .annotate({ description: "Every change to a Zendesk ticket field, one row per field." })
  .pipe(Iceberg.identifier("id"));

export type TicketFieldChange = Schema.Schema.Type<typeof TicketFieldChangeSchema>;

export const isFieldChangeEvent = Schema.is(
  Schema.Struct({ event_type: Schema.Literals(["Create", "Change"]) }),
);

/** The changed field is the one key left over, named after the field. */
export const FieldChangeEventSchema = Schema.StructWithRest(
  Schema.Struct({
    id: Long,
    via: Schema.String,
    event_type: Schema.String,
    previous_value: Schema.optional(TextOrJson),
  }),
  [Schema.Record(Schema.String, Schema.Unknown)],
);

export type FieldChangeEvent = Schema.Schema.Type<typeof FieldChangeEventSchema>;

export const TicketAuditSchema = TicketEventSchema.mapFields((fields) => ({
  ...fields,
  updater_id: Long,
}));

export type TicketAudit = Schema.Schema.Type<typeof TicketAuditSchema>;

export const TicketMetricEventSchema = Schema.Struct({
  id: Long.pipe(Schema.annotateKey({ description: "Event ID." })),
  version: Schema.Date.pipe(Schema.annotateKey({ description: "Time of the event." })),
  _deleted: deleted("ticket"),
  ticket_id: Schema.NullOr(Long).pipe(
    Schema.annotateKey({ description: "Ticket the event is on." }),
  ),
  metric: Schema.String.pipe(
    Schema.annotateKey({
      description: "Metric, such as reply_time, agent_work_time, or resolution_time.",
    }),
  ),
  instance_id: Long.pipe(
    Schema.annotateKey({ description: "Which run of the metric. Reply time counts each reply." }),
  ),
  type: Schema.String.pipe(
    Schema.annotateKey({
      description:
        "activate, pause, fulfill, apply_sla, breach, update_status, measure, and others.",
    }),
  ),
  time: Timestamp.pipe(Schema.annotateKey({ description: "Time of the event." })),
  sla_policy_id: Schema.NullOr(Long).pipe(
    Schema.annotateKey({ description: "SLA policy, on apply_sla events." }),
  ),
  sla_target_in_seconds: Schema.NullOr(Long).pipe(
    Schema.annotateKey({ description: "SLA target, on apply_sla events." }),
  ),
  sla_business_hours: Schema.NullOr(Schema.Boolean).pipe(
    Schema.annotateKey({ description: "Whether the SLA target counts business hours." }),
  ),
  status_calendar: Schema.NullOr(Long).pipe(
    Schema.annotateKey({
      description: "Minutes so far in calendar time, on update_status events.",
    }),
  ),
  status_business: Schema.NullOr(Long).pipe(
    Schema.annotateKey({
      description: "Minutes so far in business hours, on update_status events.",
    }),
  ),
})
  .annotate({
    description:
      "Zendesk ticket metric events: SLA targets and breaches, and each step of reply and resolution times.",
  })
  .pipe(Iceberg.identifier("id"));

export type TicketMetricEvent = Schema.Schema.Type<typeof TicketMetricEventSchema>;

export const TicketMetricEventObjectSchema = Schema.Struct({
  id: Long,
  ticket_id: Schema.NullOr(Long),
  metric: Schema.String,
  instance_id: Long,
  type: Schema.String,
  time: Timestamp,
  deleted: Schema.Boolean,
  sla: Schema.optional(
    Schema.Struct({
      target_in_seconds: Long,
      business_hours: Schema.Boolean,
      policy: Schema.Struct({ id: Long }),
    }),
  ),
  status: Schema.optional(Schema.Struct({ calendar: Long, business: Long })),
});

export type TicketMetricEventObject = Schema.Schema.Type<typeof TicketMetricEventObjectSchema>;

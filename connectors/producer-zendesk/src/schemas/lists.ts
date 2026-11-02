import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { Json, Long, TextOrJson, Timestamp, keyedCustomFields, version } from "./shared";

const common = (object: string) => ({
  id: Long.pipe(Schema.annotateKey({ description: `${object} ID.` })),
  version: version(object.toLowerCase()),
  created_at: Timestamp.pipe(
    Schema.annotateKey({ description: `Time the ${object.toLowerCase()} was created.` }),
  ),
  updated_at: Timestamp.pipe(
    Schema.annotateKey({ description: `Time the ${object.toLowerCase()} was last updated.` }),
  ),
});

export const GroupSchema = Schema.Struct({
  ...common("Group"),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Group name." })),
  description: Schema.String.pipe(Schema.annotateKey({ description: "Group description." })),
  default: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether new tickets go to this group by default." }),
  ),
  is_public: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether all agents can see the group." }),
  ),
})
  .annotate({ description: "Zendesk agent groups." })
  .pipe(Iceberg.identifier("id"));

export const BrandSchema = Schema.Struct({
  ...common("Brand"),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Brand name." })),
  subdomain: Schema.String.pipe(Schema.annotateKey({ description: "Brand subdomain." })),
  brand_url: Schema.String.pipe(Schema.annotateKey({ description: "Brand URL." })),
  active: Schema.Boolean.pipe(Schema.annotateKey({ description: "Whether the brand is active." })),
  default: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether this is the default brand." }),
  ),
})
  .annotate({ description: "Zendesk brands." })
  .pipe(Iceberg.identifier("id"));

export const TicketFieldSchema = Schema.Struct({
  ...common("Ticket field"),
  type: Schema.String.pipe(
    Schema.annotateKey({ description: "Field type, such as text, tagger, or checkbox." }),
  ),
  title: Schema.String.pipe(Schema.annotateKey({ description: "Field title shown to agents." })),
  raw_title: Schema.String.pipe(
    Schema.annotateKey({ description: "Title with any dynamic content placeholder." }),
  ),
  active: Schema.Boolean.pipe(Schema.annotateKey({ description: "Whether the field is active." })),
  required: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether agents must fill it to solve a ticket." }),
  ),
  custom_field_options: Schema.Array(
    Schema.Struct({
      id: Long.pipe(Schema.annotateKey({ description: "Option ID." })),
      name: Schema.String.pipe(Schema.annotateKey({ description: "Option name." })),
      value: Schema.String.pipe(
        Schema.annotateKey({ description: "Option value, as stored in `custom_fields`." }),
      ),
    }),
  ).pipe(Schema.annotateKey({ description: "Options of a dropdown or multi-select field." })),
})
  .annotate({
    description: "Zendesk ticket fields. Names the IDs in `tickets.custom_fields`.",
  })
  .pipe(Iceberg.identifier("id"));

export const TicketFormSchema = Schema.Struct({
  ...common("Ticket form"),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Form name." })),
  display_name: Schema.String.pipe(
    Schema.annotateKey({ description: "Form name shown to end users." }),
  ),
  active: Schema.Boolean.pipe(Schema.annotateKey({ description: "Whether the form is active." })),
  default: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether this is the default form." }),
  ),
  ticket_field_ids: Schema.Array(Long).pipe(
    Schema.annotateKey({ description: "Fields on the form, in order." }),
  ),
})
  .annotate({ description: "Zendesk ticket forms." })
  .pipe(Iceberg.identifier("id"));

export const CustomStatusSchema = Schema.Struct({
  ...common("Custom status"),
  status_category: Schema.String.pipe(
    Schema.annotateKey({
      description: "Status it belongs to: new, open, pending, hold, or solved.",
    }),
  ),
  agent_label: Schema.String.pipe(Schema.annotateKey({ description: "Name shown to agents." })),
  end_user_label: Schema.String.pipe(
    Schema.annotateKey({ description: "Name shown to end users." }),
  ),
  active: Schema.Boolean.pipe(Schema.annotateKey({ description: "Whether the status is active." })),
  default: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether this is the default for its category." }),
  ),
})
  .annotate({ description: "Zendesk ticket statuses. Names `tickets.custom_status_id`." })
  .pipe(Iceberg.identifier("id"));

const fieldDefinition = (object: string) => ({
  ...common(`${object} field`),
  key: Schema.String.pipe(
    Schema.annotateKey({ description: `Key in \`${object.toLowerCase()}_fields\`.` }),
  ),
  type: Schema.String.pipe(
    Schema.annotateKey({ description: "Field type, such as text, dropdown, or checkbox." }),
  ),
  title: Schema.String.pipe(Schema.annotateKey({ description: "Field title." })),
  active: Schema.Boolean.pipe(Schema.annotateKey({ description: "Whether the field is active." })),
  position: Long.pipe(Schema.annotateKey({ description: "Position of the field." })),
  custom_field_options: Schema.Array(
    Schema.Struct({
      id: Long.pipe(Schema.annotateKey({ description: "Option ID." })),
      name: Schema.String.pipe(Schema.annotateKey({ description: "Option name." })),
      value: Schema.String.pipe(Schema.annotateKey({ description: "Option value." })),
    }),
  ).pipe(Schema.annotateKey({ description: "Options of a dropdown field." })),
});

export const UserFieldSchema = Schema.Struct(fieldDefinition("User"))
  .annotate({
    description: "Zendesk user fields. Names the keys in `users.user_fields`.",
  })
  .pipe(Iceberg.identifier("id"));

export const OrganizationFieldSchema = Schema.Struct(fieldDefinition("Organization"))
  .annotate({
    description:
      "Zendesk organization fields. Names the keys in `organizations.organization_fields`.",
  })
  .pipe(Iceberg.identifier("id"));

export const SlaPolicySchema = Schema.Struct({
  ...common("SLA policy"),
  title: Schema.String.pipe(Schema.annotateKey({ description: "Policy name." })),
  description: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Policy description." }),
  ),
  position: Long.pipe(Schema.annotateKey({ description: "Order in which policies are matched." })),
  filter: Schema.String.pipe(
    Schema.annotateKey({ description: "Conditions a ticket must match, as JSON." }),
  ),
  policy_metrics: Schema.Array(
    Schema.Struct({
      priority: Schema.String.pipe(
        Schema.annotateKey({ description: "Ticket priority the target applies to." }),
      ),
      metric: Schema.String.pipe(
        Schema.annotateKey({ description: "Metric, such as first_reply_time." }),
      ),
      target_in_seconds: Long.pipe(Schema.annotateKey({ description: "Target time in seconds." })),
      business_hours: Schema.Boolean.pipe(
        Schema.annotateKey({ description: "Whether the target counts business hours." }),
      ),
    }),
  ).pipe(Schema.annotateKey({ description: "Targets by priority and metric." })),
})
  .annotate({ description: "Zendesk SLA policies. Names the policies in `ticket_metric_events`." })
  .pipe(Iceberg.identifier("id"));

export const HolidaySchema = Schema.Struct({
  id: Long.pipe(Schema.annotateKey({ description: "Holiday ID." })),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Holiday name." })),
  start_date: Schema.String.pipe(Schema.annotateKey({ description: "First day, as YYYY-MM-DD." })),
  end_date: Schema.String.pipe(Schema.annotateKey({ description: "Last day, as YYYY-MM-DD." })),
});

export const ScheduleSchema = Schema.Struct({
  ...common("Schedule"),
  version: Schema.Date.pipe(
    Schema.annotateKey({
      description: "Time the schedule was read. Holidays don't change `updated_at`.",
    }),
  ),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Schedule name." })),
  time_zone: Schema.String.pipe(Schema.annotateKey({ description: "Time zone of the schedule." })),
  intervals: Schema.Array(
    Schema.Struct({
      start_time: Long.pipe(
        Schema.annotateKey({ description: "Start, in minutes from Sunday midnight." }),
      ),
      end_time: Long.pipe(
        Schema.annotateKey({ description: "End, in minutes from Sunday midnight." }),
      ),
    }),
  ).pipe(Schema.annotateKey({ description: "Weekly business hours." })),
  holidays: Schema.Array(HolidaySchema).pipe(Schema.annotateKey({ description: "Days off." })),
})
  .annotate({ description: "Zendesk business hours schedules, with their holidays." })
  .pipe(Iceberg.identifier("id"));

export const CustomRoleSchema = Schema.Struct({
  ...common("Custom role"),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Role name." })),
  description: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Role description." }),
  ),
  role_type: Long.pipe(Schema.annotateKey({ description: "Role type. 0 is a custom agent role." })),
  team_member_count: Long.pipe(Schema.annotateKey({ description: "Agents with the role." })),
  configuration: Schema.ReadonlyMap(Schema.String, Schema.String).pipe(
    Schema.annotateKey({ description: "Permissions by name. Values other than text are JSON." }),
  ),
})
  .annotate({ description: "Zendesk agent roles. Names `users.custom_role_id`." })
  .pipe(Iceberg.identifier("id"));

export const MacroSchema = Schema.Struct({
  ...common("Macro"),
  title: Schema.String.pipe(Schema.annotateKey({ description: "Macro name." })),
  description: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Macro description." }),
  ),
  active: Schema.Boolean.pipe(Schema.annotateKey({ description: "Whether the macro is active." })),
  position: Long.pipe(Schema.annotateKey({ description: "Position of the macro." })),
  actions: Schema.Array(
    Schema.Struct({
      field: Schema.String.pipe(
        Schema.annotateKey({ description: "Ticket field the action sets." }),
      ),
      value: Schema.NullOr(Schema.String).pipe(
        Schema.annotateKey({ description: "Value it sets. Lists are JSON." }),
      ),
    }),
  ).pipe(Schema.annotateKey({ description: "Changes the macro makes to a ticket." })),
  restriction: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Who can use the macro, as JSON. Empty for everyone." }),
  ),
})
  .annotate({ description: "Zendesk macros: saved replies and ticket changes." })
  .pipe(Iceberg.identifier("id"));

// Zendesk's lists leave out deleted items, so our tables keep them. Older
// tickets still get their names.
const objectOf = <F extends Schema.Struct.Fields>(schema: Schema.Struct<F>) =>
  schema.mapFields((fields) => Struct.omit(fields, ["version"]));

export const GroupObjectSchema = objectOf(GroupSchema);
export const BrandObjectSchema = objectOf(BrandSchema);
export const TicketFieldObjectSchema = objectOf(TicketFieldSchema).mapFields((fields) => ({
  ...fields,
  custom_field_options: Schema.optional(fields.custom_field_options),
}));
export const TicketFormObjectSchema = objectOf(TicketFormSchema);
export const CustomStatusObjectSchema = objectOf(CustomStatusSchema);
const FieldDefinitionObjectSchema = objectOf(UserFieldSchema).mapFields((fields) => ({
  ...fields,
  custom_field_options: Schema.optional(fields.custom_field_options),
}));
export const UserFieldObjectSchema = FieldDefinitionObjectSchema;
export const OrganizationFieldObjectSchema = FieldDefinitionObjectSchema;
export const SlaPolicyObjectSchema = objectOf(SlaPolicySchema).mapFields((fields) => ({
  ...fields,
  filter: Json,
}));
export const ScheduleObjectSchema = objectOf(ScheduleSchema).mapFields((fields) =>
  Struct.omit(fields, ["holidays"]),
);
export const CustomRoleObjectSchema = objectOf(CustomRoleSchema).mapFields((fields) => ({
  ...fields,
  configuration: keyedCustomFields,
}));
export const MacroObjectSchema = objectOf(MacroSchema).mapFields((fields) => ({
  ...fields,
  actions: Schema.Array(Schema.Struct({ field: Schema.String, value: TextOrJson })),
  restriction: TextOrJson,
}));

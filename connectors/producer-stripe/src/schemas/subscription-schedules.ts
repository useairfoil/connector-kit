import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { Long, UnixTime, version } from "./shared";

export const SubscriptionScheduleSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Subscription schedule ID." })),
  version,
  created: UnixTime.pipe(
    Schema.annotateKey({ description: "Time when the schedule was created." }),
  ),
  customer: Schema.String.pipe(Schema.annotateKey({ description: "Customer of the schedule." })),
  subscription: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Subscription managed by the schedule." }),
  ),
  released_subscription: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Subscription that was released from the schedule." }),
  ),
  status: Schema.String.pipe(Schema.annotateKey({ description: "Schedule status." })),
  end_behavior: Schema.String.pipe(
    Schema.annotateKey({ description: "What happens after the last phase: release or cancel." }),
  ),
  canceled_at: Schema.optional(Schema.NullOr(UnixTime)).pipe(
    Schema.annotateKey({ description: "Time when the schedule was canceled." }),
  ),
  completed_at: Schema.optional(Schema.NullOr(UnixTime)).pipe(
    Schema.annotateKey({ description: "Time when the schedule completed." }),
  ),
  released_at: Schema.optional(Schema.NullOr(UnixTime)).pipe(
    Schema.annotateKey({ description: "Time when the schedule was released." }),
  ),
  phases: Schema.Array(
    Schema.Struct({
      start_date: UnixTime.pipe(Schema.annotateKey({ description: "Start of the phase." })),
      end_date: UnixTime.pipe(Schema.annotateKey({ description: "End of the phase." })),
      items: Schema.Array(
        Schema.Struct({
          price: Schema.String.pipe(Schema.annotateKey({ description: "Price ID." })),
          quantity: Schema.optional(Long).pipe(
            Schema.annotateKey({ description: "Quantity of the price." }),
          ),
        }),
      ).pipe(Schema.annotateKey({ description: "Prices and quantities in this phase." })),
    }),
  ).pipe(Schema.annotateKey({ description: "Prices scheduled for each phase." })),
})
  .annotate({ description: "Scheduled changes to subscriptions." })
  .pipe(Iceberg.identifier("id"));

export type SubscriptionSchedule = Schema.Schema.Type<typeof SubscriptionScheduleSchema>;

export const SubscriptionScheduleObjectSchema = SubscriptionScheduleSchema.mapFields(
  Struct.omit(["version"]),
);

export type SubscriptionScheduleObject = Schema.Schema.Type<
  typeof SubscriptionScheduleObjectSchema
>;

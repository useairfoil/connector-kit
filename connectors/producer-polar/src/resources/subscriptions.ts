import { Iceberg } from "@useairfoil/connector-kit";
import { Option, Schema } from "effect";

import { CustomFieldDataJsonSchema, MetadataJsonSchema, date, nullableDate } from "./shared";

const SubscriptionInputSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Unique subscription identifier." })),
  created_at: date("Time when the subscription was created."),
  modified_at: nullableDate("Time when the subscription was last changed."),
  amount: Schema.Int.pipe(
    Schema.annotateKey({ description: "Subscription amount in the smallest currency unit." }),
  ),
  currency: Schema.String.pipe(Schema.annotateKey({ description: "Three-letter currency code." })),
  recurring_interval: Schema.Literals(["day", "week", "month", "year"]).pipe(
    Schema.annotateKey({ description: "Unit used for recurring billing." }),
  ),
  recurring_interval_count: Schema.Int.pipe(
    Schema.annotateKey({ description: "Number of recurring billing intervals." }),
  ),
  status: Schema.Literals([
    "incomplete",
    "incomplete_expired",
    "trialing",
    "active",
    "past_due",
    "canceled",
    "unpaid",
    "paused",
  ]).pipe(Schema.annotateKey({ description: "Current subscription status." })),
  current_period_start: date("Start of the current billing period."),
  current_period_end: date("End of the current billing period."),
  current_meter_period_start: nullableDate("Start of the current metered period."),
  current_meter_period_end: nullableDate("End of the current metered period."),
  trial_start: nullableDate("Time when the trial started."),
  trial_end: nullableDate("Time when the trial ends."),
  cancel_at_period_end: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the subscription will cancel at the period end." }),
  ),
  canceled_at: nullableDate("Time when the subscription was canceled."),
  started_at: nullableDate("Time when the subscription started."),
  ends_at: nullableDate("Time when the subscription is set to end."),
  ended_at: nullableDate("Time when the subscription ended."),
  pause_at_period_end: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the subscription will pause at the period end." }),
  ),
  paused_at: nullableDate("Time when the subscription was paused."),
  resumes_at: nullableDate("Time when the subscription resumes."),
  past_due_at: Schema.optional(Schema.NullOr(Schema.DateFromString)).pipe(
    Schema.annotateKey({ description: "Time when the subscription became past due." }),
  ),
  customer_id: Schema.String.pipe(
    Schema.annotateKey({ description: "Customer linked to the subscription." }),
  ),
  product_id: Schema.String.pipe(
    Schema.annotateKey({ description: "Product linked to the subscription." }),
  ),
  discount_id: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Discount linked to the subscription." }),
  ),
  checkout_id: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Checkout that created the subscription." }),
  ),
  customer_cancellation_reason: Schema.NullOr(
    Schema.Literals([
      "customer_service",
      "low_quality",
      "missing_features",
      "switched_service",
      "too_complex",
      "too_expensive",
      "unused",
      "other",
    ]),
  ).pipe(
    Schema.annotateKey({ description: "Reason selected when the subscription was canceled." }),
  ),
  customer_cancellation_comment: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Comment entered when the subscription was canceled." }),
  ),
  seats: Schema.optional(Schema.NullOr(Schema.Int)).pipe(
    Schema.annotateKey({ description: "Number of subscription seats." }),
  ),
  units: Schema.NullOr(Schema.Int).pipe(
    Schema.annotateKey({ description: "Number of subscription units." }),
  ),
  metadata: MetadataJsonSchema.pipe(
    Schema.annotateKey({ description: "Subscription metadata stored as JSON." }),
  ),
  custom_field_data: Schema.optional(CustomFieldDataJsonSchema).pipe(
    Schema.annotateKey({ description: "Subscription custom fields stored as JSON." }),
  ),
});

export const SubscriptionSchema = SubscriptionInputSchema.pipe(
  Schema.extendTo(
    {
      version: Schema.Date.pipe(
        Schema.annotateKey({ description: "Time used to order subscription changes." }),
      ),
    },
    { version: (row) => Option.some(row.modified_at ?? row.created_at) },
  ),
)
  .annotate({
    description: "Subscriptions in a Polar organization.",
  })
  .pipe(Iceberg.identifier("id"));

export type Subscription = Schema.Schema.Type<typeof SubscriptionSchema>;

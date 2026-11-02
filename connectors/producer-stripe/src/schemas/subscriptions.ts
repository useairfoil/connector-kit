import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { Long, Metadata, UnixTime, version } from "./shared";

export const SubscriptionItemSchema = Schema.Struct({
  id: Schema.String.pipe(
    Schema.annotateKey({ description: "Unique subscription item identifier." }),
  ),
  created: UnixTime.pipe(Schema.annotateKey({ description: "Time when the item was created." })),
  price: Schema.Struct({
    id: Schema.String.pipe(Schema.annotateKey({ description: "Price identifier." })),
    product: Schema.String.pipe(
      Schema.annotateKey({ description: "Product the price belongs to." }),
    ),
  }).pipe(Schema.annotateKey({ description: "Price of the item." })),
  // Metered items have no quantity.
  quantity: Schema.optional(Long).pipe(
    Schema.annotateKey({ description: "Quantity billed for the item." }),
  ),
  current_period_start: UnixTime.pipe(
    Schema.annotateKey({ description: "Start of the item's current billing period." }),
  ),
  current_period_end: UnixTime.pipe(
    Schema.annotateKey({ description: "End of the item's current billing period." }),
  ),
});

export type SubscriptionItem = Schema.Schema.Type<typeof SubscriptionItemSchema>;

export const SubscriptionSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Unique subscription identifier." })),
  version,
  created: UnixTime.pipe(
    Schema.annotateKey({ description: "Time when the subscription was created." }),
  ),
  livemode: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the subscription exists in live mode." }),
  ),
  // Stripe documents this as required, but accounts can use customer_account instead.
  customer: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Customer who owns the subscription." }),
  ),
  customer_account: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Account that represents the customer, for Accounts v2." }),
  ),
  status: Schema.String.pipe(
    Schema.annotateKey({
      description: "Status, such as trialing, active, past_due, canceled, unpaid, or paused.",
    }),
  ),
  currency: Schema.String.pipe(
    Schema.annotateKey({ description: "Three-letter currency code, in lowercase." }),
  ),
  collection_method: Schema.String.pipe(
    Schema.annotateKey({
      description: "How invoices are paid: charge_automatically or send_invoice.",
    }),
  ),
  start_date: UnixTime.pipe(
    Schema.annotateKey({ description: "Time when the subscription started. Can be backdated." }),
  ),
  billing_cycle_anchor: UnixTime.pipe(
    Schema.annotateKey({ description: "Reference point for billing dates." }),
  ),
  cancel_at: Schema.NullOr(UnixTime).pipe(
    Schema.annotateKey({ description: "Time when the subscription will cancel." }),
  ),
  cancel_at_period_end: Schema.Boolean.pipe(
    Schema.annotateKey({
      description: "Whether the subscription cancels at the end of the period.",
    }),
  ),
  canceled_at: Schema.NullOr(UnixTime).pipe(
    Schema.annotateKey({ description: "Time when cancellation was requested." }),
  ),
  ended_at: Schema.NullOr(UnixTime).pipe(
    Schema.annotateKey({ description: "Time when the subscription ended." }),
  ),
  trial_start: Schema.NullOr(UnixTime).pipe(
    Schema.annotateKey({ description: "Start of the trial." }),
  ),
  trial_end: Schema.NullOr(UnixTime).pipe(Schema.annotateKey({ description: "End of the trial." })),
  days_until_due: Schema.NullOr(Long).pipe(
    Schema.annotateKey({ description: "Days to pay invoices. Only set for send_invoice." }),
  ),
  default_payment_method: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Default payment method of the subscription." }),
  ),
  latest_invoice: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Most recent invoice." }),
  ),
  schedule: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Subscription schedule, if any." }),
  ),
  description: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Description shown to the customer." }),
  ),
  cancellation_details: Schema.NullOr(
    Schema.Struct({
      reason: Schema.NullOr(Schema.String).pipe(
        Schema.annotateKey({ description: "Why the subscription was canceled." }),
      ),
      feedback: Schema.NullOr(Schema.String).pipe(
        Schema.annotateKey({ description: "Reason the customer picked when canceling." }),
      ),
      comment: Schema.NullOr(Schema.String).pipe(
        Schema.annotateKey({ description: "Free-text comment from the customer." }),
      ),
    }),
  ).pipe(Schema.annotateKey({ description: "Why the subscription was canceled." })),
  pause_collection: Schema.NullOr(
    Schema.Struct({
      behavior: Schema.String.pipe(
        Schema.annotateKey({ description: "What happens to invoices while paused." }),
      ),
      resumes_at: Schema.NullOr(UnixTime).pipe(
        Schema.annotateKey({ description: "Time when collection resumes." }),
      ),
    }),
  ).pipe(
    Schema.annotateKey({
      description: "Paused payment collection. Not the same as status paused.",
    }),
  ),
  items: Schema.Array(SubscriptionItemSchema).pipe(
    Schema.annotateKey({ description: "All items of the subscription." }),
  ),
  metadata: Metadata.pipe(
    Schema.annotateKey({ description: "Key-value pairs set on the subscription." }),
  ),
  test_clock: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Test clock the subscription belongs to. Sandbox only." }),
  ),
})
  .annotate({
    description: "Subscriptions in a Stripe account, including canceled ones.",
  })
  .pipe(Iceberg.identifier("id"));

export type Subscription = Schema.Schema.Type<typeof SubscriptionSchema>;

export const SubscriptionObjectSchema = SubscriptionSchema.mapFields((fields) => ({
  ...Struct.omit(fields, ["version"]),
  items: Schema.Struct({
    data: Schema.Array(SubscriptionItemSchema),
    has_more: Schema.Boolean,
  }),
}));

export type SubscriptionObject = Schema.Schema.Type<typeof SubscriptionObjectSchema>;

export type SubscriptionRow = Omit<Subscription, "version">;

# Stripe producer

- Auth: restricted API key.
- Webhooks: `POST /webhooks/stripe`.
- Changes: one Events API feed for all resources, every 5 min.
- API version: `Stripe-Version: STRIPE_API_VERSION` on every call.
  [Changelog](https://docs.stripe.com/changelog).

## Rules

- Use the `stripe` package only for things with no request, like the webhook
  signature.
- Objects have no reliable update time, events come in any order, and event
  payloads use old API versions. So always fetch the object again. Never build
  a row from the event payload.
- `customer.deleted`, `product.deleted`, `price.deleted`, `invoice.deleted`
  write a delete row without a fetch. A delete wins over other events for the
  same object in a batch.
- `customer.subscription.deleted` means canceled. Fetch it and keep it.
- Stripe filters at most 20 event types, we need more. So the feed reads all
  events and routes by type. Some events like `invoice.upcoming` have no
  object ID.
- Balance transactions have no update event. Once a day, changes list them
  again from the oldest pending one. First run looks back 90 days.
- Meter events can come up to 35 days late. Meter summaries read the last 36
  days again daily. Ended subscriptions are skipped.
- Subscriptions embed max 20 items. Page the rest when `has_more`.

## VCR

Sandbox without test clocks. Remove customer details.

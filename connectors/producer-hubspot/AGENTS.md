# HubSpot producer

- Auth: one service key or static app token, one account.
- Webhooks: `POST /webhooks/hubspot`, only with `HUBSPOT_CLIENT_SECRET`.
- API version: in the path, like `/crm/objects/2026-09/...`. No header.

## Rules

- Search allows 5 req/sec per account, client keeps it at 4. Other calls start
  at 100 per 10 sec, then the limiter uses `X-HubSpot-RateLimit-Max`.
- Full rows come from `batch/read`. The property list is too long for a list
  URL or search body (3,000 chars).
- Search index lags, so search stops 2 min behind now.
- A merged ID returns the record it was merged into. Use the `id` from the
  response.
- Association batch reads page per record. Follow each record's `after`.
- Meetings, communications, invoices, payments, subscriptions, users and deal
  splits reject `archived=true`. Deleted emails are gone right away. So no
  archived scan for these.
- Webhook config uses singular names like `quote`. Meetings is
  `meeting_event`. Deal splits have no webhooks. Custom objects get no
  `associationChange`.
- `X-HubSpot-Signature-v3` is checked with the URL HubSpot called. Skip events
  from other accounts.

## Versions and deletes

- Version is always our fetch time. `updatedAt` doesn't move when calculated
  properties or associations change.
- Webhooks read the record again, the payload is not used. A delete is sent
  only when the record can't be read anymore, so a late delete can't hide a
  restore.
- Rows send `_deleted: false`, so a restored record comes back.
- Always write the whole `properties` map.

## Not synced

- Contracts: scope "isn't available for public use".

## New CRM object

Add it to the webhook config in `hubspot-app/`. `hs project validate` and
`hs project upload` on a test account catch bad object names. Export its row
type and schema from `src/index.ts`.

## VCR

Owner and user names and emails are redacted.

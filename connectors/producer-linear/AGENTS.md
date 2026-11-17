# Linear producer

- Auth: one personal API key with Read. Goes in `Authorization` as it is, no
  `Bearer`.
- Webhooks: `POST /webhooks/linear`, only `remove` and `restore`.
- API version: none, GraphQL only.

## Rules

- Rate limit is HTTP 400 with code `RATELIMITED`. Retry, max 10 min apart.
- GraphQL errors can come with HTTP 200. "Entity not found" means the item is
  missing.
- `first` max 250, query cost max 10,000 points. A nested connection
  multiplies cost by its `first`, so use small pages there. Check cost with
  `X-Complexity`.
- `Linear-Signature` on the raw body. Reject `webhookTimestamp` older than 1 min.
- Changes use `updatedAt` with 1 min overlap.
- `includeArchived` is always on, archived and trashed items stay as rows.
- GraphQL `Float` is `Finite`, `Int` is `Long`. Rename a provider field named
  `version`, that name is the row version.

## Versions and deletes

- Polled rows use `updated_at`.
- Archive, trash, delete and restore don't move `updatedAt`, so polling never
  sees them. Linear sends `remove` for all three. The webhook reads the item
  again and sends a delete only when it's really gone. These rows use webhook
  time.
- Only 14 types have webhooks. Deletes on others (relations, memberships,
  milestones) aren't seen. Release webhooks need the Business plan.
- Archive and restore also refresh `issue_history`, they don't move the issue
  `updatedAt`.

## VCR

Emails are redacted.

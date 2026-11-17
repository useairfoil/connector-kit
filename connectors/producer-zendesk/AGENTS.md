# Zendesk producer

- Auth: one OAuth client, client credentials grant, one account.
- Webhooks: none.

## Rules

- Incremental exports allow 10 calls/min, shared with every other tool on the
  account. Users export has its own 20. These limiters ignore headers, else
  they pick up the account limit. Space calls evenly, a full bucket bursts
  over the limit.
- Token asks for `read`, Schedules and Talk have no smaller scope. Always ask
  `expires_in`, else tokens never expire and pile up in the account.
- Use cursor exports where they exist (tickets, users), others are time based.
  Articles and Talk exports have no `end_of_stream`. Talk `next_page` is never
  null, an empty page is the end.
- Zendesk holds back the last minute. First changes run starts 1 min before
  the cutoff.
- Lists use `page[size]` cursor paging. Custom statuses, SLA policies, roles,
  schedules, Talk lines and custom objects have none. Survey APIs max 50/page.
- A comment event shows the comment as it is now. After a comment or
  attachment redaction, read the ticket comments again. Skip `404` for deleted
  tickets. Privacy changes have no child events, not caught.
- Survey answers can change for 28 days, the list filters by send time. So
  read from 29 days before the saved cursor. Skip responses with no answers.

## Versions and deletes

- Tickets use `generated_timestamp`, `updated_at` misses system updates.
- Comments use ticket event time. Survey responses use the latest answer's
  `updated_at`.
- Schedules and Talk lines use read time: holidays don't move `updated_at`,
  lines have none. Others use `updated_at`.
- Deleted tickets have `status: "deleted"` and can be restored, so ticket rows
  send `_deleted: false`.
- Users (`active: false`) and orgs (`deleted_at`) can't be restored, their
  other rows leave `_deleted` out.
- Memberships keep seen IDs in the cursor and send deletes for ones gone.

## VCR

Build the connector once in the VCR test. A second token request replays the
redacted token.

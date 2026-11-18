# Facebook Ads producer

- Auth: system user token with `ads_read`, one or more ad accounts.
- Webhooks: none. Meta's ad account webhooks don't cover object changes.
- API version: `API_VERSION` in the URL. A call on an expired version moves to
  the next one, only if the endpoint didn't change.

## Rules

- Error codes 4, 17, 613, 80000, 80004 are usage limits. Wait and retry, max
  10 min apart. A sandbox on Limited access hits 17 fast.
- Only `paging.next` means there is a next page. Cursors can go stale, don't
  keep them across runs.
- Lists hide archived and deleted objects unless asked. `effective_status`
  rejects DELETED, so use `filtering` on `<object>.effective_status`. A
  deleted object comes as a row with status `DELETED` and can't be restored.
- Counts and money are numeric strings. Times have an offset, like
  `2026-10-19T10:00:00+0530`.
- Campaigns have no `updated_since`, so changes read all of them. Ad sets and
  ads use `updated_since`, starting 5 min early.
- Insights: one account, one day per request, in the account's time zone.
  Monthly tables read whole months, keyed by the first day. Older than 37
  months fails with code 3018.
- `impression_device` and `frequency_value` need admin opt-in, so left out.
- Version is fetch time. Meta's docs say a budget change doesn't move
  `updated_time`.

## VCR

Sandbox ad account. A sandbox never delivers ads, so insights field types
aren't checked live.

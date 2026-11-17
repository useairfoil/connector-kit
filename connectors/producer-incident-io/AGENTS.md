# incident.io producer

- Auth: one org API key with read-only roles.
- Webhooks: `POST /webhooks/incident-io`. Every event reads the record again.
- API version: none global. Each endpoint has its own, like `/v2/incidents`
  or `/v3/follow_ups`. Use the newest non-deprecated one from the
  [spec](https://api.incident.io/v1/openapiV3.json).

## Rules

- Stop paging only when `pagination_meta.after` is missing. Page size max is
  different per list (25 to 10,000, `incident_alerts` is 50). Check `maximum`
  in the spec.
- `schedule_entries`: send `pagination_meta.after` back as
  `entry_window_start`, same end.
- Listing incidents has its own limit, 60/min, in a separate bucket.
  `X-RateLimit-Limit` has many limits in one header, so the client doesn't
  read it.
- Incident and escalation date filters only take `yyyy-mm-dd`, a full
  timestamp gets 422. `lte` leaves that day out. So we filter the full time
  ourselves.
- Rows can commit with an older `updated_at`, so changes start 5 min early.
- Incidents list hides test and tutorial incidents. Follow-ups and actions
  take one `incident_mode` per call. We ask for every mode.
- Alert notes need `alert_id`. Read alerts with `has_notes[is]=true`, then
  notes.
- Notification pauses list only active and upcoming unless `from` is set.
- Webhooks come via Svix. `standardwebhooks` takes the `whsec_` secret as it
  is. Events can come out of order, private ones only have an ID.
- Some per-incident lists like participants change without moving the
  incident `updated_at`. So the feed also reads open incidents.
- A failure in the feed or a webhook stops all its tables. Call sessions,
  transcripts and workloads need extra roles, so they poll alone with no
  webhooks.
- Workflow runs filter only by `created_at` and can finish days later, so they
  are read in full hourly.
- Slack fields can be missing, on Teams or while the channel is being made.
- Only `schedules` has `_deleted`, from `schedule.deleted_v1`. No incident
  deletes.

## Not synced

- `alert_attachments`: needs an alert or group ID, the spec doesn't say so.

## Tests

Cassette is from a real org, read-only key. Fixtures in `test/fixtures/` are
spec examples, copy new ones as they are.

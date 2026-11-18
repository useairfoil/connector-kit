# Salesforce producer

- Auth: client credentials with an External Client App, one org.
- Webhooks: none. Push needs Change Data Capture over gRPC.
- API version: in the path, like `/services/data/v68.0/sobjects`.

## Rules

- Token has no expiry and no refresh token. It lasts one session timeout (min
  15 min), so renew every 7.5 min.
- No 429. `403 REQUEST_LIMIT_EXCEEDED` means the daily or concurrent limit is
  used. Wait and retry, up to every 30 min.
- Full rows from `POST /composite/sobjects/{object}` with `ids` and `fields`.
  Docs say `recordIds` and `fieldNames`, the API rejects them. Fields go in the
  body, wide objects pass the URL limit.
- Changes use `getUpdated` and `getDeleted`, never a `SystemModstamp` query.
  Salesforce says those can miss records from running transactions.
- Next window starts at `latestDateCovered`, can be hours behind, so records
  repeat. Fine, version is fetch time. Each call has its own
  `latestDateCovered`, keep the earliest.
- Windows are whole minutes, seconds are ignored. A new org rejects windows
  before its replication start. `getDeleted` goes back 15 days only, an older
  cursor fails and needs a backfill.
- Objects not `replicateable` are read in full hourly. `BusinessHours` and
  `Organization` reject `getDeleted`.

## Versions and deletes

- `SystemModstamp` doesn't move when a formula reads a changed record. So
  version is our clock.
- Delete uses the time `getDeleted` was read. Sent only when the record can't
  be read anymore, so a restore in the same window wins.
- Always write the whole `fields` map.

## New standard object

Check it's `replicateable` and supports `getDeleted`, then add it to `objects`
in `src/manifest.ts`.

## VCR

Admin email and username redacted. Test covers one object of each kind, every
describe is ~100 KB.

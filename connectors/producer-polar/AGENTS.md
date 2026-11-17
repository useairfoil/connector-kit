# Polar producer

- Webhooks: `POST /webhooks/polar`. Endpoints pick their own API version, set
  it to `POLAR_API_VERSION`.
- API version: `Polar-Version` header. New version every quarter, old one
  removed after ~9 months. Specs at
  `https://polar.sh/docs/openapi/<version>.openapi.json`,
  [changelog](https://polar.sh/docs/changelog/api).

## Rules

- Paging uses `page` and `limit`, max 100. Use `Retry-After` on 429.
- Webhook secrets made before 8 Sep 2026 need base64 of the full string. Newer
  ones go as they are. We try both.
- Subscriptions can't sort by `created_at`, so use `-started_at`. Keep the
  cutoff on `created_at`.
- Payments and disputes have no webhooks and can't sort by `modified_at`.
  Changes read new ones by `created_at` and read open ones again by ID.
- Unknown events get 200 and no row. A known event with a bad payload fails.

## Versions and deletes

- Backfill uses `modified_at ?? created_at`. Webhooks use event time.
- Customers get `_deleted` from `deleted_at`, also on `customer.deleted`.
- `discount.deleted` sends `_deleted: true`. Other discount rows leave it out,
  a deleted discount can't come back.

## VCR

Sandbox. Remove checkout secrets and customer details.

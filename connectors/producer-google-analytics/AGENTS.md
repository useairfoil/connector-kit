# Google Analytics producer

- Auth: service account JSON key, signed as RS256 JWT, one property.
- Webhooks: none.
- API version: `v1beta` in the URL. Every call is a Data API `runReport`.

## Rules

- One request: max 9 dimensions, 10 metrics, 4 date ranges. Earliest day is
  2015-08-14.
- Every value is a string. `TYPE_INTEGER` is `long`. Float, currency and
  seconds are `double`. `keyEvents` is a float.
- An empty report has no `rows` or `rowCount`. A report with no dimensions has
  no `dimensionHeaders`, so every request asks for `date`.
- 429 `RESOURCE_EXHAUSTED` can be the quota or the 10 concurrent requests
  limit. Retry fast first, then wait, max 10 min apart.
- 500 and 503 use a small server error quota, so only normal retries.
- Order by every dimension, or offset pages aren't stable.
- Days are in the property time zone, from `metadata.timeZone`.
- Numbers change for a few days, so changes read the last `GA_LOOKBACK_DAYS`
  again.
- `cohort_retention` needs 7 days of data, so each day is read 7 days late.
- A row missing in a later read isn't deleted.

## New report

Check fields with `checkCompatibility` and types in `metricHeaders`. Use only
pairs Google shows in its own reports.

## VCR

Test property, on a day after the seeded data is processed.

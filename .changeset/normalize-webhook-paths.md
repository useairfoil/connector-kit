---
"@useairfoil/producer-github": minor
"@useairfoil/producer-hubspot": minor
"@useairfoil/producer-incident-io": minor
"@useairfoil/producer-linear": minor
"@useairfoil/producer-polar": minor
"@useairfoil/producer-shopify": minor
"@useairfoil/producer-stripe": minor
---

Normalize all connector webhook endpoints to `POST /webhook`. Update provider
webhook URLs from `/webhooks/<provider>` to `/webhook` when upgrading; the old
paths are no longer served.

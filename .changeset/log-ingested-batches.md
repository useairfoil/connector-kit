---
"@useairfoil/connector-kit": minor
"@useairfoil/producer-facebook-ads": patch
"@useairfoil/producer-github": patch
"@useairfoil/producer-google-analytics": patch
"@useairfoil/producer-hubspot": patch
"@useairfoil/producer-incident-io": patch
"@useairfoil/producer-linear": patch
"@useairfoil/producer-polar": patch
"@useairfoil/producer-salesforce": patch
"@useairfoil/producer-shopify": patch
"@useairfoil/producer-stripe": patch
"@useairfoil/producer-zendesk": patch
---

Log `batch ingested` with source, resource, row count, and cursor after every successful batch, regardless of the ingestor. Replace `Ingestor.layerConsole` with a silent `Ingestor.layerNoop` for sandbox runs.

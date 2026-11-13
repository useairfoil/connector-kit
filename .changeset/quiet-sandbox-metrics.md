---
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

Stop dumping metrics to stdout in sandbox mode. Keep normal logs, the metrics endpoint, and OTLP export.

Use single-line logfmt output in sandbox and hosted runs so log attributes stay on the same line as the message.

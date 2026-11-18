---
"@useairfoil/producer-polar": patch
---

Wait for Polar's `Retry-After` on rate limits instead of timing out. The request timeout now covers each attempt, not the waits between them.

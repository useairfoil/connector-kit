---
"@useairfoil/connector-kit": minor
---

Add per-route webhook status to the status endpoint, including the path,
acknowledgement mode, latest HTTP outcome, timestamped safe error summary, and last request
time. Observations reset on restart and are null before the first request. A
successful request clears the previous error. With after-enqueue acknowledgement,
success means the request was accepted and queued, not that ingestion finished.

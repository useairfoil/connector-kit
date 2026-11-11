---
name: review-airfoil-connector
description: Check what an existing Airfoil connector syncs. Use to find missing provider data or gaps in an existing table.
---

# Review a connector

Keep the review read-only.

## Check the provider

Read the root and connector `AGENTS.md` files. Check the client and config
for the API version, product, auth, and scopes. Name the API areas and
accounts you're reviewing. Start with public docs and recorded responses.

Download sources with `curl`, not WebFetch. Save them in your own folder in
the scratchpad, so parallel reviews don't overwrite each other. Search large
files or read them in parts.

Use the official spec, schema, or object list. Check the reference index and
changelog for reads it misses. Record the source revision or date.
See [where to look](references/providers.md).

Check lists under parent records, relationships, history, exports, and
webhook data. Check what a call does before running it. A POST can read
records and a GET can start a job.

Ask what one row represents. Count alternate reads of the same records once.
An order and an order item are different rows.

## Check what we write

Read the manifest and table schemas. Follow the read to the rows we write.
Check what backfill, changes, and webhooks fetch, including child pages and
refetches. For shared tables, check which objects qualify.

Say what we store as its own rows, nest in another row, store in part,
or leave out. Check whether a field holds the record or just its ID or a
summary. If the resource only needs a table binding, call it a setup issue.

Check why we skip known resources and whether the reason still holds.
Flag reads that need another API version, product, auth, scope, or plan.
Say which ones still need an account check.

## Report the gaps

Put the useful gaps first. Link the provider read and the local code.
Say why the data matters and what might make it hard to sync.

For a full review, list the source sections and record a result for every
read or event, including aliases and exclusions. Compare the list with the
source to catch missing or repeated entries. Call the review partial if
any section, dataset, or access rule in scope is still open. Say what
would settle it.

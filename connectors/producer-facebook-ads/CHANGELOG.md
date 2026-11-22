# Change Log - @useairfoil/producer-facebook-ads

<!-- This log was last generated on Thu, 29 Oct 2026 08:35:20 GMT and should not be manually modified. -->

<!-- Start content -->

## 0.1.5

### Patch Changes

- Updated dependencies [6f77858]
  - @useairfoil/connector-kit@0.11.1

## 0.1.4

### Patch Changes

- 21ebfbd: Expose resource descriptions in connector manifests using the same text as table comments.
  Add `Iceberg.resolveDescription(schema)` to read schema description annotations.
- Updated dependencies [21ebfbd]
  - @useairfoil/connector-kit@0.11.0

## 0.1.3

### Patch Changes

- f0a85af: Sync daily and monthly Meta insights by account, campaign, and ad set.

  Sync ad activity, creatives, custom audiences, and custom conversions.

  Keep outbound clicks, video metrics, and attributed action counts and values.

  Keep ad set targeting and attribution settings.

- Updated dependencies [f64079a]
  - @useairfoil/connector-kit@0.10.1

## 0.1.2

### Patch Changes

- e3886f7: Log `batch ingested` with source, resource, row count, and cursor after every successful batch, regardless of the ingestor. Replace `Ingestor.layerConsole` with a silent `Ingestor.layerNoop` for sandbox runs.
- bcab8e9: Stop dumping metrics to stdout in sandbox mode. Keep normal logs, the metrics endpoint, and OTLP export.

  Use single-line logfmt output in sandbox and hosted runs so log attributes stay on the same line as the message.

- Updated dependencies [e3886f7]
- Updated dependencies [65daf45]
  - @useairfoil/connector-kit@0.10.0

## 0.1.1

### Patch Changes

- Updated dependencies [921dd17]
  - @useairfoil/connector-kit@0.9.0

## 0.1.0

### Minor Changes

- 95a25a4: Export `commitSha` from every connector with `GIT_COMMIT` embedded at build time,
  or `undefined` when it is not set.

## 0.0.4

### Patch Changes

- fbbee5b: Add connector setup metadata, connection checks, and verification-only webhook commands.
- Updated dependencies [fbbee5b]
  - @useairfoil/connector-kit@0.8.0

## 0.0.3

### Patch Changes

- d5fb3b5: refactor: rename wings-related packages
- d5fb3b5: Let the catalog assign field IDs instead of storing IDs in row schemas.
- 3cb46f1: Add setup to create or verify configured tables before start and demo.
- Updated dependencies [d5fb3b5]
- Updated dependencies [d5fb3b5]
- Updated dependencies [d5fb3b5]
- Updated dependencies [d5fb3b5]
- Updated dependencies [0d4a9da]
- Updated dependencies [d5fb3b5]
- Updated dependencies [d5fb3b5]
- Updated dependencies [d5fb3b5]
- Updated dependencies [d5fb3b5]
- Updated dependencies [d5fb3b5]
- Updated dependencies [d5fb3b5]
- Updated dependencies [d5fb3b5]
- Updated dependencies [d5fb3b5]
- Updated dependencies [d5fb3b5]
- Updated dependencies [4e94276]
  - @useairfoil/connector-kit@0.7.0

## 0.0.2

Thu, 29 Oct 2026 08:35:20 GMT

### Patches

- add linked demo data for Facebook Ads (jadejajaipal5@gmail.com)
- add the Facebook Ads producer connector (jadejajaipal5@gmail.com)
- update Effect dependencies to 4.0.7 (jadejajaipal5@gmail.com)

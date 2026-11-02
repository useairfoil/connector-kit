# Change Log - @useairfoil/connector-kit

<!-- This log was last generated on Thu, 29 Oct 2026 08:35:20 GMT and should not be manually modified. -->

<!-- Start content -->

## 0.7.0

### Minor Changes

- d5fb3b5: Rename layerWings, layerWingsConfig, and WingsIngestorConfig to layerArrowFlight, layerArrowFlightConfig, and ArrowFlightIngestorConfig.
- d5fb3b5: Create tables through the REST catalog and use catalog-assigned field IDs. Remove explicit field ID annotations and replace makeCreateTableCommitRequest with makeCreateTableRequest.
- d5fb3b5: Rename WINGS_URI to ENGINE_URI and runtime configuration wingsUri to engineUri. Rename the engine-backed table helper and its URI option accordingly. Update hosted configuration to use ENGINE_URI; the old key is no longer read.

### Patch Changes

- d5fb3b5: Use the renamed @useairfoil/api client package.
- d5fb3b5: Update apache-arrow to 21.2.0.
- 0d4a9da: Create connector tables with setup and bounded catalog retries. Configure checkpoint intervals during setup and pipeline demo writes.
- d5fb3b5: readme: cleanup package readmes
- d5fb3b5: Make demo ingestion batch sizes configurable through the CLI and run options.
- d5fb3b5: Allow setting table creation properties and add a demo checkpoint interval flag.
- d5fb3b5: Make the demo seed optional and generate random data when it is omitted.
- d5fb3b5: Parse demo sizes with human-format and show human-readable sizes in demo logs.
- d5fb3b5: Support FLIGHT_URI for ingestion, defaulting to ENGINE_URI when unset.
- d5fb3b5: Read OTEL_EXPORTER_OTLP_HEADERS with Config.Record and URL-decode header values.
- d5fb3b5: Prepare missing namespaces and validate unencrypted, unpartitioned v3 tables for ingestion and repeated create-table commands.
- 4e94276: Disable flaky test
- Updated dependencies [d5fb3b5]
- Updated dependencies [d5fb3b5]
- Updated dependencies [d5fb3b5]
- Updated dependencies [d5fb3b5]
- Updated dependencies [d5fb3b5]
  - @useairfoil/api@0.5.0

## 0.6.1

Thu, 29 Oct 2026 08:35:20 GMT

### Patches

- update to Effect v4 stable (jadejajaipal5@gmail.com)
- add one-off connector demo mode and update Effect dependencies to 4.0.7 (jadejajaipal5@gmail.com)
- run only the resources that have a table binding (jadejajaipal5@gmail.com)
- connector-kit: use explicit field IDs in Iceberg schemas (jadejajaipal5@gmail.com)
- add Metrics.retrySchedule, rename the delete column to \_deleted, and rerun changes while more pages remain (jadejajaipal5@gmail.com)
- replace publishers with iceberg native ingestor (jadejajaipal5@gmail.com)
- name row keys with `Iceberg.identifier` and send full rows (jadejajaipal5@gmail.com)
- add shared change feeds and include source errors in logs (jadejajaipal5@gmail.com)

## 0.6.0

Mon, 24 Aug 2026 18:56:59 GMT

### Minor changes

- connector-kit: add operator-ready hosted bindings and OTel metrics (jadejajaipal5@gmail.com)

## 0.5.3

Thu, 13 Aug 2026 17:12:03 GMT

### Patches

- connector-kit: add numeric manifest constraints (jadejajaipal5@gmail.com)
- connector-kit: add hosted config and durable state (jadejajaipal5@gmail.com)
- feat: add connector configuration checks (jadejajaipal5@gmail.com)
- connector-kit: manifest, add metrics and status endpoints (jadejajaipal5@gmail.com)
- chore: support Effect v4 RC (jadejajaipal5@gmail.com)
- connector-kit: add expiring provider token cache (jadejajaipal5@gmail.com)
- connector-kit: add runtime health and observability (jadejajaipal5@gmail.com)

## 0.5.0

Fri, 19 Jun 2026 12:39:54 GMT

### Minor changes

- feat: improve webhook handling, add telemetry support and update runConnector (jadejajaipal5@gmail.com)

### Patches

- ack: refactor (jadejajaipal5@gmail.com)
- connector-kit: add Telemetry.layer and Telemetry.layerConfig (jadejajaipal5@gmail.com)
- connector-kit: publish to Wings tables (jadejajaipal5@gmail.com)
- connector-kit: surface error in telemetry & fix sandbox entrypoints (jadejajaipal5@gmail.com)
- feat(connector-kit): add OTel span instrumentation (jadejajaipal5@gmail.com)
- connector-kit: add connector app runtime APIs (jadejajaipal5@gmail.com)
- connector-kit: add resource mutation runtime (jadejajaipal5@gmail.com)

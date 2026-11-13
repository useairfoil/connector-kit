# Change Log - @useairfoil/producer-shopify

<!-- This log was last generated on Thu, 29 Oct 2026 08:35:20 GMT and should not be manually modified. -->

<!-- Start content -->

## 0.3.0

### Minor Changes

- 95a25a4: Export `commitSha` from every connector with `GIT_COMMIT` embedded at build time,
  or `undefined` when it is not set.

## 0.2.3

### Patch Changes

- fbbee5b: Add connector setup metadata, connection checks, and verification-only webhook commands.
- Updated dependencies [fbbee5b]
  - @useairfoil/connector-kit@0.8.0

## 0.2.2

### Patch Changes

- d5fb3b5: Let the catalog assign field IDs instead of storing IDs in row schemas.
- 3cb46f1: Add setup to create or verify configured tables before start and demo.
- d5fb3b5: refactor: rename wings-related packages
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

## 0.2.1

Thu, 29 Oct 2026 08:35:20 GMT

### Patches

- name table keys and read customers again on webhooks (jadejajaipal5@gmail.com)
- add linked demo data for Shopify (jadejajaipal5@gmail.com)
- connectors: create Iceberg tables on startup and via CLI (jadejajaipal5@gmail.com)
- extend the Shopify producer with customers, orders, and refunds (jadejajaipal5@gmail.com)
- update the test ingestor for batch results and update Effect dependencies to 4.0.7 (jadejajaipal5@gmail.com)
- update to Effect v4 stable (jadejajaipal5@gmail.com)
- use the iceberg native connector ingestion runtime (jadejajaipal5@gmail.com)
- simplify retries and pagination, pin the API version, and update webhook and delete handling (jadejajaipal5@gmail.com)
- refresh rejected access tokens and use valid default table names (jadejajaipal5@gmail.com)

## 0.2.0

Mon, 24 Aug 2026 18:56:59 GMT

### Minor changes

- producer-shopify: adopt shared hosted runtime bindings (jadejajaipal5@gmail.com)

## 0.1.1

Thu, 13 Aug 2026 17:12:03 GMT

### Patches

- producer-shopify: add client credentials and harden product sync (jadejajaipal5@gmail.com)
- producers: report API retry metrics (jadejajaipal5@gmail.com)
- producers: add manifest and sub path (jadejajaipal5@gmail.com)
- chore: support Effect v4 RC (jadejajaipal5@gmail.com)
- producer-shopify: handle API throttling and retries (jadejajaipal5@gmail.com)
- feat: add connector configuration check and dockerfile (jadejajaipal5@gmail.com)
- producers: adopt hosted config and PostgreSQL state (jadejajaipal5@gmail.com)

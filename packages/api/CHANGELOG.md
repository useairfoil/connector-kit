# Change Log - @useairfoil/wings

<!-- This log was last generated on Thu, 29 Oct 2026 08:35:20 GMT and should not be manually modified. -->

<!-- Start content -->

## 0.5.0

### Minor Changes

- d5fb3b5: Match the engine catalog API: createCatalog returns void for an empty 201 response, and getCatalog returns a bare id instead of name.

### Patch Changes

- d5fb3b5: Update apache-arrow to 21.2.0.
- d5fb3b5: Allow a separate Arrow Flight endpoint and rename the catalog manager baseUrl option to engineUri.
- d5fb3b5: Rename @useairfoil/wings to @useairfoil/api, preserving its exports and runtime behavior.
- d5fb3b5: Connect to registered Iceberg catalogs directly with their configured HTTP credentials.
- Updated dependencies [d5fb3b5]
- Updated dependencies [225e545]
  - @useairfoil/flight@0.4.9

## 0.4.7

Thu, 29 Oct 2026 08:35:20 GMT

### Patches

- cancel active ingestion calls when their scope closes (jadejajaipal5@gmail.com)
- replace the client APIs with new catalog management and ingestion APIs (jadejajaipal5@gmail.com)
- update Effect dependencies to 4.0.7 (jadejajaipal5@gmail.com)
- update to Effect v4 stable (jadejajaipal5@gmail.com)

## 0.4.5

Mon, 24 Aug 2026 18:56:59 GMT

### Patches

- wings: harden publisher lifecycle and table bindings (jadejajaipal5@gmail.com)

## 0.4.4

Thu, 13 Aug 2026 17:12:03 GMT

### Patches

- chore: support Effect v4 RC (jadejajaipal5@gmail.com)
- chore: upgrade Effect beta packages (jadejajaipal5@gmail.com)

## 0.4.1

Fri, 19 Jun 2026 12:39:54 GMT

### Patches

- wings: update protobufs and new wings API's (jadejajaipal5@gmail.com)
- wings: good refactor (jadejajaipal5@gmail.com)
- wings: disallow null partition values (jadejajaipal5@gmail.com)
- chore: fix tests (jadejajaipal5@gmail.com)
- wings: support delete ingestion pushes (jadejajaipal5@gmail.com)

## 0.1.0

Wed, 28 Jan 2026 15:18:35 GMT

### Minor changes

- Switch SDK to Effect.ts (francesco@ceccon.me)

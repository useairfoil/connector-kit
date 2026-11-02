# Change Log - @useairfoil/wings-testing

<!-- This log was last generated on Thu, 29 Oct 2026 08:35:20 GMT and should not be manually modified. -->

<!-- Start content -->

## 0.2.0

### Minor Changes

- d5fb3b5: Expose separate host and engine catalog URLs instead of guessing a shared LAN address. Remove AIRFOIL_TEST_CATALOG_HOST; external fixtures can set engineIcebergRestUri explicitly.
- d5fb3b5: Expose accessKeyId and secretAccessKey on test engine instances and share their constants across the engine and SeaweedFS configuration.

### Patch Changes

- d5fb3b5: readme: cleanup package readmes
- d5fb3b5: Fix test engine startup with explicit storage host mapping, local HTTP S3 access, and a readiness check for the dev server. Preserve startup error causes.
- d5fb3b5: Rename @useairfoil/wings-testing to @useairfoil/testing and export the fixture as TestEngine.
- 0d4a9da: Run storage engine fixtures on alpha10.
- d5fb3b5: Update the integration fixture for the current storage engine and support table publication checks.
- d5fb3b5: Publish integration data using the current engine worker and wait for a new Iceberg snapshot instead of invoking removed materialize and commit commands.

## 0.1.6

Thu, 29 Oct 2026 08:35:20 GMT

### Patches

- update to Effect v4 stable (jadejajaipal5@gmail.com)
- update Effect dependencies to 4.0.7 (jadejajaipal5@gmail.com)
- update test instances for the Wings HTTP and Iceberg REST endpoints (jadejajaipal5@gmail.com)

## 0.1.4

Thu, 13 Aug 2026 17:12:03 GMT

### Patches

- chore: support Effect v4 RC (jadejajaipal5@gmail.com)

## 0.1.1

Fri, 19 Jun 2026 12:39:54 GMT

### Patches

- wings: upgrade local dev stack to wings alpha 14 (jadejajaipal5@gmail.com)
- wings-testing: improve effect standards (jadejajaipal5@gmail.com)

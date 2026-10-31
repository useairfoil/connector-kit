# Airfoil testing

Use this package when a test needs the storage engine.

## Install

```bash
pnpm add -D @useairfoil/testing effect@^4
```

## Usage

```ts
import { TestEngine } from "@useairfoil/testing";
import { Effect } from "effect";

const uri = TestEngine.Instance.use((engine) => engine.uri).pipe(
  Effect.provide(TestEngine.container),
  Effect.scoped,
);
```

Docker is required. `icebergRestUri` reaches the catalog from the test process;
`engineIcebergRestUri` reaches the same catalog from the engine container.
Use the engine address when registering a catalog for ingestion, and the host
address for direct Iceberg client calls. Separate registrations can point to
the same catalog and tables. No host LAN address is needed.

Use the instance's `accessKeyId` and `secretAccessKey` properties when registering
S3 catalog credentials instead of copying the fixture's values.

Use `materializeAndCommit(catalogId, table)` to publish ingested rows before
querying them. It starts a scoped worker and waits up to 90 seconds for a new
Iceberg snapshot, then stops the worker. Use `it.live` for tests that call it,
because polling needs a live clock. External instances need their workers run
separately.

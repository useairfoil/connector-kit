# Airfoil testing

This package provides an Effect layer to spin up the Airfoir storage engine and
its dependencies in a container.

Docker is required.

## Install

```bash
pnpm add -D @useairfoil/testing effect@^4
```

## Usage

```ts
import { TestEngine } from "@useairfoil/testing";
import { Effect } from "effect";

Effect.gen(function* () {
  const engine = yield* TestEngine.Instance;
  const uri = yield* engine.uri;
  const icebergRestUri = yield* engine.icebergRestUri;
});
```

## API

**TestEngine.Instance**

- `uri: Effect<string>`: the engine's uri.
- `icebergRestUri: Effect<string>`: the iceberg rest catalog uri.
- `engineIcebergRestUri: Effect<string>`: the iceberg rest catalog, reachable from inside the container.
- `accessKeyId` and `secretAccessKey`: the S3 credentials.
- `materializeAndCommit(catalogId, table)`: publish the ingested rows and wait for a new iceberg snapshot.

Use the engine address when registering a catalog for ingestion, and the host
address for direct Iceberg client calls. Separate registrations can point to
the same catalog and tables. No host LAN address is needed.

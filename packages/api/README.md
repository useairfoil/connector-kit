# Airfoil API

This package has the Effect clients for Wings catalogs and Arrow Flight
ingestion.

## Install

```bash
pnpm add @useairfoil/api effect@^4
```

## Usage

```ts
import { CatalogManager } from "@useairfoil/api";
import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/http";

const catalog = CatalogManager.getCatalog("analytics").pipe(
  Effect.provide(
    CatalogManager.layer({ baseUrl: "http://localhost:7777" }).pipe(
      Layer.provide(FetchHttpClient.layer),
    ),
  ),
);
```

Use `CatalogManager.ingestor(...)` inside `Effect.scoped`. The first batch
sets the Arrow schema. Later batches on that stream must use the same schema.

`getIcebergCatalog(id)` connects directly to the registered catalog URI. The
caller needs network access to that URI. Requests use the registered `token`
and `header.*` properties for authentication and headers.

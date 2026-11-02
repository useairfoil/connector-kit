import type { RecordBatch, TypeMap } from "apache-arrow";

import { describe, expect, it } from "@effect/vitest";
import { CatalogManager, type Ingestor as ApiIngestor, IngestorError } from "@useairfoil/api";
import { ConfigProvider, Effect, Layer, Ref, Schema } from "effect";

import { Connector, Resource } from "../src/core";
import { ConnectorError } from "../src/errors";
import { identifier as icebergIdentifier } from "../src/iceberg/annotations";
import { layerArrowFlight, layerArrowFlightConfig } from "../src/ingestor/arrow-flight";
import { Ingestor, type IngestorService } from "../src/ingestor/service";
import * as RuntimeConfig from "../src/runtime-config";

const rowSchema = Schema.Struct({
  id: Schema.String,
  version: Schema.BigInt,
  count: Schema.optional(Schema.Finite),
  _deleted: Schema.optional(Schema.Boolean),
}).pipe(icebergIdentifier("id"));
const Products = Resource.entity({
  name: "products",
  rowSchema,
  version: "version",
  check: Effect.void,
});
const connector = Connector.define({ name: "test", resources: [Products] });
const identifier = {
  namespace: ["default"],
  name: "products",
  location: "s3://warehouse/default/products",
};

const makeManagerLayer = (options: {
  readonly pushFailure?: IngestorError;
  readonly opened: Ref.Ref<ReadonlyArray<ApiIngestor.IngestorOptions>>;
  readonly pushed: Ref.Ref<ReadonlyArray<RecordBatch<TypeMap>>>;
}) =>
  Layer.succeed(CatalogManager.CatalogManager)({
    createCatalog: () => Effect.die("Unexpected createCatalog"),
    getCatalog: () => Effect.die("Unexpected getCatalog"),
    deleteCatalog: () => Effect.die("Unexpected deleteCatalog"),
    getIcebergCatalog: () => Effect.die("Ingestion must not access the catalog"),

    ingestor: (ingestorOptions) =>
      Ref.update(options.opened, (opened) => [...opened, ingestorOptions]).pipe(
        Effect.as({
          push: (batch) =>
            Ref.update(options.pushed, (pushed) => [...pushed, batch]).pipe(
              Effect.andThen(options.pushFailure ? Effect.fail(options.pushFailure) : Effect.void),
            ),
        }),
      ),
  });

const makeTest = Effect.gen(function* () {
  const opened = yield* Ref.make<ReadonlyArray<ApiIngestor.IngestorOptions>>([]);
  const pushed = yield* Ref.make<ReadonlyArray<RecordBatch<TypeMap>>>([]);

  return { opened, pushed };
});

const useIngestor = <A, E, R>(
  refs: Effect.Success<typeof makeTest>,
  use: (ingestor: IngestorService) => Effect.Effect<A, E, R>,
  options?: {
    readonly pushFailure?: IngestorError;
  },
) =>
  Ingestor.use(use).pipe(
    Effect.provide(
      layerArrowFlight({ connector, catalog: "default-catalog", tables: { products: identifier } }),
    ),
    Effect.provide(makeManagerLayer({ ...refs, ...options })),
  );

describe("Arrow Flight ingestor adapter", () => {
  it.effect("compiles bindings without catalog calls and reuses one full-schema stream", () =>
    Effect.gen(function* () {
      const refs = yield* makeTest;
      const first = yield* useIngestor(refs, (ingestor) =>
        Effect.gen(function* () {
          const result = yield* ingestor.ingest({
            resource: "products",
            source: "backfill",
            batch: { rows: [{ count: 2, id: "p1", version: 1n }] },
          });
          yield* ingestor.ingest({
            resource: "products",
            source: "changes",
            batch: { rows: [{ id: "p1", version: 2n }] },
          });
          yield* ingestor.ingest({
            resource: "products",
            source: "webhook",
            batch: { rows: [{ id: "p1", version: 3n, _deleted: true }] },
          });
          return result;
        }),
      );

      expect(yield* Ref.get(refs.opened)).toEqual([
        { catalog: "default-catalog", namespace: ["default"], table: "products" },
      ]);

      const batches = yield* Ref.get(refs.pushed);
      expect(batches).toHaveLength(3);
      for (const batch of batches) {
        expect(batch.schema.fields.map((field) => field.name)).toEqual([
          "id",
          "version",
          "count",
          "_deleted",
        ]);
      }

      // Bytes are the encoded batch, counted once the server acknowledges it.
      expect(first).toEqual({ rows: 1, bytes: batches[0]?.data.byteLength });
      expect(batches[1]?.getChild("count")?.get(0)).toBeNull();
      expect(batches[2]?.getChild("_deleted")?.get(0)).toBe(true);
    }),
  );

  it.effect("does not push empty batches", () =>
    Effect.gen(function* () {
      const refs = yield* makeTest;
      const result = yield* useIngestor(refs, (ingestor) =>
        ingestor.ingest({ resource: "products", source: "backfill", batch: { rows: [] } }),
      );

      expect(result).toEqual({ rows: 0, bytes: 0 });
      expect(yield* Ref.get(refs.pushed)).toEqual([]);
    }),
  );

  it.effect("opens tables only for bound resources", () =>
    Effect.gen(function* () {
      const refs = yield* makeTest;
      const Orders = Resource.entity({ ...Products, name: "orders" });
      const ingestor = yield* Ingestor.pipe(
        Effect.provide(
          layerArrowFlight({
            connector: Connector.define({ name: "test", resources: [Products, Orders] }),
            catalog: "default-catalog",
            tables: { products: identifier },
          }),
        ),
        Effect.provide(makeManagerLayer(refs)),
      );

      expect(ingestor.resourceNames).toEqual(["products"]);
      expect((yield* Ref.get(refs.opened)).map((options) => options.table)).toEqual(["products"]);
    }),
  );

  it.effect("maps encoding and Arrow Flight push failures to ConnectorError", () =>
    Effect.gen(function* () {
      const refs = yield* makeTest;
      const encodingFailure = yield* useIngestor(refs, (ingestor) =>
        ingestor.ingest({
          resource: "products",
          source: "webhook",
          batch: { rows: [{ id: "p1", version: 1n, count: "invalid" }] },
        }),
      ).pipe(Effect.flip);
      const pushFailure = yield* useIngestor(
        refs,
        (ingestor) =>
          ingestor.ingest({
            resource: "products",
            source: "changes",
            batch: { rows: [{ id: "p1", version: 1n }] },
          }),
        { pushFailure: new IngestorError({ message: "push failed" }) },
      ).pipe(Effect.flip);
      expect(encodingFailure).toBeInstanceOf(ConnectorError);
      expect(encodingFailure.message).toBe("Failed to encode rows");
      expect(pushFailure.message).toContain("Failed to ingest rows");
    }),
  );

  it.effect("requires a complete HTTP Arrow Flight URL in hosted mode", () =>
    Ingestor.pipe(
      Effect.provide(layerArrowFlightConfig(connector)),
      Effect.provide(
        ConfigProvider.layer(
          ConfigProvider.fromUnknown({
            [RuntimeConfig.PlatformRuntimeKey.engineUri]: "engine:7777",
            [RuntimeConfig.PlatformRuntimeKey.catalog]: "default-catalog",
          }),
        ),
      ),
      Effect.flip,
      Effect.map((error) => expect(error.message).toBe("Invalid Arrow Flight URL")),
    ),
  );
});

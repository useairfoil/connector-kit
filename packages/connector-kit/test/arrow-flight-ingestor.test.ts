import type { RecordBatch, TypeMap } from "apache-arrow";
import type { TableIdentifier, TableMetadata, TableSchema } from "iceberg-js";

import { describe, expect, it } from "@effect/vitest";
import { CatalogManager, type Ingestor as ApiIngestor, IngestorError } from "@useairfoil/api";
import { ConfigProvider, Effect, Layer, Ref, Schema } from "effect";

import { Connector, Resource } from "../src/core";
import { ConnectorError } from "../src/errors";
import { field, identifier as icebergIdentifier } from "../src/iceberg/annotations";
import { layerArrowFlight, layerArrowFlightConfig } from "../src/ingestor/arrow-flight";
import { Ingestor, type IngestorService } from "../src/ingestor/service";
import * as RuntimeConfig from "../src/runtime-config";

const rowSchema = Schema.Struct({
  id: Schema.String.pipe(field(1)),
  version: Schema.BigInt.pipe(field(2)),
  count: Schema.optional(Schema.Finite).pipe(field(3)),
  _deleted: Schema.optional(Schema.Boolean).pipe(field(4)),
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

const tableMetadata = (schema?: TableSchema): TableMetadata => ({
  "format-version": 3,
  "table-uuid": "table-uuid",
  schemas: schema ? [{ ...schema, "schema-id": 0 }] : [],
  "current-schema-id": 0,
  "partition-specs": [{ "spec-id": 0, fields: [] }],
  "default-spec-id": 0,
  "sort-orders": [{ "order-id": 0, fields: [] }],
  "default-sort-order-id": 0,
  properties: {},
});

const icebergSchema: TableSchema = {
  type: "struct",
  fields: [
    { id: 1, name: "id", type: "string", required: true },
    { id: 2, name: "version", type: "long", required: false },
    { id: 3, name: "count", type: "double", required: false },
    { id: 4, name: "_deleted", type: "boolean", required: false },
  ],
  "identifier-field-ids": [1],
};

const makeManagerLayer = (options: {
  readonly metadata?: TableMetadata;
  readonly loadFailure?: ConnectorError;
  readonly pushFailure?: IngestorError;
  readonly loaded: Ref.Ref<ReadonlyArray<TableIdentifier>>;
  readonly opened: Ref.Ref<ReadonlyArray<ApiIngestor.IngestorOptions>>;
  readonly pushed: Ref.Ref<ReadonlyArray<RecordBatch<TypeMap>>>;
}) =>
  Layer.succeed(CatalogManager.CatalogManager)({
    createCatalog: () => Effect.die("Unexpected createCatalog"),
    getCatalog: () => Effect.die("Unexpected getCatalog"),
    deleteCatalog: () => Effect.die("Unexpected deleteCatalog"),
    getIcebergCatalog: () =>
      Effect.succeed({
        loadTable: (table: TableIdentifier) =>
          Ref.update(options.loaded, (loaded) => [...loaded, table]).pipe(
            Effect.andThen(
              options.loadFailure
                ? Effect.fail(options.loadFailure)
                : Effect.succeed(options.metadata ?? tableMetadata(icebergSchema)),
            ),
          ),
      } as never),

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
  const loaded = yield* Ref.make<ReadonlyArray<TableIdentifier>>([]);
  const opened = yield* Ref.make<ReadonlyArray<ApiIngestor.IngestorOptions>>([]);
  const pushed = yield* Ref.make<ReadonlyArray<RecordBatch<TypeMap>>>([]);

  return { loaded, opened, pushed };
});

const useIngestor = <A, E, R>(
  refs: Effect.Success<typeof makeTest>,
  use: (ingestor: IngestorService) => Effect.Effect<A, E, R>,
  options?: {
    readonly metadata?: TableMetadata;
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
  it.effect("loads native bindings and reuses one full-schema stream", () =>
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

      expect(yield* Ref.get(refs.loaded)).toEqual([
        { namespace: identifier.namespace, name: identifier.name },
      ]);
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

  it.effect("fails for missing current schemas", () =>
    Effect.gen(function* () {
      const refs = yield* makeTest;
      const missingSchema = yield* useIngestor(refs, () => Effect.void, {
        metadata: tableMetadata(),
      }).pipe(Effect.flip);
      const missingVersion = yield* useIngestor(refs, () => Effect.void, {
        metadata: tableMetadata({
          type: "struct",
          fields: [{ id: 1, name: "id", type: "string", required: true }],
        }),
      }).pipe(Effect.flip);

      expect(missingSchema.message).toContain("no current schema");
      expect(missingVersion.message).toContain("Table schema does not match");
    }),
  );

  it.effect("does not open any stream when a table schema differs", () =>
    Effect.gen(function* () {
      const refs = yield* makeTest;
      const Other = Resource.entity({
        name: "other",
        rowSchema: Schema.Struct({
          id: Schema.String.pipe(field(1)),
          version: Schema.BigInt.pipe(field(2)),
          extra: Schema.String.pipe(field(3)),
        }).pipe(icebergIdentifier("id")),
        version: "version",
        check: Effect.void,
      });
      const both = Connector.define({ name: "test", resources: [Products, Other] });

      const error = yield* Ingestor.pipe(
        Effect.provide(
          layerArrowFlight({
            connector: both,
            catalog: "default-catalog",
            tables: { products: identifier, other: { ...identifier, name: "other" } },
          }),
        ),
        Effect.provide(makeManagerLayer(refs)),
        Effect.flip,
      );

      expect(error.message).toContain("Table schema does not match");
      expect(yield* Ref.get(refs.opened)).toEqual([]);
    }),
  );

  it.effect(
    "maps table, metadata, encoding, and Arrow Flight push failures to ConnectorError",
    () =>
      Effect.gen(function* () {
        const loadRefs = yield* makeTest;
        const loadFailure = yield* Ingestor.pipe(
          Effect.provide(
            layerArrowFlight({
              connector,
              catalog: "default-catalog",
              tables: { products: identifier },
            }),
          ),
          Effect.provide(
            makeManagerLayer({
              ...loadRefs,
              loadFailure: new ConnectorError({ message: "load failed" }),
            }),
          ),
          Effect.flip,
        );

        const metadataRefs = yield* makeTest;
        const metadata = tableMetadata(icebergSchema);

        Reflect.deleteProperty(metadata, "schemas");

        const metadataFailure = yield* useIngestor(metadataRefs, () => Effect.void, {
          metadata,
        }).pipe(Effect.flip);

        const encodeRefs = yield* makeTest;
        const encodingFailure = yield* useIngestor(encodeRefs, (ingestor) =>
          ingestor.ingest({
            resource: "products",
            source: "webhook",
            batch: { rows: [{ id: "p1", version: 1n, count: "invalid" }] },
          }),
        ).pipe(Effect.flip);

        const pushRefs = yield* makeTest;
        const pushFailure = yield* useIngestor(
          pushRefs,
          (ingestor) =>
            ingestor.ingest({
              resource: "products",
              source: "changes",
              batch: { rows: [{ id: "p1", version: 1n, count: 1 }] },
            }),
          { pushFailure: new IngestorError({ message: "push failed" }) },
        ).pipe(Effect.flip);

        expect(loadFailure).toBeInstanceOf(ConnectorError);
        expect(loadFailure.message).toContain("load failed");
        expect(metadataFailure.message).toContain("Invalid table metadata");
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

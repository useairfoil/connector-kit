import type { RecordBatch, TypeMap } from "apache-arrow";
import type { TableIdentifier } from "iceberg-js";

import { CatalogManager } from "@useairfoil/api";
import { Config, Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/http";

import type { TableSource } from "../core/types";

import { ensureTable } from "../catalog/table";
import { ConnectorError } from "../errors";
import * as RuntimeConfig from "../runtime-config";
import { makeRowEncoder, type RowEncoder } from "./arrow";
import { Ingestor, type IngestorService } from "./service";

/** One catalog and an Iceberg table for each resource that runs. */
export type ArrowFlightIngestorConfig<Source extends TableSource = TableSource> = {
  readonly connector: Source;
  readonly catalog: string;
  readonly tables: RuntimeConfig.ResolvedTableBindings<Source>;
};

type IngestorEntry = {
  readonly encode: RowEncoder;
  readonly push: (batch: RecordBatch<TypeMap>) => Effect.Effect<void, ConnectorError>;
};

type PreparedTable = {
  readonly resource: string;
  readonly identifier: TableIdentifier;
  readonly encode: RowEncoder;
};

const connectorError = (message: string, cause?: unknown) => new ConnectorError({ message, cause });

/** Loads each table schema and opens one Arrow Flight stream per bound resource. */
export const layerArrowFlight = <const Source extends TableSource>(
  config: ArrowFlightIngestorConfig<Source>,
): Layer.Layer<Ingestor, ConnectorError, CatalogManager.CatalogManager> =>
  Layer.effect(Ingestor)(
    Effect.gen(function* () {
      const manager = yield* CatalogManager.CatalogManager;
      const catalog = yield* manager
        .getIcebergCatalog(config.catalog)
        .pipe(Effect.mapError((cause) => connectorError("Failed to load Iceberg catalog", cause)));

      const bindings: Partial<Record<string, RuntimeConfig.TableBinding>> = config.tables;

      const prepared: Array<PreparedTable> = [];
      for (const resource of config.connector.resources) {
        const binding = bindings[resource.name];
        if (!binding) continue;

        const { namespace, name, location } = binding;
        const identifier = { namespace, name };
        const schema = yield* ensureTable(resource.rowSchema, {
          catalog,
          identifier,
          location,
        }).pipe(
          Effect.mapError((cause) =>
            connectorError(`Failed to prepare table for ${resource.name}: ${cause.message}`, cause),
          ),
        );

        const encode = yield* makeRowEncoder(schema, resource.version);
        prepared.push({ resource: resource.name, identifier, encode });
      }

      const entries = new Map<string, IngestorEntry>();
      for (const { resource, identifier, encode } of prepared) {
        const ingestor = yield* manager
          .ingestor({
            catalog: config.catalog,
            namespace: identifier.namespace,
            table: identifier.name,
          })
          .pipe(
            Effect.mapError((cause) =>
              connectorError(`Failed to open ingestor for ${resource}`, cause),
            ),
          );

        entries.set(resource, {
          encode,
          push: (batch) =>
            ingestor
              .push(batch)
              .pipe(
                Effect.mapError((cause) =>
                  connectorError(`Failed to ingest rows for ${resource}`, cause),
                ),
              ),
        });
      }

      const service: IngestorService = {
        resourceNames: prepared.map(({ resource }) => resource),
        ingest: ({ resource, batch }) => {
          const entry = entries.get(resource);

          if (!entry) return Effect.fail(connectorError(`Unknown resource ${resource}`));
          if (batch.rows.length === 0) return Effect.succeed({ rows: 0, bytes: 0 });

          return entry
            .encode(batch.rows)
            .pipe(
              Effect.flatMap((encoded) =>
                entry
                  .push(encoded)
                  .pipe(Effect.as({ rows: batch.rows.length, bytes: encoded.data.byteLength })),
              ),
            );
        },
      };

      return Ingestor.of(service);
    }),
  );

/** Configures Arrow Flight ingestion from the hosted URL, catalog and table bindings. */
export const layerArrowFlightConfig = (connector: TableSource) =>
  Layer.unwrap(
    Effect.gen(function* () {
      const { catalog, uri } = yield* Config.all({
        catalog: RuntimeConfig.catalog,
        uri: RuntimeConfig.engineUri,
      }).pipe(
        Effect.mapError((cause) => connectorError("Invalid Arrow Flight configuration", cause)),
      );

      if (uri.protocol !== "http:" && uri.protocol !== "https:") {
        return yield* Effect.fail(connectorError("Invalid Arrow Flight URL"));
      }

      const tables = yield* RuntimeConfig.loadTableBindings(connector).pipe(
        Effect.mapError((cause) => connectorError(cause.message, cause)),
      );
      const manager = CatalogManager.layer({ baseUrl: uri.href }).pipe(
        Layer.provide(FetchHttpClient.layer),
      );

      return layerArrowFlight({ connector, catalog, tables }).pipe(Layer.provide(manager));
    }),
  );

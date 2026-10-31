import type { IcebergCatalog } from "@useairfoil/effect-iceberg";

import { Context, type Effect, type Scope } from "effect";

import type { Ingestor, IngestorError, IngestorOptions } from "../ingestor";
import type { CatalogManagerError } from "./error";
import type { Catalog, CreateCatalogRequest } from "./schema";

/** Effect service for managing catalog registrations and ingestion. */
export interface CatalogManagerService {
  /** Opens a scoped ingestor for an Iceberg table. */
  readonly ingestor: (
    options: IngestorOptions,
  ) => Effect.Effect<Ingestor, IngestorError, Scope.Scope>;

  /** Creates and validates a catalog registration. */
  readonly createCatalog: (
    request: CreateCatalogRequest,
  ) => Effect.Effect<void, CatalogManagerError>;

  /** Gets a catalog by its bare ID. */
  readonly getCatalog: (id: string) => Effect.Effect<Catalog, CatalogManagerError>;

  /** Deletes a registration by its bare ID; upstream tables are kept. */
  readonly deleteCatalog: (id: string) => Effect.Effect<void, CatalogManagerError>;

  /**
   * Connects directly to the registered catalog. The caller needs network access.
   */
  readonly getIcebergCatalog: (
    id: string,
  ) => Effect.Effect<IcebergCatalog.Service, CatalogManagerError>;
}

/** Effect service tag for the catalog management API. */
export class CatalogManager extends Context.Service<CatalogManager, CatalogManagerService>()(
  "@useairfoil/api/CatalogManager",
) {}

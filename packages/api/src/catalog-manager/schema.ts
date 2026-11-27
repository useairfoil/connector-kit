import { Schema } from "effect";

/** Configuration for an upstream Iceberg REST catalog. */
export const RestCatalogConfig = Schema.Struct({
  uri: Schema.String,
  warehouse: Schema.optional(Schema.String),
  properties: Schema.optional(Schema.Record(Schema.String, Schema.String)),
});
export type RestCatalogConfig = typeof RestCatalogConfig.Type;

/** Request body accepted by `POST /catalogs`. */
export const CreateCatalogRequest = Schema.Struct({
  id: Schema.String,
  rest: RestCatalogConfig,
});
export type CreateCatalogRequest = typeof CreateCatalogRequest.Type;

/** Property patch for an upstream Iceberg REST catalog; `null` removes a key. */
export const RestCatalogUpdate = Schema.Struct({
  properties: Schema.Record(Schema.String, Schema.NullOr(Schema.String)),
});
export type RestCatalogUpdate = typeof RestCatalogUpdate.Type;

/** Request body accepted by `PATCH /catalogs/{id}`. */
export const UpdateCatalogRequest = Schema.Struct({
  rest: RestCatalogUpdate,
});
export type UpdateCatalogRequest = typeof UpdateCatalogRequest.Type;

/** A catalog managed by the Airfoil Storage Engine. */
export const Catalog = Schema.Struct({
  id: Schema.String,
  rest: RestCatalogConfig,
});
export type Catalog = typeof Catalog.Type;

/** Iceberg table identifier returned by the storage engine. */
export const TableIdent = Schema.Struct({
  namespace: Schema.Array(Schema.String),
  name: Schema.String,
});
export type TableIdent = typeof TableIdent.Type;

/** Lifecycle state of a table tracked by the storage engine. */
export const TableLifecycle = Schema.Literals(["active", "deleting"]);
export type TableLifecycle = typeof TableLifecycle.Type;

/** Health summary derived from a table's background tasks. */
export const TableHealth = Schema.Literals(["healthy", "degraded", "failing"]);
export type TableHealth = typeof TableHealth.Type;

/** Scheduling state of a single table background task. */
export const TableTaskState = Schema.Literals([
  "idle",
  "scheduled",
  "queued",
  "running",
  "retrying",
]);
export type TableTaskState = typeof TableTaskState.Type;

/** Latest persisted failure for a table background task. */
export const TableTaskFailure = Schema.Struct({
  code: Schema.String,
  message: Schema.String,
  failed_at: Schema.String,
  consecutive_failures: Schema.Number,
});
export type TableTaskFailure = typeof TableTaskFailure.Type;

/** Status of a scheduled table background task. */
export const TableTaskStatus = Schema.Struct({
  state: TableTaskState,
  eligible_at: Schema.NullOr(Schema.String),
  lease_expires_at: Schema.NullOr(Schema.String),
  failure: Schema.NullOr(TableTaskFailure),
});
export type TableTaskStatus = typeof TableTaskStatus.Type;

/** WAL progress and pending backlog for a table. */
export const TableWalStatus = Schema.Struct({
  accepted_next_sequence: Schema.Number,
  materialized_next_sequence: Schema.Number,
  pending_batches: Schema.Number,
  pending_bytes: Schema.Number,
  oldest_pending_at: Schema.NullOr(Schema.String),
});
export type TableWalStatus = typeof TableWalStatus.Type;

/** Iceberg revision and reconciliation state for a table. */
export const TableIcebergStatus = Schema.Struct({
  desired_revision: Schema.Number,
  reconciled_revision: Schema.Number,
  reconciled_snapshot_id: Schema.NullOr(Schema.Number),
});
export type TableIcebergStatus = typeof TableIcebergStatus.Type;

/** Ingestion pipeline status for a table. */
export const TableIngestionStatus = Schema.Struct({
  wal: TableWalStatus,
  iceberg: TableIcebergStatus,
  materialization: TableTaskStatus,
  reconciliation: TableTaskStatus,
});
export type TableIngestionStatus = typeof TableIngestionStatus.Type;

/** WAL garbage-collection task status and backlog for a table. */
export const TableWalGcStatus = Schema.Struct({
  ...TableTaskStatus.fields,
  pending_batches: Schema.Number,
  pending_bytes: Schema.Number,
  oldest_pending_at: Schema.NullOr(Schema.String),
});
export type TableWalGcStatus = typeof TableWalGcStatus.Type;

/** Maintenance task status for a table. */
export const TableMaintenanceStatus = Schema.Struct({
  wal_gc: TableWalGcStatus,
  deletion: TableTaskStatus,
});
export type TableMaintenanceStatus = typeof TableMaintenanceStatus.Type;

/** Read-only summary returned by `GET /catalogs/{id}/by-uuid/{table_uuid}/status`. */
export const TableStatus = Schema.Struct({
  table_uuid: Schema.String,
  table_ident: TableIdent,
  checkpoint_interval_sec: Schema.Number,
  observed_at: Schema.String,
  lifecycle: TableLifecycle,
  health: TableHealth,
  ingestion: TableIngestionStatus,
  maintenance: TableMaintenanceStatus,
});
export type TableStatus = typeof TableStatus.Type;

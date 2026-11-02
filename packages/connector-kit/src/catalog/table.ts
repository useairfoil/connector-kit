import type {
  IcebergType,
  StructField,
  TableIdentifier,
  TableMetadata,
  TableSchema,
} from "iceberg-js";

import { CatalogManager } from "@useairfoil/api";
import { Effect, type Schema } from "effect";
import { HttpClient } from "effect/http";
import { getCurrentSchema } from "iceberg-js";

import { ConnectorError } from "../errors";
import { IcebergSchemaError } from "../iceberg/error";
import { compileTable, makeCreateRequest } from "../iceberg/table";
import { retryCatalogRequest, type TableRetryOptions } from "./retry";

type Catalog = Effect.Success<
  ReturnType<CatalogManager.CatalogManagerService["getIcebergCatalog"]>
>;

type TableOptions = {
  readonly retry?: TableRetryOptions;
  readonly catalog: Pick<Catalog, "loadTable" | "createTable" | "createNamespaceIfNotExists">;
  readonly identifier: TableIdentifier;
  readonly location?: string | undefined;
  readonly properties?: Readonly<Record<string, string>> | undefined;
};

type EngineTableOptions = {
  readonly engineUri: string;
  readonly catalogId: string;
  readonly identifier: TableIdentifier;
  readonly location?: string | undefined;
  readonly properties?: Readonly<Record<string, string>> | undefined;
};

const tableError = (cause: unknown): ConnectorError => {
  if (cause instanceof ConnectorError) return cause;

  const message = cause instanceof Error ? cause.message : "Failed to prepare Iceberg table";
  return new ConnectorError({
    message: cause instanceof IcebergSchemaError ? `${cause.path}: ${message}` : message,
    cause,
  });
};

const compareTypes = (
  expected: IcebergType,
  actual: IcebergType,
  path: string,
): string | undefined => {
  if (typeof expected === "string" || typeof actual === "string") {
    return expected === actual ? undefined : path;
  }

  if (expected.type !== actual.type) return path;

  switch (expected.type) {
    case "struct":
      if (actual.type !== "struct") return path;
      return compareFields(expected.fields, actual.fields, path);
    case "list":
      if (actual.type !== "list" || expected["element-required"] !== actual["element-required"]) {
        return path;
      }
      return compareTypes(expected.element, actual.element, `${path}.element`);
    case "map":
      if (actual.type !== "map" || expected["value-required"] !== actual["value-required"]) {
        return path;
      }
      return (
        compareTypes(expected.key, actual.key, `${path}.key`) ??
        compareTypes(expected.value, actual.value, `${path}.value`)
      );
  }
};

const compareFields = (
  expected: ReadonlyArray<StructField>,
  actual: ReadonlyArray<StructField>,
  path: string,
): string | undefined => {
  if (expected.length !== actual.length) return path;

  for (const field of expected) {
    const fieldPath = `${path}.${field.name}`;
    const other = actual.find((candidate) => candidate.name === field.name);

    if (!other || field.required !== other.required) return fieldPath;

    const mismatch = compareTypes(field.type, other.type, fieldPath);
    if (mismatch) return mismatch;
  }
};

const verifyTable = (
  metadata: TableMetadata,
  expected: TableSchema,
): Effect.Effect<TableSchema, ConnectorError> =>
  Effect.try({
    try: () => {
      if (!Array.isArray(metadata.schemas)) throw new Error("Invalid table metadata");
      if (metadata["format-version"] !== 3) {
        throw new Error(
          "Storage-engine tables must use Iceberg format v3. Migrate the table before ingesting.",
        );
      }
      const partitionSpec = metadata["partition-specs"].find(
        (spec) => spec["spec-id"] === metadata["default-spec-id"],
      );
      if (!partitionSpec) throw new Error("Table has no default partition spec");
      if (partitionSpec.fields.length > 0) {
        throw new Error("Storage-engine tables must be unpartitioned.");
      }
      if (metadata.properties?.["encryption.key-id"] !== undefined) {
        throw new Error("Storage-engine tables must be unencrypted.");
      }
      const actual = getCurrentSchema(metadata);
      if (!actual) throw new Error("Table has no current schema");

      const path = compareFields(expected.fields, actual.fields, "$");
      if (path) {
        throw new Error(
          `Table schema does not match at ${path}. Migrate the table or revert the schema change.`,
        );
      }

      const identifierNames = (schema: TableSchema) =>
        new Set(
          schema.fields
            .filter((field) => schema["identifier-field-ids"]?.includes(field.id))
            .map((field) => field.name),
        );
      const expectedNames = identifierNames(expected);
      const actualNames = identifierNames(actual);
      if (
        expectedNames.size !== actualNames.size ||
        [...expectedNames].some((name) => !actualNames.has(name))
      ) {
        throw new Error(
          "Table identifier fields do not match. Recreate the table or revert the schema change.",
        );
      }

      return actual;
    },
    catch: (cause) =>
      new ConnectorError({
        message: cause instanceof Error ? cause.message : "Invalid table metadata",
        cause,
      }),
  });

/** Creates a table through the REST catalog, then checks the loaded schema. */
export const createTable = (
  schema: Schema.Top,
  options: TableOptions,
): Effect.Effect<TableSchema, ConnectorError> =>
  Effect.gen(function* () {
    const table = yield* compileTable(schema);
    yield* options.catalog.createTable(
      { namespace: options.identifier.namespace },
      makeCreateRequest(table, {
        name: options.identifier.name,
        location: options.location,
        properties: options.properties,
      }),
    );

    const metadata = yield* options.catalog.loadTable(options.identifier);
    return yield* verifyTable(metadata, table.schema);
  }).pipe(Effect.mapError(tableError));

/** Creates a missing table through an engine catalog and verifies its schema. */
export const ensureTableFromEngine = (
  schema: Schema.Top,
  options: EngineTableOptions,
): Effect.Effect<TableSchema, ConnectorError, HttpClient.HttpClient> =>
  Effect.scoped(
    Effect.gen(function* () {
      const manager = yield* CatalogManager.make({ engineUri: options.engineUri });
      const catalog = yield* manager.getIcebergCatalog(options.catalogId);
      return yield* ensureTable(schema, {
        catalog,
        identifier: options.identifier,
        location: options.location,
        properties: options.properties,
      });
    }),
  ).pipe(Effect.mapError(tableError));

/** Loads a table, creating it when it is missing. */
export const ensureTable = (
  schema: Schema.Top,
  options: TableOptions,
): Effect.Effect<TableSchema, ConnectorError> =>
  Effect.gen(function* () {
    const table = yield* compileTable(schema);
    const request = <A>(
      effect: Effect.Effect<A, Effect.Error<ReturnType<Catalog["loadConfig"]>>>,
    ) => retryCatalogRequest(effect, options.retry);
    const metadata = yield* request(options.catalog.loadTable(options.identifier)).pipe(
      Effect.catchIf(
        (error) => error.status === 404,
        () =>
          request(
            options.catalog.createNamespaceIfNotExists({ namespace: options.identifier.namespace }),
          )
            .pipe(
              Effect.andThen(
                request(
                  options.catalog.createTable(
                    { namespace: options.identifier.namespace },
                    makeCreateRequest(table, {
                      name: options.identifier.name,
                      location: options.location,
                      properties: options.properties,
                    }),
                  ),
                ),
              ),
            )
            .pipe(
              // Another instance may have created the table. Reload and check it.
              Effect.catchIf(
                (error) => error.status === 409 || error.status === 412,
                () => Effect.void,
              ),
              Effect.flatMap(() => request(options.catalog.loadTable(options.identifier))),
            ),
      ),
    );

    return yield* verifyTable(metadata, table.schema);
  }).pipe(Effect.mapError(tableError));

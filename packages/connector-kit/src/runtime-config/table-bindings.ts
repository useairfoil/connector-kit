import type { TableIdentifier } from "iceberg-js";

import { Config, Effect, Schema } from "effect";

import { PlatformRuntimeKey } from "./constants";
import { RuntimeConfigError } from "./error";

type BindingSource = {
  readonly resources: ReadonlyArray<{ readonly name: string }>;
};

/** An Iceberg table and its storage location for each connector resource. */
export type TableBinding = TableIdentifier & { readonly location?: string | undefined };

export type ResolvedTableBindings<Source extends BindingSource> = Readonly<
  Partial<Record<Source["resources"][number]["name"], TableBinding>>
>;

const TableIdentifierSchema = Schema.Struct({
  namespace: Schema.NonEmptyArray(Schema.NonEmptyString),
  name: Schema.NonEmptyString,
  location: Schema.optional(Schema.NonEmptyString),
});

const RawBindingsSchema = Schema.fromJsonString(
  Schema.Record(Schema.String, TableIdentifierSchema),
);

const asError = (cause: unknown): Error =>
  cause instanceof Error ? cause : new Error(String(cause));

const fail = (code: "TABLE_BINDINGS_INVALID" | "TABLE_BINDINGS_MISMATCH", message: string) =>
  new RuntimeConfigError({ code, message, cause: new Error(message) });

/** Reads hosted table bindings and checks they name resources of the connector. */
export const loadTableBindings = <const Source extends BindingSource>(
  connector: Source,
): Effect.Effect<ResolvedTableBindings<Source>, RuntimeConfigError> =>
  Effect.gen(function* () {
    const raw = yield* Config.NonEmptyString(PlatformRuntimeKey.tableBindings).pipe(
      Effect.mapError(
        (cause) =>
          new RuntimeConfigError({
            code: "TABLE_BINDINGS_MISSING",
            message: `${PlatformRuntimeKey.tableBindings} is required in hosted mode`,
            cause: asError(cause),
          }),
      ),
    );

    const decoded = yield* Schema.decodeUnknownEffect(RawBindingsSchema)(raw, {
      onExcessProperty: "error",
    }).pipe(
      Effect.mapError(
        (cause) =>
          new RuntimeConfigError({
            code: "TABLE_BINDINGS_INVALID",
            message: "Hosted table bindings are invalid",
            cause: asError(cause),
          }),
      ),
    );

    const actual = Object.keys(decoded);
    if (actual.length === 0) {
      return yield* Effect.fail(
        fail("TABLE_BINDINGS_INVALID", "Hosted table bindings name no resources"),
      );
    }

    // Bindings come from the platform, resources from the connector. An unknown name
    // means one of them is out of date, and we could write to the wrong table.
    const expected = new Set(connector.resources.map((resource) => resource.name));
    const unknown = actual.filter((name) => !expected.has(name));
    if (unknown.length > 0) {
      return yield* Effect.fail(
        fail(
          "TABLE_BINDINGS_MISMATCH",
          `Hosted table bindings name resources the connector doesn't have (${unknown.length})`,
        ),
      );
    }

    return Object.fromEntries(
      Object.entries(decoded).map(([resource, identifier]) => [
        resource,
        {
          namespace: Array.from(identifier.namespace),
          name: identifier.name,
          ...(identifier.location === undefined ? {} : { location: identifier.location }),
        },
      ]),
    ) as ResolvedTableBindings<Source>;
  });

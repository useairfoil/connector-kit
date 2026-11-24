import { Predicate, Schema, SchemaTransformation, type Types } from "effect";

import type { ConfigFieldSpec } from "./config";
import type { ConnectorManifest } from "./manifest";

import { DateString } from "./date-schema";
import { makeNumberSchema } from "./number-schema";

type FieldValueOf<Field extends ConfigFieldSpec> = Field["type"] extends "number"
  ? number
  : Field["type"] extends "boolean"
    ? boolean
    : Field["values"] extends ReadonlyArray<string>
      ? Field["values"][number]
      : string;

export type ConnectorConfigValues<Manifest extends ConnectorManifest> = Types.Simplify<
  {
    readonly [Field in Manifest["config"][number] as Field["required"] extends true
      ? Field["name"]
      : never]: FieldValueOf<Field>;
  } & {
    readonly [Field in Manifest["config"][number] as Field["required"] extends true
      ? never
      : Field["name"]]?: FieldValueOf<Field> | undefined;
  }
> &
  object;

export type ConnectorConfigSchema<Manifest extends ConnectorManifest> = Schema.Codec<
  ConnectorConfigValues<Manifest>,
  unknown
>;

/** Flat primitive document keyed by the runtime keys consumed by Effect Config. */
export type RuntimeConfigDocument = Readonly<Record<string, string | number | boolean>>;

// Browser forms submit numbers and booleans as strings, while API callers may
// already send their canonical JSON representations. These schemas accept both.
const numberFromForm = (field: Extract<ConfigFieldSpec, { readonly type: "number" }>) => {
  const numberSchema = makeNumberSchema(field);
  return Schema.Union([
    numberSchema,
    Schema.NonEmptyString.pipe(
      Schema.decodeTo(numberSchema, SchemaTransformation.numberFromString),
    ),
  ]);
};

const BooleanFromForm = Schema.Union([
  Schema.Boolean,
  Schema.Literals(["true", "false"]).pipe(
    Schema.decodeTo(
      Schema.Boolean,
      SchemaTransformation.transform({
        decode: (value) => value === "true",
        encode: (value) => (value ? "true" : "false"),
      }),
    ),
  ),
]);

// An empty optional form control means "not supplied", not an empty config value.
const EmptyStringAsUndefined = Schema.Literal("").pipe(
  Schema.decodeTo(
    Schema.Undefined,
    SchemaTransformation.transform({ decode: () => undefined, encode: () => "" }),
  ),
);

const baseFieldSchema = (field: ConfigFieldSpec): Schema.Codec<unknown, unknown> => {
  switch (field.type) {
    case "number":
      return numberFromForm(field);
    case "boolean":
      return BooleanFromForm;
    case "select":
      return Schema.Literals(field.values);
    case "date":
      return DateString;
    case "string":
      return Schema.NonEmptyString;
  }
};

const fieldSchema = (field: ConfigFieldSpec) =>
  field.required
    ? baseFieldSchema(field)
    : Schema.optional(Schema.Union([EmptyStringAsUndefined, baseFieldSchema(field)]));

/**
 * Builds an Effect Schema for logical form/API values from a connector manifest.
 *
 * @example
 * ```ts
 * const decode = Schema.decodeUnknownEffect(configSchema(manifest));
 * const values = decode({
 *   apiUrl: "https://example.com",
 *   retries: "3",
 * });
 * ```
 */
export const configSchema = <const Manifest extends ConnectorManifest>(
  manifest: Manifest,
): ConnectorConfigSchema<Manifest> => {
  const fields = Object.fromEntries(
    manifest.config.map((field) => [field.name, fieldSchema(field)]),
  );
  // Object.fromEntries cannot retain keys discovered from the runtime manifest;
  // the public mapped type restores the same relationship for callers.
  return Schema.Struct(fields) as unknown as ConnectorConfigSchema<Manifest>;
};

/** Decodes browser/API config, applies manifest defaults, and rejects undeclared fields. */
export const decodeConfig = <const Manifest extends ConnectorManifest>(
  manifest: Manifest,
  input: unknown,
) => {
  const defaults = Object.fromEntries(
    manifest.config.flatMap((field) =>
      field.default === undefined ? [] : [[field.name, field.default]],
    ),
  );
  const optionalFields = new Set(
    manifest.config.flatMap((field) => (field.required ? [] : [field.name])),
  );
  const normalizedInput = Predicate.isObject(input)
    ? Object.fromEntries(
        Object.entries(input).filter(([name, value]) => value !== "" || !optionalFields.has(name)),
      )
    : input;
  const inputWithDefaults = Predicate.isObject(normalizedInput)
    ? Object.assign({}, defaults, normalizedInput)
    : normalizedInput;

  return Schema.decodeUnknownEffect(configSchema(manifest))(inputWithDefaults, {
    onExcessProperty: "error",
  });
};

/**
 * Maps validated logical values to the flat runtime-key document mounted in a pod.
 * Missing optional values are omitted.
 *
 * @example
 * ```ts
 * toRuntimeDocument(manifest, { apiUrl: "https://example.com" });
 * // { API_URL: "https://example.com" }
 * ```
 */
export const toRuntimeDocument = <const Manifest extends ConnectorManifest>(
  manifest: Manifest,
  values: ConnectorConfigValues<Manifest>,
): RuntimeConfigDocument => {
  const document: Record<string, string | number | boolean> = {};
  for (const field of manifest.config) {
    const value: unknown = Reflect.get(values, field.name);
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      document[field.runtimeKey] = value;
    }
  }
  return document;
};

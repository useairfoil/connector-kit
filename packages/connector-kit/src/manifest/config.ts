import { Config, Option, Redacted, Schema, Struct } from "effect";

import { isPlatformRuntimeKey } from "../runtime-config/constants";
import { DateString } from "./date-schema";
import { makeNumberSchema, type NumberConstraints } from "./number-schema";

type FieldText = {
  readonly label?: string;
  readonly description?: string;
  readonly placeholder?: string;
};

type ConfigFieldSpecBase = FieldText & {
  readonly runtimeKey: string;
  readonly required: boolean;
};

type ConfigFieldDefinition = ConfigFieldSpecBase &
  (
    | {
        readonly type: "string";
        readonly secret: false;
        readonly default?: string;
        readonly values?: never;
      }
    | {
        readonly type: "string";
        readonly secret: true;
        readonly default?: never;
        readonly values?: never;
        readonly multiline?: boolean;
      }
    | {
        readonly type: "date";
        readonly secret: false;
        readonly default?: string;
        readonly values?: never;
      }
    | {
        readonly type: "number";
        readonly secret: false;
        readonly default?: number;
        readonly values?: never;
        readonly integer?: boolean;
        readonly minimum?: number;
      }
    | {
        readonly type: "boolean";
        readonly secret: false;
        readonly default?: boolean;
        readonly values?: never;
      }
    | {
        readonly type: "select";
        readonly secret: false;
        readonly default?: string;
        readonly values: readonly [string, ...Array<string>];
      }
  );

/** Serializable, browser-safe metadata for one user-provided connector setting. */
export type ConfigFieldSpec = ConfigFieldDefinition & { readonly name: string };

/** Pairs an Effect runtime config with the metadata used to generate its form field. */
export type ConfigField<A> = {
  readonly config: Config.Config<A>;
  readonly spec: ConfigFieldDefinition;
};

type FieldBaseOptions = FieldText & {
  readonly runtimeKey: string;
};

const fieldText = (options: FieldText): FieldText => ({
  ...(options.label !== undefined ? { label: options.label } : {}),
  ...(options.description !== undefined ? { description: options.description } : {}),
  ...(options.placeholder !== undefined ? { placeholder: options.placeholder } : {}),
});

type FieldOptions<A extends string | number | boolean = string | number | boolean> =
  FieldBaseOptions &
    (
      | {
          readonly required?: true;
          readonly default?: A;
        }
      | {
          readonly required: false;
          readonly default: A;
        }
    );

type NumberFieldOptions = FieldOptions<number> & NumberConstraints;

type FieldsRecord = Record<string, ConfigField<unknown>>;

/** Preserves each field's value type while `Struct.map` extracts its Effect Config. */
interface ConfigFieldToConfig extends Struct.Lambda {
  <A>(field: ConfigField<A>): Config.Config<A>;
  readonly "~lambda.out": this["~lambda.in"] extends ConfigField<infer A>
    ? Config.Config<A>
    : never;
}

const configFieldToConfig = Struct.lambda<ConfigFieldToConfig>((field) => field.config);

type ConfigOf<Fields extends FieldsRecord> = {
  readonly [Key in keyof Fields]: Fields[Key] extends ConfigField<infer A> ? A : never;
};

/** Effect config and serializable manifest metadata produced from one field definition. */
export type ConnectorConfigDef<Fields extends FieldsRecord> = {
  readonly fields: {
    readonly [Key in keyof Fields]: Fields[Key] extends ConfigField<infer A>
      ? Config.Config<A>
      : never;
  };
  readonly config: Config.Config<ConfigOf<Fields>>;
  readonly spec: ReadonlyArray<ConfigFieldSpec>;
};

export type ConfigValuesOf<Def extends ConnectorConfigDef<FieldsRecord>> =
  Def extends ConnectorConfigDef<infer Fields> ? ConfigOf<Fields> : never;

const withDefault = <A extends string | number | boolean>(
  config: Config.Config<A>,
  defaultValue: A | undefined,
) => (defaultValue === undefined ? config : Config.withDefault(config, defaultValue));

/** Defines a required non-empty string, optionally with a default. */
export const string = (options: FieldOptions<string>): ConfigField<string> => ({
  config: withDefault(Config.NonEmptyString(options.runtimeKey), options.default),
  spec: {
    runtimeKey: options.runtimeKey,
    type: "string",
    required: options.required ?? true,
    secret: false,
    ...fieldText(options),
    ...(options.default !== undefined ? { default: options.default } : {}),
  },
});

/**
 * Defines a calendar day as a `YYYY-MM-DD` string, optionally with a default.
 * The day has no time zone: the connector decides which zone it means, and
 * converts it to its API's format.
 * `decodeConfig` checks the format. At runtime it loads like a string, so the
 * connector can report a bad value with its own error.
 */
export const date = (options: FieldOptions<string>): ConfigField<string> => {
  const defaultValue =
    options.default === undefined
      ? undefined
      : Schema.decodeUnknownSync(DateString)(options.default);

  return {
    config: withDefault(Config.NonEmptyString(options.runtimeKey), defaultValue),
    spec: {
      runtimeKey: options.runtimeKey,
      type: "date",
      required: options.required ?? true,
      secret: false,
      ...fieldText(options),
      ...(defaultValue !== undefined ? { default: defaultValue } : {}),
    },
  };
};

/** Defines a finite number with optional integer, minimum, and default constraints. */
export const number = (options: NumberFieldOptions): ConfigField<number> => {
  const schema = makeNumberSchema(options);
  const defaultValue =
    options.default === undefined ? undefined : Schema.decodeUnknownSync(schema)(options.default);

  return {
    config: withDefault(Config.schema(schema, options.runtimeKey), defaultValue),
    spec: {
      runtimeKey: options.runtimeKey,
      type: "number",
      required: options.required ?? true,
      secret: false,
      ...fieldText(options),
      ...(defaultValue !== undefined ? { default: defaultValue } : {}),
      ...(options.integer !== undefined ? { integer: options.integer } : {}),
      ...(options.minimum !== undefined ? { minimum: options.minimum } : {}),
    },
  };
};

/** Defines a boolean, optionally with a default. */
export const boolean = (options: FieldOptions<boolean>): ConfigField<boolean> => ({
  config: withDefault(Config.Boolean(options.runtimeKey), options.default),
  spec: {
    runtimeKey: options.runtimeKey,
    type: "boolean",
    required: options.required ?? true,
    secret: false,
    ...fieldText(options),
    ...(options.default !== undefined ? { default: options.default } : {}),
  },
});

/** Defines a string literal choice whose values are preserved in the inferred type. */
export const select = <const Values extends readonly [string, ...Array<string>]>(
  options: FieldOptions<Values[number]> & { readonly values: Values },
): ConfigField<Values[number]> => ({
  config: withDefault(Config.Literals(options.values, options.runtimeKey), options.default),
  spec: {
    runtimeKey: options.runtimeKey,
    type: "select",
    required: options.required ?? true,
    secret: false,
    values: options.values,
    ...fieldText(options),
    ...(options.default !== undefined ? { default: options.default } : {}),
  },
});

/**
 * Defines a required, non-empty secret decoded as `Redacted<string>`.
 * Set `multiline` for values with line breaks, such as PEM keys.
 */
export const secret = (
  options: FieldBaseOptions & { readonly required?: true; readonly multiline?: boolean },
): ConfigField<Redacted.Redacted<string>> => ({
  config: Config.schema(Schema.Redacted(Schema.NonEmptyString), options.runtimeKey),
  spec: {
    runtimeKey: options.runtimeKey,
    type: "string",
    required: options.required ?? true,
    secret: true,
    ...fieldText(options),
    ...(options.multiline !== undefined ? { multiline: options.multiline } : {}),
  },
});

/** Makes an existing field optional and represents a missing value as `Option.none()`. */
export const optional = <A>(field: ConfigField<A>): ConfigField<Option.Option<A>> => ({
  config: Config.option(field.config),
  spec: {
    ...field.spec,
    required: false,
  },
});

/**
 * Defines user-facing connector config once for both Effect runtime loading and
 * frontend form generation. The object keys become logical form/API field names;
 * `runtimeKey` remains the key read by Effect Config.
 *
 * @example
 * ```ts
 * const config = define({
 *   apiUrl: string({ runtimeKey: "API_URL" }),
 *   token: secret({ runtimeKey: "API_TOKEN" }),
 * });
 *
 * const RuntimeConfig = config.config;
 * const formFields = config.spec;
 * ```
 */
export const define = <const Fields extends FieldsRecord>(
  fields: Fields,
): ConnectorConfigDef<Fields> => {
  const spec = Object.entries(fields).map(([name, field]) => ({ name, ...field.spec }));
  const platformField = spec.find((field) => isPlatformRuntimeKey(field.runtimeKey));
  if (platformField !== undefined) {
    throw new Error(`Connector runtime key is platform-owned: ${platformField.runtimeKey}`);
  }

  const configFields = Struct.map(fields, configFieldToConfig);

  return {
    fields: configFields,
    // Effect's recursive Config.Wrap cannot reduce this generic mapped type,
    // although ConfigFieldToConfig preserves the value type of every property.
    config: Config.unwrap(configFields as Config.Wrap<ConfigOf<Fields>>),
    spec,
  };
};

import { Schema } from "effect";

declare module "effect/Schema" {
  namespace Annotations {
    interface Annotations {
      readonly fieldId?: number | undefined;
      readonly icebergIdentifierFields?: ReadonlyArray<string> | undefined;
    }
  }
}

/** Sets a field's Iceberg ID, and any other annotations. */
export const field =
  <A = unknown>(fieldId: number, annotations: Schema.Annotations.Key<A> = {}) =>
  <S extends Schema.Schema<A>>(schema: S): S["Rebuild"] =>
    schema.pipe(Schema.annotateKey({ ...annotations, fieldId }));

/** Adds an offset to a base ID for reusable schemas. */
export const ids =
  (baseId: number) =>
  (offset: number): number =>
    baseId + offset;

type KnownField<S extends Schema.Top> = keyof S["Type"] & string;

/** A row field that cannot be null or undefined. */
export type RequiredField<S extends Schema.Top> = [KnownField<S>] extends [never]
  ? string
  : {
      readonly [Field in KnownField<S>]-?: undefined extends S["Type"][Field]
        ? never
        : null extends S["Type"][Field]
          ? never
          : Field;
    }[KnownField<S>];

/** A row schema whose identifier fields are `Key`. Only the type has it. */
export interface Identified<Key extends string> {
  readonly "~iceberg.identifier": Key;
}

/**
 * Marks the fields that identify a row. The engine upserts rows by them.
 *
 * Put it last. A later `.annotate()` keeps the runtime annotation, but the type
 * loses the key, so `Resource.entity` stops compiling.
 *
 * @example
 * ```ts
 * const Post = Schema.Struct({
 *   id: Schema.String.pipe(Iceberg.field(1)),
 *   updatedAt: Schema.String.pipe(Iceberg.field(2)),
 * }).pipe(Iceberg.identifier("id"));
 * ```
 */
export const identifier =
  <S extends Schema.Top, const Key extends RequiredField<S>>(
    ...keys: readonly [Key, ...ReadonlyArray<Key>]
  ) =>
  (schema: S): S["Rebuild"] & Identified<Key> =>
    // Effect has no slot for the key in the schema type, so we add it.
    schema.annotate({ icebergIdentifierFields: keys }) as S["Rebuild"] & Identified<Key>;

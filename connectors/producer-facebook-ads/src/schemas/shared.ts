import { Schema, SchemaTransformation } from "effect";

/** Meta sends counts and minor-unit money as numeric strings. */
export const count = (description: string) =>
  Schema.optional(Schema.BigIntFromString).pipe(Schema.annotateKey({ description }));

/** Spend and other decimal values, as an Iceberg double. */
export const amount = (description: string) =>
  Schema.optional(Schema.FiniteFromString).pipe(Schema.annotateKey({ description }));

export const text = (description: string) =>
  Schema.optional(Schema.String).pipe(Schema.annotateKey({ description }));

/** Times such as `2026-10-19T10:00:00+0000`. */
export const time = (description: string) =>
  Schema.optional(Schema.DateFromString).pipe(Schema.annotateKey({ description }));

/** Whole numbers sent as JSON numbers, as an Iceberg long. */
export const long = (description: string) =>
  Schema.optional(
    Schema.Int.pipe(
      Schema.decodeTo(
        Schema.BigInt,
        SchemaTransformation.transform({
          decode: (value) => BigInt(value),
          encode: (value) => Number(value),
        }),
      ),
    ),
  ).pipe(Schema.annotateKey({ description }));

export const textList = (description: string) =>
  Schema.optional(Schema.Array(Schema.String)).pipe(Schema.annotateKey({ description }));

/** `version` is the fetch time. See AGENTS.md. */
export const version = Schema.Date.pipe(
  Schema.annotateKey({ description: "Time the row was read from Meta." }),
);

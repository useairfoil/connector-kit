import { Schema, SchemaTransformation } from "effect";

export const Long = Schema.Int.pipe(
  Schema.decodeTo(
    Schema.BigInt,
    SchemaTransformation.transform({
      decode: (value) => BigInt(value),
      encode: (value) => Number(value),
    }),
  ),
);

export const LongFromString = Schema.NumberFromString.pipe(Schema.decodeTo(Long));

export const Timestamp = Schema.DateFromString;

export const UnixSeconds = Schema.Number.pipe(
  Schema.decodeTo(
    Schema.Date,
    SchemaTransformation.transform({
      decode: (seconds) => new Date(seconds * 1000),
      encode: (date) => date.getTime() / 1000,
    }),
  ),
);

export const version = (object: string) =>
  Schema.Date.pipe(Schema.annotateKey({ description: `Time Zendesk last updated the ${object}.` }));

export const deleted = (object: string) =>
  Schema.optional(Schema.Boolean).pipe(
    Schema.annotateKey({ description: `Whether the ${object} was deleted in Zendesk.` }),
  );

// Keep list values as JSON. Null values are left out of the map.
const fieldValue = (value: unknown): ReadonlyArray<string> =>
  value === null || value === undefined
    ? []
    : [typeof value === "string" ? value : JSON.stringify(value)];

export const Json = Schema.Unknown.pipe(
  Schema.decodeTo(
    Schema.String,
    SchemaTransformation.transform<string, unknown>({
      decode: (value) => JSON.stringify(value),
      encode: (text) => JSON.parse(text),
    }),
  ),
);

/** Strings stay as they are. Other values become JSON. */
export const asText = (value: unknown): string | null => fieldValue(value)[0] ?? null;

export const TextOrJson = Schema.Unknown.pipe(
  Schema.decodeTo(
    Schema.NullOr(Schema.String),
    SchemaTransformation.transform<string | null, unknown>({
      decode: asText,
      encode: (text) => text,
    }),
  ),
);

/** Ticket `custom_fields`, as a map from field ID to value. */
export const ticketCustomFields = Schema.Array(
  Schema.Struct({ id: Schema.Number, value: Schema.Unknown }),
).pipe(
  Schema.decodeTo(
    Schema.ReadonlyMap(Schema.String, Schema.String),
    SchemaTransformation.transform<
      ReadonlyMap<string, string>,
      ReadonlyArray<{ readonly id: number; readonly value: unknown }>
    >({
      decode: (fields) =>
        new Map(
          fields.flatMap(({ id, value }) => fieldValue(value).map((text) => [String(id), text])),
        ),
      encode: (fields) => Array.from(fields, ([id, value]) => ({ id: Number(id), value })),
    }),
  ),
);

/** User and organization fields, as a map from field key to value. */
export const keyedCustomFields = Schema.Record(Schema.String, Schema.Unknown).pipe(
  Schema.decodeTo(
    Schema.ReadonlyMap(Schema.String, Schema.String),
    SchemaTransformation.transform<ReadonlyMap<string, string>, Readonly<Record<string, unknown>>>({
      decode: (fields) =>
        new Map(
          Object.entries(fields).flatMap(([key, value]) =>
            fieldValue(value).map((text) => [key, text]),
          ),
        ),
      encode: (fields) => Object.fromEntries(fields),
    }),
  ),
);

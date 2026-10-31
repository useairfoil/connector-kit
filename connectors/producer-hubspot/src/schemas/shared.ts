import { Schema, SchemaTransformation } from "effect";

export const Timestamp = Schema.DateFromString;

/** Whole numbers. Connector Kit maps them to Iceberg longs. */
export const Long = Schema.Int.pipe(
  Schema.decodeTo(
    Schema.BigInt,
    SchemaTransformation.transform({
      decode: (value) => BigInt(value),
      encode: (value) => Number(value),
    }),
  ),
);

/** Record IDs. Some endpoints send them as numbers. */
export const RecordId = Schema.Union([Schema.String, Schema.Number]).pipe(
  Schema.decodeTo(
    Schema.String,
    SchemaTransformation.transform<string, string | number>({ decode: String, encode: (id) => id }),
  ),
);

export const version = Schema.Date.pipe(
  Schema.annotateKey({ description: "Time the row was fetched from HubSpot." }),
);

export const deleted = (object: string) =>
  Schema.optional(Schema.Boolean).pipe(
    Schema.annotateKey({
      description: `Whether the ${object} was deleted or merged into another record in HubSpot.`,
    }),
  );

import { Schema, SchemaTransformation } from "effect";

// Stripe times are Unix seconds.
export const UnixTime = Schema.Int.pipe(
  Schema.decodeTo(
    Schema.Date,
    SchemaTransformation.transform({
      decode: (seconds) => new Date(seconds * 1000),
      encode: (date) => Math.floor(date.getTime() / 1000),
    }),
  ),
);

export const Long = Schema.Int.pipe(
  Schema.decodeTo(
    Schema.BigInt,
    SchemaTransformation.transform({
      decode: (value) => BigInt(value),
      encode: (value) => Number(value),
    }),
  ),
);

// Some objects send `null` metadata. It becomes an empty map.
export const Metadata = Schema.NullOr(Schema.Record(Schema.String, Schema.String)).pipe(
  Schema.decodeTo(
    Schema.ReadonlyMap(
      Schema.String.annotate({ description: "Metadata key." }),
      Schema.String.annotate({ description: "Metadata value." }),
    ),
    SchemaTransformation.transform({
      decode: (record): ReadonlyMap<string, string> => new Map(Object.entries(record ?? {})),
      encode: (map) => Object.fromEntries(map),
    }),
  ),
);

export const address = Schema.Struct({
  line1: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "First address line." }),
  ),
  line2: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Second address line." }),
  ),
  city: Schema.NullOr(Schema.String).pipe(Schema.annotateKey({ description: "City." })),
  state: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "State, county, or region." }),
  ),
  postal_code: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Postal code." }),
  ),
  country: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Two-letter country code." }),
  ),
});

export const shipping = Schema.Struct({
  name: Schema.String.pipe(Schema.annotateKey({ description: "Recipient name." })),
  phone: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Recipient phone number." }),
  ),
  address: address.pipe(Schema.annotateKey({ description: "Shipping address." })),
});

export const version = Schema.Date.pipe(
  Schema.annotateKey({ description: "Time the row was fetched from Stripe." }),
);

export const deleted = Schema.optional(Schema.Boolean).pipe(
  Schema.annotateKey({ description: "Whether the object was deleted in Stripe." }),
);

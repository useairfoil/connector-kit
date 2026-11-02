import { Schema } from "effect";

/** Salesforce times, such as `2026-10-15T10:26:49.000+0000`. */
export const Timestamp = Schema.DateFromString;

export const version = Schema.Date.pipe(
  Schema.annotateKey({ description: "Time the row was fetched from Salesforce." }),
);

export const deleted = Schema.optional(Schema.Boolean).pipe(
  Schema.annotateKey({
    description: "Whether the record was deleted or merged into another record in Salesforce.",
  }),
);

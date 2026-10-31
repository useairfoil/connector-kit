import { Schema, SchemaTransformation } from "effect";

/** The API's `YYYYMMDD` as `YYYY-MM-DD`. */
export const isoDay = (date: string) => `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}`;

const ReportDate = Schema.String.check(Schema.isPattern(/^\d{8}$/)).pipe(
  Schema.decodeTo(
    Schema.String,
    SchemaTransformation.transform({
      decode: isoDay,
      encode: (date) => date.replaceAll("-", ""),
    }),
  ),
);

/** `TYPE_INTEGER` metrics, as an Iceberg long. */
export const count = (description: string) =>
  Schema.BigIntFromString.pipe(Schema.annotateKey({ description }));

/** Float, currency, and seconds metrics, as an Iceberg double. */
export const amount = (description: string) =>
  Schema.FiniteFromString.pipe(Schema.annotateKey({ description }));

/** Dimension values are never null. GA uses `(not set)` and `(other)` instead. */
export const dimension = (description: string) =>
  Schema.String.pipe(Schema.annotateKey({ description }));

/** `version` is the fetch time, since report rows have no update time. */
export const common = {
  id: Schema.String.pipe(
    Schema.annotateKey({
      description: "JSON array of the property ID, date, and dimension values.",
    }),
  ),
  version: Schema.Date.pipe(
    Schema.annotateKey({ description: "Time the row was read from Google Analytics." }),
  ),
  property_id: Schema.String.pipe(Schema.annotateKey({ description: "GA4 property ID." })),
  date: ReportDate.pipe(
    Schema.annotateKey({ description: "Day in the property's time zone, as YYYY-MM-DD." }),
  ),
};

export const currencyCode = Schema.String.pipe(
  Schema.annotateKey({ description: "Currency of the revenue fields, the property's currency." }),
);

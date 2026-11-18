import * as Iceberg from "@useairfoil/connector-kit/iceberg";
import { Schema, Struct } from "effect";

import { UnixTime, version } from "./shared";

export const MeterSummarySchema = Schema.Struct({
  // Stripe's ID is only the day, so it repeats across meters and customers.
  key: Schema.String.pipe(Schema.annotateKey({ description: "Meter, customer and summary ID." })),
  id: Schema.String.pipe(Schema.annotateKey({ description: "Meter event summary ID." })),
  version,
  meter: Schema.String.pipe(Schema.annotateKey({ description: "Billing meter ID." })),
  // Stripe reads summaries per customer but leaves the customer out of the object.
  customer: Schema.String.pipe(Schema.annotateKey({ description: "Customer of the usage." })),
  start_time: UnixTime.pipe(Schema.annotateKey({ description: "Start of the day, inclusive." })),
  end_time: UnixTime.pipe(Schema.annotateKey({ description: "End of the day, exclusive." })),
  aggregated_value: Schema.Finite.pipe(
    Schema.annotateKey({ description: "Usage for the day, aggregated by the meter formula." }),
  ),
  livemode: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the object is in live mode." }),
  ),
})
  .annotate({ description: "Daily usage reported by Stripe for each meter and customer." })
  .pipe(Iceberg.identifier("key"));

export type MeterSummary = Schema.Schema.Type<typeof MeterSummarySchema>;

export const MeterSummaryObjectSchema = MeterSummarySchema.mapFields(
  Struct.omit(["key", "version", "customer"]),
);

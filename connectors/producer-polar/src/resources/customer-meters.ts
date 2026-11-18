import * as Iceberg from "@useairfoil/connector-kit/iceberg";
import { Option, Schema } from "effect";

import { date, nullableDate } from "./shared";

const CustomerMeterInputSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Unique identifier." })),
  created_at: date("Time when the record was created."),
  modified_at: nullableDate("Time when the record was last changed."),
  customer_id: Schema.String.pipe(Schema.annotateKey({ description: "Customer." })),
  meter_id: Schema.String.pipe(Schema.annotateKey({ description: "Meter." })),
  consumed_units: Schema.Finite.pipe(Schema.annotateKey({ description: "Units consumed." })),
  credited_units: Schema.Int.pipe(Schema.annotateKey({ description: "Units credited." })),
  balance: Schema.Finite.pipe(
    Schema.annotateKey({ description: "Credited minus consumed units." }),
  ),
});

export const CustomerMeterSchema = CustomerMeterInputSchema.pipe(
  Schema.extendTo(
    {
      version: Schema.Date.pipe(Schema.annotateKey({ description: "Time used to order changes." })),
    },
    { version: (row) => Option.some(row.modified_at ?? row.created_at) },
  ),
)
  .annotate({ description: "Usage and credit balance by customer and meter." })
  .pipe(Iceberg.identifier("id"));

export type CustomerMeter = Schema.Schema.Type<typeof CustomerMeterSchema>;

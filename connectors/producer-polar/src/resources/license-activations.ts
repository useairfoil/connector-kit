import { Iceberg } from "@useairfoil/connector-kit";
import { Option, Schema } from "effect";

import { JsonSchema, date, nullableDate } from "./shared";

const LicenseActivationInputSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Unique identifier." })),
  created_at: date("Time when the record was created."),
  modified_at: nullableDate("Time when the record was last changed."),
  license_key_id: Schema.String.pipe(Schema.annotateKey({ description: "Activated license key." })),
  label: Schema.String.pipe(Schema.annotateKey({ description: "Activation label." })),
  meta: JsonSchema.pipe(Schema.annotateKey({ description: "Activation details stored as JSON." })),
});

export const LicenseActivationSchema = LicenseActivationInputSchema.pipe(
  Schema.extendTo(
    {
      version: Schema.Date.pipe(Schema.annotateKey({ description: "Time used to order changes." })),
    },
    { version: (row) => Option.some(row.modified_at ?? row.created_at) },
  ),
)
  .annotate({ description: "Activations of Polar license keys." })
  .pipe(Iceberg.identifier("id"));

export type LicenseActivation = Schema.Schema.Type<typeof LicenseActivationSchema>;

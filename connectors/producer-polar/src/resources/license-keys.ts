import { Iceberg } from "@useairfoil/connector-kit";
import { Option, Schema } from "effect";

import { date, nullableDate } from "./shared";

const LicenseKeyInputSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Unique identifier." })),
  created_at: date("Time when the record was created."),
  modified_at: nullableDate("Time when the record was last changed."),
  organization_id: Schema.String.pipe(
    Schema.annotateKey({ description: "Organization that owns the key." }),
  ),
  customer_id: Schema.String.pipe(
    Schema.annotateKey({ description: "Customer who owns the key." }),
  ),
  member_id: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Customer member who owns the key." }),
  ),
  benefit_id: Schema.String.pipe(
    Schema.annotateKey({ description: "Benefit that issued the key." }),
  ),
  display_key: Schema.String.pipe(Schema.annotateKey({ description: "Masked license key." })),
  status: Schema.String.pipe(Schema.annotateKey({ description: "License key status." })),
  limit_activations: Schema.NullOr(Schema.Int).pipe(
    Schema.annotateKey({ description: "Maximum activations." }),
  ),
  usage: Schema.Int.pipe(Schema.annotateKey({ description: "Recorded usage." })),
  limit_usage: Schema.NullOr(Schema.Int).pipe(
    Schema.annotateKey({ description: "Maximum usage." }),
  ),
  validations: Schema.Int.pipe(Schema.annotateKey({ description: "Number of validations." })),
  last_validated_at: nullableDate("Time of the last validation."),
  expires_at: nullableDate("Time when the key expires."),
});

export const LicenseKeySchema = LicenseKeyInputSchema.pipe(
  Schema.extendTo(
    {
      version: Schema.Date.pipe(Schema.annotateKey({ description: "Time used to order changes." })),
    },
    { version: (row) => Option.some(row.modified_at ?? row.created_at) },
  ),
)
  .annotate({ description: "License keys issued by license key benefits." })
  .pipe(Iceberg.identifier("id"));

export type LicenseKey = Schema.Schema.Type<typeof LicenseKeySchema>;

import { Iceberg } from "@useairfoil/connector-kit";
import { Option, Schema } from "effect";

import { AddressSchema, MetadataJsonSchema, date, nullableDate } from "./shared";

const CustomerInputSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Unique customer identifier." })),
  created_at: date("Time when the customer was created."),
  modified_at: nullableDate("Time when the customer was last changed."),
  type: Schema.Literals(["individual", "team"]).pipe(
    Schema.annotateKey({ description: "Customer account type." }),
  ),
  deleted_at: nullableDate("Time when the customer was deleted."),
  external_id: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Customer identifier from another system." }),
  ),
  email: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Customer email address." }),
  ),
  email_verified: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the email address is verified." }),
  ),
  name: Schema.NullOr(Schema.String).pipe(Schema.annotateKey({ description: "Customer name." })),
  billing_name: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Name shown on billing details." }),
  ),
  billing_address: Schema.NullOr(AddressSchema).pipe(
    Schema.annotateKey({ description: "Customer billing address." }),
  ),
  organization_id: Schema.String.pipe(
    Schema.annotateKey({ description: "Organization that owns the customer." }),
  ),
  avatar_url: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "URL of the customer avatar." }),
  ),
  locale: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Customer locale." }),
  ),
  default_payment_method_id: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Default payment method for the customer." }),
  ),
  metadata: MetadataJsonSchema.pipe(
    Schema.annotateKey({ description: "Customer metadata stored as JSON." }),
  ),
});

export const CustomerSchema = CustomerInputSchema.pipe(
  Schema.extendTo(
    {
      version: Schema.Date.pipe(
        Schema.annotateKey({ description: "Time used to order customer changes." }),
      ),
      _deleted: Schema.optional(Schema.Boolean).pipe(
        Schema.annotateKey({ description: "Whether the customer was deleted." }),
      ),
    },
    {
      version: (row) => Option.some(row.modified_at ?? row.created_at),
      // Restored customers come back.
      _deleted: (row) => Option.some(row.deleted_at !== null),
    },
  ),
)
  .annotate({
    description: "Customers in a Polar organization.",
  })
  .pipe(Iceberg.identifier("id"));

export type Customer = Schema.Schema.Type<typeof CustomerSchema>;

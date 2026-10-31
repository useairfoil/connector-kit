import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { Long, Metadata, UnixTime, address, deleted, shipping, version } from "./shared";

export const CustomerSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Unique customer identifier." })),
  version,
  created: UnixTime.pipe(
    Schema.annotateKey({ description: "Time when the customer was created." }),
  ),
  livemode: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the customer exists in live mode." }),
  ),
  email: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Customer email address." }),
  ),
  name: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Customer full name or business name." }),
  ),
  phone: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Customer phone number." }),
  ),
  description: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Free-text description." }),
  ),
  currency: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({
      description: "Currency the customer is billed in for recurring billing.",
    }),
  ),
  balance: Long.pipe(
    Schema.annotateKey({
      description:
        "Balance in the smallest currency unit. Negative means credit, positive means owed.",
    }),
  ),
  delinquent: Schema.NullOr(Schema.Boolean).pipe(
    Schema.annotateKey({
      description:
        "Whether the latest invoice state change was a failed payment or missed due date.",
    }),
  ),
  tax_exempt: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Tax exemption status: none, exempt, or reverse." }),
  ),
  invoice_prefix: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Prefix for invoice numbers." }),
  ),
  invoice_settings: Schema.Struct({
    default_payment_method: Schema.NullOr(Schema.String).pipe(
      Schema.annotateKey({ description: "Default payment method for invoices and subscriptions." }),
    ),
  }).pipe(Schema.annotateKey({ description: "Default invoice settings." })),
  address: Schema.NullOr(address).pipe(Schema.annotateKey({ description: "Billing address." })),
  metadata: Metadata.pipe(
    Schema.annotateKey({ description: "Key-value pairs set on the customer." }),
  ),
  _deleted: deleted,
  test_clock: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Test clock the customer belongs to. Sandbox only." }),
  ),
  shipping: Schema.NullOr(shipping).pipe(
    Schema.annotateKey({ description: "Shipping name, phone, and address." }),
  ),
})
  .annotate({
    description: "Customers in a Stripe account.",
  })
  .pipe(Iceberg.identifier("id"));

export type Customer = Schema.Schema.Type<typeof CustomerSchema>;

export const CustomerObjectSchema = CustomerSchema.mapFields(Struct.omit(["version", "_deleted"]));

export type CustomerObject = Schema.Schema.Type<typeof CustomerObjectSchema>;

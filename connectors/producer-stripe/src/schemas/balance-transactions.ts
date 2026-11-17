import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { Long, UnixTime, version } from "./shared";

const FeeDetail = Schema.Struct({
  amount: Long.pipe(Schema.annotateKey({ description: "Amount in the smallest currency unit." })),
  application: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Connect application that earned the fee." }),
  ),
  currency: Schema.String.pipe(Schema.annotateKey({ description: "Three-letter currency code." })),
  description: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Fee description." }),
  ),
  type: Schema.String.pipe(Schema.annotateKey({ description: "Fee type." })),
});

export const BalanceTransactionSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Balance transaction ID." })),
  version,
  amount: Long.pipe(
    Schema.annotateKey({ description: "Gross amount in the smallest currency unit." }),
  ),
  fee: Long.pipe(Schema.annotateKey({ description: "Total fees in the smallest currency unit." })),
  fee_details: Schema.Array(FeeDetail).pipe(
    Schema.annotateKey({ description: "Breakdown of Stripe and application fees." }),
  ),
  net: Long.pipe(Schema.annotateKey({ description: "Net change to the balance." })),
  currency: Schema.String.pipe(Schema.annotateKey({ description: "Three-letter currency code." })),
  exchange_rate: Schema.optional(Schema.NullOr(Schema.Finite)).pipe(
    Schema.annotateKey({ description: "Exchange rate when Stripe converted the amount." }),
  ),
  source: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Stripe object that created this transaction." }),
  ),
  type: Schema.String.pipe(Schema.annotateKey({ description: "Balance transaction type." })),
  reporting_category: Schema.String.pipe(
    Schema.annotateKey({ description: "Stripe accounting category." }),
  ),
  created: UnixTime.pipe(
    Schema.annotateKey({ description: "Time when Stripe created this transaction." }),
  ),
  balance_type: Schema.optional(Schema.String).pipe(
    Schema.annotateKey({ description: "Stripe balance affected by this transaction." }),
  ),
  available_on: UnixTime.pipe(
    Schema.annotateKey({ description: "Date when the net funds become available." }),
  ),
  status: Schema.String.pipe(
    Schema.annotateKey({ description: "Whether the funds are pending or available." }),
  ),
  description: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Transaction description." }),
  ),
})
  .annotate({ description: "Movements in a Stripe account balance." })
  .pipe(Iceberg.identifier("id"));

export type BalanceTransaction = Schema.Schema.Type<typeof BalanceTransactionSchema>;

export const BalanceTransactionObjectSchema = BalanceTransactionSchema.mapFields(
  Struct.omit(["version"]),
);

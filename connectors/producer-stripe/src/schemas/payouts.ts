import * as Iceberg from "@useairfoil/connector-kit/iceberg";
import { Schema, Struct } from "effect";

import { Long, UnixTime, version } from "./shared";

export const PayoutSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Payout ID." })),
  version,
  created: UnixTime.pipe(Schema.annotateKey({ description: "Time when the payout was created." })),
  amount: Long.pipe(
    Schema.annotateKey({ description: "Payout amount, in the smallest currency unit." }),
  ),
  currency: Schema.String.pipe(Schema.annotateKey({ description: "Three-letter currency code." })),
  arrival_date: UnixTime.pipe(
    Schema.annotateKey({ description: "Date the payout is expected to arrive in the bank." }),
  ),
  automatic: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether Stripe scheduled the payout automatically." }),
  ),
  status: Schema.String.pipe(Schema.annotateKey({ description: "Payout status." })),
  method: Schema.String.pipe(
    Schema.annotateKey({ description: "Payout method: standard or instant." }),
  ),
  type: Schema.String.pipe(
    Schema.annotateKey({ description: "Destination type: bank_account or card." }),
  ),
  balance_transaction: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Balance transaction of the payout." }),
  ),
  failure_balance_transaction: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Balance transaction that reversed a failed payout." }),
  ),
  failure_code: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Why the payout failed." }),
  ),
  reconciliation_status: Schema.String.pipe(
    Schema.annotateKey({ description: "Whether Stripe has reconciled this payout." }),
  ),
  balance_transaction_ids: Schema.optional(Schema.Array(Schema.String)).pipe(
    Schema.annotateKey({ description: "Balance transactions included in this automatic payout." }),
  ),
})
  .annotate({ description: "Transfers from the Stripe balance to an external account." })
  .pipe(Iceberg.identifier("id"));

export type Payout = Schema.Schema.Type<typeof PayoutSchema>;

export const PayoutObjectSchema = PayoutSchema.mapFields(
  Struct.omit(["version", "balance_transaction_ids"]),
);

export type PayoutObject = Schema.Schema.Type<typeof PayoutObjectSchema>;

export type PayoutRow = Omit<Payout, "version">;

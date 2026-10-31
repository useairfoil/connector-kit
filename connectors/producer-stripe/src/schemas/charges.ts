import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { Long, Metadata, UnixTime, address, version } from "./shared";

export const ChargeSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Unique charge identifier." })),
  version,
  created: UnixTime.pipe(Schema.annotateKey({ description: "Time when the charge was created." })),
  livemode: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the charge exists in live mode." }),
  ),
  amount: Long.pipe(
    Schema.annotateKey({ description: "Amount to collect, in the smallest currency unit." }),
  ),
  amount_captured: Long.pipe(Schema.annotateKey({ description: "Amount captured." })),
  amount_refunded: Long.pipe(Schema.annotateKey({ description: "Amount refunded." })),
  currency: Schema.String.pipe(
    Schema.annotateKey({ description: "Three-letter currency code, in lowercase." }),
  ),
  status: Schema.String.pipe(
    Schema.annotateKey({ description: "Status: succeeded, pending, or failed." }),
  ),
  paid: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the charge succeeded or was authorized." }),
  ),
  captured: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the charge was captured." }),
  ),
  refunded: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the charge was fully refunded." }),
  ),
  disputed: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the charge was disputed." }),
  ),
  customer: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Customer who was charged, if any." }),
  ),
  payment_intent: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Payment intent of the charge." }),
  ),
  payment_method: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Payment method used." }),
  ),
  balance_transaction: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Balance transaction for the charge." }),
  ),
  description: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Free-text description." }),
  ),
  failure_code: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Error code for failed charges." }),
  ),
  failure_message: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Error message for failed charges." }),
  ),
  payment_method_details: Schema.NullOr(
    Schema.Struct({
      type: Schema.String.pipe(
        Schema.annotateKey({ description: "Payment method type, such as card." }),
      ),
      card: Schema.optional(
        Schema.NullOr(
          Schema.Struct({
            brand: Schema.NullOr(Schema.String).pipe(
              Schema.annotateKey({ description: "Card brand." }),
            ),
            country: Schema.NullOr(Schema.String).pipe(
              Schema.annotateKey({ description: "Two-letter card country." }),
            ),
            funding: Schema.NullOr(Schema.String).pipe(
              Schema.annotateKey({
                description: "Funding type: credit, debit, prepaid, or unknown.",
              }),
            ),
            last4: Schema.NullOr(Schema.String).pipe(
              Schema.annotateKey({ description: "Last four card digits." }),
            ),
            exp_month: Long.pipe(Schema.annotateKey({ description: "Expiry month." })),
            exp_year: Long.pipe(Schema.annotateKey({ description: "Expiry year." })),
            // Stripe leaves this out for restricted keys without payment method access.
            fingerprint: Schema.optional(Schema.NullOr(Schema.String)).pipe(
              Schema.annotateKey({
                description: "Stripe's fingerprint of the card number, for finding duplicates.",
              }),
            ),
          }),
        ),
      ).pipe(Schema.annotateKey({ description: "Card details. Only set for card payments." })),
    }),
  ).pipe(Schema.annotateKey({ description: "Payment method details at the time of the charge." })),
  outcome: Schema.NullOr(
    Schema.Struct({
      type: Schema.String.pipe(
        Schema.annotateKey({ description: "Outcome type, such as authorized or issuer_declined." }),
      ),
      network_status: Schema.NullOr(Schema.String).pipe(
        Schema.annotateKey({ description: "Card network result." }),
      ),
      reason: Schema.NullOr(Schema.String).pipe(
        Schema.annotateKey({ description: "Reason for a decline or block." }),
      ),
      risk_level: Schema.optional(Schema.NullOr(Schema.String)).pipe(
        Schema.annotateKey({ description: "Radar risk level." }),
      ),
      seller_message: Schema.NullOr(Schema.String).pipe(
        Schema.annotateKey({ description: "Explanation of the outcome for the seller." }),
      ),
    }),
  ).pipe(Schema.annotateKey({ description: "Whether the payment was accepted, and why." })),
  metadata: Metadata.pipe(
    Schema.annotateKey({ description: "Key-value pairs set on the charge." }),
  ),
  billing_details: Schema.Struct({
    name: Schema.NullOr(Schema.String).pipe(Schema.annotateKey({ description: "Payer name." })),
    email: Schema.NullOr(Schema.String).pipe(Schema.annotateKey({ description: "Payer email." })),
    phone: Schema.NullOr(Schema.String).pipe(
      Schema.annotateKey({ description: "Payer phone number." }),
    ),
    address: Schema.NullOr(address).pipe(Schema.annotateKey({ description: "Billing address." })),
  }).pipe(
    Schema.annotateKey({
      description: "Billing details of the payment method at the time of the charge.",
    }),
  ),
  receipt_email: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Email the receipt was sent to." }),
  ),
})
  .annotate({
    description: "Charges in a Stripe account.",
  })
  .pipe(Iceberg.identifier("id"));

export type Charge = Schema.Schema.Type<typeof ChargeSchema>;

export const ChargeObjectSchema = ChargeSchema.mapFields(Struct.omit(["version"]));

export type ChargeObject = Schema.Schema.Type<typeof ChargeObjectSchema>;

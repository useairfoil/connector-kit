import * as Iceberg from "@useairfoil/connector-kit/iceberg";
import { Schema, Struct } from "effect";

import { Long, UnixTime, version } from "./shared";

export const CheckoutLineItemSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Line item ID." })),
  description: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Line item description." }),
  ),
  quantity: Schema.optional(Schema.NullOr(Long)).pipe(
    Schema.annotateKey({ description: "Quantity bought." }),
  ),
  currency: Schema.String.pipe(Schema.annotateKey({ description: "Three-letter currency code." })),
  amount_subtotal: Long.pipe(
    Schema.annotateKey({ description: "Amount before discounts and taxes." }),
  ),
  amount_discount: Long.pipe(Schema.annotateKey({ description: "Total discount amount." })),
  amount_tax: Long.pipe(Schema.annotateKey({ description: "Total tax amount." })),
  amount_total: Long.pipe(Schema.annotateKey({ description: "Amount after discounts and taxes." })),
  price: Schema.optional(
    Schema.NullOr(
      Schema.Struct({
        id: Schema.String.pipe(Schema.annotateKey({ description: "Price ID." })),
        product: Schema.String.pipe(Schema.annotateKey({ description: "Product ID." })),
      }),
    ),
  ).pipe(Schema.annotateKey({ description: "Price and product for this line." })),
});

export const CheckoutSessionSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Checkout session ID." })),
  version,
  created: UnixTime.pipe(Schema.annotateKey({ description: "Time when the session was created." })),
  mode: Schema.String.pipe(
    Schema.annotateKey({ description: "Mode: payment, setup, or subscription." }),
  ),
  status: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Session status: open, complete, or expired." }),
  ),
  payment_status: Schema.String.pipe(
    Schema.annotateKey({ description: "Payment status: paid, unpaid, or no_payment_required." }),
  ),
  expires_at: UnixTime.pipe(Schema.annotateKey({ description: "Time when the session expires." })),
  currency: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Three-letter currency code." }),
  ),
  amount_subtotal: Schema.optional(Schema.NullOr(Long)).pipe(
    Schema.annotateKey({ description: "Amount before discounts and taxes." }),
  ),
  amount_total: Schema.optional(Schema.NullOr(Long)).pipe(
    Schema.annotateKey({ description: "Amount after discounts and taxes." }),
  ),
  customer: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Customer of the session." }),
  ),
  payment_intent: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Payment intent created by the session." }),
  ),
  subscription: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Subscription created by the session." }),
  ),
  invoice: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Invoice created by the session." }),
  ),
  payment_link: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Payment link that created the session." }),
  ),
  line_items: Schema.Array(CheckoutLineItemSchema).pipe(
    Schema.annotateKey({ description: "All line items of the session." }),
  ),
})
  .annotate({ description: "Hosted and embedded checkout sessions and their items." })
  .pipe(Iceberg.identifier("id"));

export type CheckoutSession = Schema.Schema.Type<typeof CheckoutSessionSchema>;

export const CheckoutSessionObjectSchema = CheckoutSessionSchema.mapFields(
  Struct.omit(["version", "line_items"]),
);

export type CheckoutSessionObject = Schema.Schema.Type<typeof CheckoutSessionObjectSchema>;

export type CheckoutSessionRow = Omit<CheckoutSession, "version">;

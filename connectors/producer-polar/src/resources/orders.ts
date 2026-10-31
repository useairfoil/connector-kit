import { Iceberg } from "@useairfoil/connector-kit";
import { Option, Schema } from "effect";

import {
  AddressSchema,
  CustomFieldDataJsonSchema,
  MetadataJsonSchema,
  OrderItemSchema,
  date,
  nullableDate,
} from "./shared";

const OrderInputSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Unique order identifier." })),
  created_at: date("Time when the order was created."),
  modified_at: nullableDate("Time when the order was last changed."),
  status: Schema.Literals([
    "draft",
    "pending",
    "paid",
    "refunded",
    "partially_refunded",
    "void",
  ]).pipe(Schema.annotateKey({ description: "Current order status." })),
  paid: Schema.Boolean.pipe(Schema.annotateKey({ description: "Whether the order is paid." })),
  subtotal_amount: Schema.Int.pipe(
    Schema.annotateKey({ description: "Subtotal in the smallest currency unit." }),
  ),
  discount_amount: Schema.Int.pipe(
    Schema.annotateKey({ description: "Discount in the smallest currency unit." }),
  ),
  net_amount: Schema.Int.pipe(
    Schema.annotateKey({ description: "Net amount in the smallest currency unit." }),
  ),
  tax_amount: Schema.Int.pipe(
    Schema.annotateKey({ description: "Tax in the smallest currency unit." }),
  ),
  total_amount: Schema.Int.pipe(
    Schema.annotateKey({ description: "Total in the smallest currency unit." }),
  ),
  applied_balance_amount: Schema.Int.pipe(
    Schema.annotateKey({ description: "Customer balance applied to the order." }),
  ),
  due_amount: Schema.Int.pipe(Schema.annotateKey({ description: "Amount still due." })),
  refunded_amount: Schema.Int.pipe(Schema.annotateKey({ description: "Amount refunded." })),
  refunded_tax_amount: Schema.Int.pipe(Schema.annotateKey({ description: "Tax amount refunded." })),
  refundable_amount: Schema.Int.pipe(
    Schema.annotateKey({ description: "Amount that can still be refunded." }),
  ),
  refundable_tax_amount: Schema.Int.pipe(
    Schema.annotateKey({ description: "Tax that can still be refunded." }),
  ),
  currency: Schema.String.pipe(Schema.annotateKey({ description: "Three-letter currency code." })),
  billing_reason: Schema.Literals([
    "purchase",
    "subscription_create",
    "subscription_cycle",
    "subscription_update",
    "subscription_meter_cycle",
  ]).pipe(Schema.annotateKey({ description: "Reason the order was created." })),
  billing_name: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Name shown on the order billing details." }),
  ),
  billing_address: Schema.NullOr(AddressSchema).pipe(
    Schema.annotateKey({ description: "Billing address for the order." }),
  ),
  invoice_number: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Invoice number for the order." }),
  ),
  receipt_number: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Receipt number for the order." }),
  ),
  is_invoice_generated: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether an invoice was generated." }),
  ),
  customer_id: Schema.String.pipe(
    Schema.annotateKey({ description: "Customer linked to the order." }),
  ),
  product_id: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Product linked to the order." }),
  ),
  discount_id: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Discount applied to the order." }),
  ),
  subscription_id: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Subscription linked to the order." }),
  ),
  checkout_id: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Checkout linked to the order." }),
  ),
  description: Schema.String.pipe(Schema.annotateKey({ description: "Order description." })),
  seats: Schema.optional(Schema.NullOr(Schema.Int)).pipe(
    Schema.annotateKey({ description: "Number of seats." }),
  ),
  units: Schema.NullOr(Schema.Int).pipe(Schema.annotateKey({ description: "Number of units." })),
  next_payment_attempt_at: Schema.optional(Schema.NullOr(Schema.DateFromString)).pipe(
    Schema.annotateKey({ description: "Time of the next payment attempt." }),
  ),
  platform_fee_amount: Schema.Int.pipe(
    Schema.annotateKey({ description: "Platform fee in the smallest currency unit." }),
  ),
  platform_fee_currency: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Currency used for the platform fee." }),
  ),
  metadata: MetadataJsonSchema.pipe(
    Schema.annotateKey({ description: "Order metadata stored as JSON." }),
  ),
  items: Schema.Array(OrderItemSchema).pipe(
    Schema.annotateKey({ description: "Line items in the order." }),
  ),
  custom_field_data: Schema.optional(CustomFieldDataJsonSchema).pipe(
    Schema.annotateKey({ description: "Order custom fields stored as JSON." }),
  ),
});

export const OrderSchema = OrderInputSchema.pipe(
  Schema.extendTo(
    {
      version: Schema.Date.pipe(
        Schema.annotateKey({ description: "Time used to order order changes." }),
      ),
    },
    { version: (row) => Option.some(row.modified_at ?? row.created_at) },
  ),
)
  .annotate({
    description: "Orders in a Polar organization.",
  })
  .pipe(Iceberg.identifier("id"));

export type Order = Schema.Schema.Type<typeof OrderSchema>;

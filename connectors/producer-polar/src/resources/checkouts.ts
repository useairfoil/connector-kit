import { Iceberg } from "@useairfoil/connector-kit";
import { Option, Schema } from "effect";

import {
  AddressSchema,
  CustomFieldDataJsonSchema,
  MetadataJsonSchema,
  date,
  nullableDate,
} from "./shared";

const CheckoutInputSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Unique checkout identifier." })),
  created_at: date("Time when the checkout was created."),
  modified_at: nullableDate("Time when the checkout was last changed."),
  payment_processor: Schema.Literal("stripe").pipe(
    Schema.annotateKey({ description: "Payment processor for the checkout." }),
  ),
  status: Schema.Literals(["open", "expired", "confirmed", "succeeded", "failed"]).pipe(
    Schema.annotateKey({ description: "Current checkout status." }),
  ),
  expires_at: date("Time when the checkout expires."),
  amount: Schema.Int.pipe(
    Schema.annotateKey({ description: "Checkout amount in the smallest currency unit." }),
  ),
  discount_amount: Schema.Int.pipe(
    Schema.annotateKey({ description: "Discount in the smallest currency unit." }),
  ),
  net_amount: Schema.Int.pipe(
    Schema.annotateKey({ description: "Net amount in the smallest currency unit." }),
  ),
  tax_amount: Schema.NullOr(Schema.Int).pipe(
    Schema.annotateKey({ description: "Tax in the smallest currency unit." }),
  ),
  tax_behavior: Schema.NullOr(Schema.Literals(["inclusive", "exclusive"])).pipe(
    Schema.annotateKey({ description: "How tax is applied." }),
  ),
  total_amount: Schema.Int.pipe(
    Schema.annotateKey({ description: "Total in the smallest currency unit." }),
  ),
  currency: Schema.String.pipe(Schema.annotateKey({ description: "Three-letter currency code." })),
  organization_id: Schema.String.pipe(
    Schema.annotateKey({ description: "Organization that owns the checkout." }),
  ),
  product_id: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Product being purchased." }),
  ),
  product_price_id: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Product price being purchased." }),
  ),
  discount_id: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Discount used by the checkout." }),
  ),
  subscription_id: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Subscription created by the checkout." }),
  ),
  customer_id: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Customer linked to the checkout." }),
  ),
  external_customer_id: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Customer identifier from another system." }),
  ),
  allow_discount_codes: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether discount codes can be entered." }),
  ),
  require_billing_address: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether a billing address is required." }),
  ),
  is_discount_applicable: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether a discount can be applied." }),
  ),
  is_free_product_price: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the product price is free." }),
  ),
  is_payment_required: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether payment is required." }),
  ),
  is_payment_setup_required: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether payment setup is required." }),
  ),
  is_payment_form_required: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the payment form is required." }),
  ),
  is_business_customer: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the customer is a business." }),
  ),
  customer_name: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Customer name captured at checkout." }),
  ),
  customer_email: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Customer email captured at checkout." }),
  ),
  customer_billing_name: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Billing name captured at checkout." }),
  ),
  customer_billing_address: Schema.NullOr(AddressSchema).pipe(
    Schema.annotateKey({ description: "Billing address captured at checkout." }),
  ),
  allow_trial: Schema.NullOr(Schema.Boolean).pipe(
    Schema.annotateKey({ description: "Whether a trial can be used." }),
  ),
  active_trial_interval: Schema.NullOr(Schema.Literals(["day", "week", "month", "year"])).pipe(
    Schema.annotateKey({ description: "Unit for the active trial." }),
  ),
  active_trial_interval_count: Schema.NullOr(Schema.Int).pipe(
    Schema.annotateKey({ description: "Number of active trial intervals." }),
  ),
  trial_end: nullableDate("Time when the trial ends."),
  trial_interval: Schema.NullOr(Schema.Literals(["day", "week", "month", "year"])).pipe(
    Schema.annotateKey({ description: "Unit for the trial." }),
  ),
  trial_interval_count: Schema.NullOr(Schema.Int).pipe(
    Schema.annotateKey({ description: "Number of trial intervals." }),
  ),
  seats: Schema.optional(Schema.NullOr(Schema.Int)).pipe(
    Schema.annotateKey({ description: "Number of seats." }),
  ),
  min_seats: Schema.optional(Schema.NullOr(Schema.Int)).pipe(
    Schema.annotateKey({ description: "Minimum number of seats." }),
  ),
  max_seats: Schema.optional(Schema.NullOr(Schema.Int)).pipe(
    Schema.annotateKey({ description: "Maximum number of seats." }),
  ),
  units: Schema.NullOr(Schema.Int).pipe(Schema.annotateKey({ description: "Number of units." })),
  min_units: Schema.NullOr(Schema.Int).pipe(
    Schema.annotateKey({ description: "Minimum number of units." }),
  ),
  max_units: Schema.NullOr(Schema.Int).pipe(
    Schema.annotateKey({ description: "Maximum number of units." }),
  ),
  metadata: MetadataJsonSchema.pipe(
    Schema.annotateKey({ description: "Checkout metadata stored as JSON." }),
  ),
  custom_field_data: Schema.optional(CustomFieldDataJsonSchema).pipe(
    Schema.annotateKey({ description: "Checkout custom fields stored as JSON." }),
  ),
});

export const CheckoutSchema = CheckoutInputSchema.pipe(
  Schema.extendTo(
    {
      version: Schema.Date.pipe(
        Schema.annotateKey({ description: "Time used to order checkout changes." }),
      ),
    },
    { version: (row) => Option.some(row.modified_at ?? row.created_at) },
  ),
)
  .annotate({
    description: "Checkout sessions in a Polar organization.",
  })
  .pipe(Iceberg.identifier("id"));

export type Checkout = Schema.Schema.Type<typeof CheckoutSchema>;

import { Iceberg } from "@useairfoil/connector-kit";
import * as Schema from "effect/Schema";

import { address, attributes, discountAllocations, moneyBag, taxLines } from "../shared";

export const OrderCancelReasonSchema = Schema.Literals([
  "CUSTOMER",
  "DECLINED",
  "FRAUD",
  "INVENTORY",
  "STAFF",
  "OTHER",
]);

export const OrderFinancialStatusSchema = Schema.Literals([
  "PENDING",
  "AUTHORIZED",
  "PARTIALLY_PAID",
  "PARTIALLY_REFUNDED",
  "VOIDED",
  "PAID",
  "REFUNDED",
  "EXPIRED",
]);

export const DiscountApplicationTypeSchema = Schema.Literals([
  "DISCOUNT_CODE",
  "MANUAL",
  "AUTOMATIC",
  "SCRIPT",
]);

// Shopify deprecated ONE but still returns it for older orders.
export const DiscountAllocationMethodSchema = Schema.Literals(["ACROSS", "EACH", "ONE"]);

export const DiscountTargetSelectionSchema = Schema.Literals(["ALL", "ENTITLED", "EXPLICIT"]);

export const DiscountTargetTypeSchema = Schema.Literals(["LINE_ITEM", "SHIPPING_LINE"]);

export const DiscountValueTypeSchema = Schema.Literals(["PERCENTAGE", "FIXED_AMOUNT"]);

export const DiscountApplicationSchema = Schema.Struct({
  index: Schema.Int.pipe(
    Schema.annotateKey({ description: "Position used by discount allocations." }),
  ),
  type: DiscountApplicationTypeSchema.pipe(
    Schema.annotateKey({ description: "How the discount was applied." }),
  ),
  code: Schema.NullOr(Schema.String).pipe(Schema.annotateKey({ description: "Discount code." })),
  title: Schema.NullOr(Schema.String).pipe(Schema.annotateKey({ description: "Discount title." })),
  description: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Manual discount description." }),
  ),
  allocationMethod: DiscountAllocationMethodSchema.pipe(
    Schema.annotateKey({ description: "How the value is split." }),
  ),
  targetSelection: DiscountTargetSelectionSchema.pipe(
    Schema.annotateKey({ description: "Which lines are targeted." }),
  ),
  targetType: DiscountTargetTypeSchema.pipe(
    Schema.annotateKey({ description: "Kind of lines targeted." }),
  ),
  valueType: DiscountValueTypeSchema.pipe(
    Schema.annotateKey({ description: "Whether the value is a percent." }),
  ),
  value: Schema.String.pipe(
    Schema.annotateKey({ description: "Percent or amount in the customer currency." }),
  ),
});

export const ShippingLineSchema = Schema.Struct({
  id: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Unique shipping line identifier." }),
  ),
  title: Schema.String.pipe(Schema.annotateKey({ description: "Shipping method title." })),
  code: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Shipping rate code." }),
  ),
  source: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Source of the shipping rate." }),
  ),
  carrierIdentifier: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Carrier service identifier." }),
  ),
  phone: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Phone number for the shipping line." }),
  ),
  isRemoved: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the line was removed by an edit." }),
  ),
  originalPriceSet: moneyBag.pipe(Schema.annotateKey({ description: "Price before discounts." })),
  discountedPriceSet: moneyBag.pipe(Schema.annotateKey({ description: "Price after discounts." })),
  currentDiscountedPriceSet: moneyBag.pipe(
    Schema.annotateKey({ description: "Price after discounts, edits, and refunds." }),
  ),
  taxLines: taxLines.pipe(Schema.annotateKey({ description: "Taxes on the shipping line." })),
  discountAllocations: discountAllocations.pipe(
    Schema.annotateKey({ description: "Discounts on the line." }),
  ),
});

export const OrderLineItemSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Unique line item identifier." })),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Product and variant name." })),
  title: Schema.String.pipe(Schema.annotateKey({ description: "Product title." })),
  variantTitle: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Variant title." }),
  ),
  sku: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Stock keeping unit." }),
  ),
  vendor: Schema.NullOr(Schema.String).pipe(Schema.annotateKey({ description: "Product vendor." })),
  productId: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Product identifier." }),
  ),
  variantId: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Product variant identifier." }),
  ),
  quantity: Schema.Int.pipe(
    Schema.annotateKey({ description: "Quantity when the order was placed." }),
  ),
  currentQuantity: Schema.Int.pipe(
    Schema.annotateKey({ description: "Quantity after removals and refunds." }),
  ),
  taxable: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the line item is taxable." }),
  ),
  requiresShipping: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the line item needs shipping." }),
  ),
  isGiftCard: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the line item is a gift card." }),
  ),
  originalUnitPriceSet: moneyBag.pipe(
    Schema.annotateKey({ description: "Unit price before discounts." }),
  ),
  totalDiscountSet: moneyBag.pipe(
    Schema.annotateKey({ description: "Total discount on the line." }),
  ),
  taxLines: taxLines.pipe(Schema.annotateKey({ description: "Taxes on the line." })),
  discountAllocations: discountAllocations.pipe(
    Schema.annotateKey({ description: "Discounts on the line." }),
  ),
  customAttributes: attributes.pipe(Schema.annotateKey({ description: "Custom line properties." })),
});

export const OrderSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Unique order identifier." })),
  legacyResourceId: Schema.String.pipe(
    Schema.annotateKey({ description: "Numeric order identifier stored as text." }),
  ),
  name: Schema.String.pipe(
    Schema.annotateKey({ description: "Order name shown to the merchant." }),
  ),
  email: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Email used for the order." }),
  ),
  phone: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Phone used for the order." }),
  ),
  customerId: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Customer identifier." }),
  ),
  customerLocale: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Customer language." }),
  ),
  customerAcceptsMarketing: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the buyer accepts marketing." }),
  ),
  billingAddress: Schema.NullOr(address).pipe(
    Schema.annotateKey({ description: "Billing address." }),
  ),
  shippingAddress: Schema.NullOr(address).pipe(
    Schema.annotateKey({ description: "Shipping address." }),
  ),
  note: Schema.NullOr(Schema.String).pipe(Schema.annotateKey({ description: "Order note." })),
  customAttributes: attributes.pipe(
    Schema.annotateKey({ description: "Custom order attributes." }),
  ),
  tags: Schema.Array(Schema.String).pipe(
    Schema.annotateKey({ description: "Tags added to the order." }),
  ),
  confirmationNumber: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Confirmation number." }),
  ),
  poNumber: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Purchase order number." }),
  ),
  sourceName: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Channel that created the order." }),
  ),
  sourceIdentifier: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Identifier from the source." }),
  ),
  appId: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "App that created the order." }),
  ),
  paymentGatewayNames: Schema.Array(Schema.String).pipe(
    Schema.annotateKey({ description: "Payment gateways used." }),
  ),
  test: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the order is a test order." }),
  ),
  taxesIncluded: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether prices include taxes." }),
  ),
  taxExempt: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the order is exempt from tax." }),
  ),
  dutiesIncluded: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether prices include duties." }),
  ),
  estimatedTaxes: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether taxes are estimates." }),
  ),
  totalWeight: Schema.NullOr(Schema.Int).pipe(
    Schema.annotateKey({ description: "Total weight in grams." }),
  ),
  displayFinancialStatus: Schema.NullOr(OrderFinancialStatusSchema).pipe(
    Schema.annotateKey({ description: "Payment status of the order." }),
  ),
  cancelReason: Schema.NullOr(OrderCancelReasonSchema).pipe(
    Schema.annotateKey({ description: "Reason the order was cancelled." }),
  ),
  cancelledAt: Schema.NullOr(Schema.Date).pipe(
    Schema.annotateKey({ description: "Time when the order was cancelled." }),
  ),
  closedAt: Schema.NullOr(Schema.Date).pipe(
    Schema.annotateKey({ description: "Time when the order was closed." }),
  ),
  processedAt: Schema.Date.pipe(
    Schema.annotateKey({ description: "Time when the order was processed." }),
  ),
  createdAt: Schema.Date.pipe(
    Schema.annotateKey({ description: "Time when the order was created." }),
  ),
  updatedAt: Schema.Date.pipe(
    Schema.annotateKey({ description: "Time when the order was last changed." }),
  ),
  currencyCode: Schema.String.pipe(Schema.annotateKey({ description: "Shop currency code." })),
  presentmentCurrencyCode: Schema.String.pipe(
    Schema.annotateKey({ description: "Customer currency code." }),
  ),
  discountCodes: Schema.Array(Schema.String).pipe(
    Schema.annotateKey({ description: "Discount codes used." }),
  ),
  discountApplications: Schema.Array(DiscountApplicationSchema).pipe(
    Schema.annotateKey({ description: "Discounts applied to the order." }),
  ),
  subtotalPriceSet: Schema.NullOr(moneyBag).pipe(
    Schema.annotateKey({ description: "Subtotal when the order was placed." }),
  ),
  currentSubtotalPriceSet: moneyBag.pipe(
    Schema.annotateKey({ description: "Subtotal after edits and refunds." }),
  ),
  totalDiscountsSet: Schema.NullOr(moneyBag).pipe(
    Schema.annotateKey({ description: "Discounts when the order was placed." }),
  ),
  currentTotalDiscountsSet: moneyBag.pipe(
    Schema.annotateKey({ description: "Discounts after edits and refunds." }),
  ),
  totalShippingPriceSet: moneyBag.pipe(
    Schema.annotateKey({ description: "Shipping when the order was placed." }),
  ),
  currentShippingPriceSet: moneyBag.pipe(
    Schema.annotateKey({ description: "Shipping after edits and refunds." }),
  ),
  totalTaxSet: Schema.NullOr(moneyBag).pipe(
    Schema.annotateKey({ description: "Tax when the order was placed." }),
  ),
  currentTotalTaxSet: moneyBag.pipe(
    Schema.annotateKey({ description: "Tax after edits and refunds." }),
  ),
  originalTotalDutiesSet: Schema.NullOr(moneyBag).pipe(
    Schema.annotateKey({ description: "Duties when the order was placed." }),
  ),
  currentTotalDutiesSet: Schema.NullOr(moneyBag).pipe(
    Schema.annotateKey({ description: "Duties after edits and refunds." }),
  ),
  totalPriceSet: moneyBag.pipe(
    Schema.annotateKey({ description: "Total when the order was placed." }),
  ),
  currentTotalPriceSet: moneyBag.pipe(
    Schema.annotateKey({ description: "Total after edits and refunds." }),
  ),
  taxLines: taxLines.pipe(Schema.annotateKey({ description: "Taxes when the order was placed." })),
  shippingLines: Schema.Array(ShippingLineSchema).pipe(
    Schema.annotateKey({ description: "Shipping lines, including removed ones." }),
  ),
  lineItems: Schema.Array(OrderLineItemSchema).pipe(
    Schema.annotateKey({ description: "Line items in the order." }),
  ),
  _deleted: Schema.optional(Schema.Boolean).pipe(
    Schema.annotateKey({ description: "Whether the order was deleted." }),
  ),
})
  .annotate({
    description: "Orders in a Shopify store.",
  })
  .pipe(Iceberg.identifier("id"));

export type Order = Schema.Schema.Type<typeof OrderSchema>;

export type DiscountApplication = Schema.Schema.Type<typeof DiscountApplicationSchema>;

export type DiscountApplicationType = Schema.Schema.Type<typeof DiscountApplicationTypeSchema>;

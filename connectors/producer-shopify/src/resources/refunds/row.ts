import { Iceberg } from "@useairfoil/connector-kit";
import * as Schema from "effect/Schema";

import { moneyBag } from "../shared";

export const TransactionKindSchema = Schema.Literals([
  "SALE",
  "CAPTURE",
  "AUTHORIZATION",
  "VOID",
  "REFUND",
  "CHANGE",
  "EMV_AUTHORIZATION",
  "SUGGESTED_REFUND",
]);

export const TransactionStatusSchema = Schema.Literals([
  "SUCCESS",
  "FAILURE",
  "PENDING",
  "ERROR",
  "AWAITING_RESPONSE",
  "UNKNOWN",
]);

export const RestockTypeSchema = Schema.Literals([
  "RETURN",
  "CANCEL",
  "LEGACY_RESTOCK",
  "NO_RESTOCK",
]);

export const RefundSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Unique refund identifier." })),
  legacyResourceId: Schema.String.pipe(
    Schema.annotateKey({ description: "Numeric refund identifier stored as text." }),
  ),
  orderId: Schema.String.pipe(Schema.annotateKey({ description: "Refunded order identifier." })),
  note: Schema.NullOr(Schema.String).pipe(Schema.annotateKey({ description: "Refund note." })),
  createdAt: Schema.NullOr(Schema.Date).pipe(
    Schema.annotateKey({ description: "Time when the refund was created." }),
  ),
  processedAt: Schema.Date.pipe(
    Schema.annotateKey({ description: "Time when the refund was processed." }),
  ),
  transactions: Schema.Array(
    Schema.Struct({
      id: Schema.String.pipe(Schema.annotateKey({ description: "Unique transaction identifier." })),
      kind: TransactionKindSchema.pipe(Schema.annotateKey({ description: "Kind of transaction." })),
      status: TransactionStatusSchema.pipe(
        Schema.annotateKey({ description: "Status reported for the transaction." }),
      ),
      amount: Schema.String.pipe(
        Schema.annotateKey({ description: "Amount in the customer currency." }),
      ),
      currencyCode: Schema.String.pipe(
        Schema.annotateKey({ description: "Customer currency code." }),
      ),
      gateway: Schema.NullOr(Schema.String).pipe(
        Schema.annotateKey({ description: "Payment gateway." }),
      ),
      test: Schema.Boolean.pipe(
        Schema.annotateKey({ description: "Whether the transaction is a test." }),
      ),
      errorCode: Schema.NullOr(Schema.String).pipe(
        Schema.annotateKey({ description: "Gateway error code." }),
      ),
      parentTransactionId: Schema.NullOr(Schema.String).pipe(
        Schema.annotateKey({ description: "Transaction this one refunds." }),
      ),
      createdAt: Schema.Date.pipe(
        Schema.annotateKey({ description: "Time when the transaction was created." }),
      ),
      processedAt: Schema.NullOr(Schema.Date).pipe(
        Schema.annotateKey({ description: "Time when the transaction was processed." }),
      ),
    }),
  ).pipe(Schema.annotateKey({ description: "Transactions that move the refunded money." })),
  refundLineItems: Schema.Array(
    Schema.Struct({
      id: Schema.NullOr(Schema.String).pipe(
        Schema.annotateKey({ description: "Unique refund line item identifier." }),
      ),
      lineItemId: Schema.String.pipe(
        Schema.annotateKey({ description: "Refunded order line item identifier." }),
      ),
      quantity: Schema.Int.pipe(Schema.annotateKey({ description: "Quantity refunded." })),
      restockType: RestockTypeSchema.pipe(
        Schema.annotateKey({ description: "How the items were restocked." }),
      ),
      locationId: Schema.NullOr(Schema.String).pipe(
        Schema.annotateKey({ description: "Restock location identifier." }),
      ),
      subtotalSet: moneyBag.pipe(Schema.annotateKey({ description: "Refunded subtotal." })),
      totalTaxSet: moneyBag.pipe(Schema.annotateKey({ description: "Refunded tax." })),
    }),
  ).pipe(Schema.annotateKey({ description: "Refunded order line items." })),
  refundShippingLines: Schema.Array(
    Schema.Struct({
      id: Schema.String.pipe(
        Schema.annotateKey({ description: "Unique refund shipping line identifier." }),
      ),
      shippingLineId: Schema.NullOr(Schema.String).pipe(
        Schema.annotateKey({ description: "Refunded shipping line." }),
      ),
      subtotalAmountSet: moneyBag.pipe(
        Schema.annotateKey({ description: "Refunded shipping amount." }),
      ),
    }),
  ).pipe(Schema.annotateKey({ description: "Refunded shipping." })),
  orderAdjustments: Schema.Array(
    Schema.Struct({
      id: Schema.String.pipe(
        Schema.annotateKey({ description: "Unique order adjustment identifier." }),
      ),
      reason: Schema.NullOr(Schema.String).pipe(
        Schema.annotateKey({ description: "Reason for the adjustment." }),
      ),
      amountSet: moneyBag.pipe(Schema.annotateKey({ description: "Adjustment amount." })),
      taxAmountSet: moneyBag.pipe(Schema.annotateKey({ description: "Tax on the adjustment." })),
    }),
  ).pipe(Schema.annotateKey({ description: "Refund discrepancy adjustments." })),
  duties: Schema.Array(
    Schema.Struct({
      dutyId: Schema.NullOr(Schema.String).pipe(
        Schema.annotateKey({ description: "Refunded duty identifier." }),
      ),
      amountSet: moneyBag.pipe(Schema.annotateKey({ description: "Refunded duty amount." })),
    }),
  ).pipe(Schema.annotateKey({ description: "Refunded duties." })),
})
  .annotate({
    description: "Refunds on orders in a Shopify store.",
  })
  .pipe(Iceberg.identifier("id"));

export type Refund = Schema.Schema.Type<typeof RefundSchema>;

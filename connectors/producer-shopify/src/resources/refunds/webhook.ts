import * as Schema from "effect/Schema";

import { RestMoneyBagSchema, fromRest, gid, normalizeAmount, upper } from "../shared";
import {
  type Refund,
  RestockTypeSchema,
  TransactionKindSchema,
  TransactionStatusSchema,
} from "./row";

export const RefundWebhookPayloadSchema = Schema.Struct({
  id: Schema.Number,
  admin_graphql_api_id: Schema.String,
  order_id: Schema.Number,
  note: Schema.NullOr(Schema.String),
  created_at: Schema.NullOr(Schema.DateFromString),
  processed_at: Schema.DateFromString,
  transactions: Schema.Array(
    Schema.Struct({
      admin_graphql_api_id: Schema.String,
      kind: upper(TransactionKindSchema),
      status: upper(TransactionStatusSchema),
      amount: Schema.String,
      currency: Schema.String,
      gateway: Schema.NullOr(Schema.String),
      test: Schema.Boolean,
      error_code: Schema.NullOr(Schema.String),
      parent_id: Schema.NullOr(Schema.Number),
      created_at: Schema.DateFromString,
      processed_at: Schema.NullOr(Schema.DateFromString),
    }),
  ),
  refund_line_items: Schema.Array(
    Schema.Struct({
      id: Schema.Number,
      line_item_id: Schema.Number,
      quantity: Schema.Int,
      restock_type: upper(RestockTypeSchema),
      location_id: Schema.NullOr(Schema.Number),
      subtotal_set: RestMoneyBagSchema,
      total_tax_set: RestMoneyBagSchema,
    }),
  ),
  refund_shipping_lines: Schema.Array(
    Schema.Struct({
      id: Schema.Number,
      shipping_line_id: Schema.NullOr(Schema.Number),
      subtotal_amount_set: RestMoneyBagSchema,
    }),
  ),
  order_adjustments: Schema.Array(
    Schema.Struct({
      id: Schema.Number,
      kind: Schema.NullOr(Schema.String),
      reason: Schema.NullOr(Schema.String),
      amount_set: RestMoneyBagSchema,
      tax_amount_set: RestMoneyBagSchema,
    }),
  ),
  duties: Schema.Array(
    Schema.Struct({
      duty_id: Schema.NullOr(Schema.Number),
      amount_set: RestMoneyBagSchema,
    }),
  ),
});

export const RefundEventSchema = Schema.toType(RefundWebhookPayloadSchema);

export type RefundWebhookPayload = Schema.Schema.Type<typeof RefundWebhookPayloadSchema>;

export const fromRefundWebhook = (payload: RefundWebhookPayload): Refund => ({
  id: payload.admin_graphql_api_id,
  legacyResourceId: String(payload.id),
  orderId: gid("Order", payload.order_id),
  note: payload.note ?? "",
  createdAt: payload.created_at,
  processedAt: payload.processed_at,
  version: payload.processed_at,
  // Webhooks only give transaction amounts in the customer currency.
  transactions: payload.transactions.map((transaction) => ({
    id: transaction.admin_graphql_api_id,
    kind: transaction.kind,
    status: transaction.status,
    amount: normalizeAmount(transaction.amount),
    currencyCode: transaction.currency,
    gateway: transaction.gateway,
    test: transaction.test,
    errorCode: transaction.error_code?.toUpperCase() ?? null,
    parentTransactionId:
      transaction.parent_id === null ? null : gid("OrderTransaction", transaction.parent_id),
    createdAt: transaction.created_at,
    processedAt: transaction.processed_at,
  })),
  refundLineItems: payload.refund_line_items.map((item) => ({
    id: gid("RefundLineItem", item.id),
    lineItemId: gid("LineItem", item.line_item_id),
    quantity: item.quantity,
    restockType: item.restock_type,
    locationId: item.location_id === null ? null : gid("Location", item.location_id),
    subtotalSet: fromRest.money(item.subtotal_set),
    totalTaxSet: fromRest.money(item.total_tax_set),
  })),
  refundShippingLines: payload.refund_shipping_lines.map((line) => ({
    id: gid("RefundShippingLine", line.id),
    shippingLineId:
      line.shipping_line_id === null ? null : gid("ShippingLine", line.shipping_line_id),
    subtotalAmountSet: fromRest.money(line.subtotal_amount_set),
  })),
  // Webhooks also list refunded shipping as an adjustment. GraphQL doesn't.
  orderAdjustments: payload.order_adjustments
    .filter((adjustment) => adjustment.kind !== "shipping_refund")
    .map((adjustment) => ({
      id: gid("OrderAdjustment", adjustment.id),
      // Webhooks send text like "Refund discrepancy". GraphQL sends REFUND_DISCREPANCY.
      reason: adjustment.reason?.toUpperCase().replaceAll(" ", "_") ?? null,
      amountSet: fromRest.money(adjustment.amount_set),
      taxAmountSet: fromRest.money(adjustment.tax_amount_set),
    })),
  duties: payload.duties.map((duty) => ({
    dutyId: duty.duty_id === null ? null : gid("Duty", duty.duty_id),
    amountSet: fromRest.money(duty.amount_set),
  })),
});

import * as Schema from "effect/Schema";

import {
  GraphQLMoneyBagSchema,
  MoneyBagFields,
  type Nodes,
  PageInfoFields,
  connection,
  fromGraphQL,
  idRef,
  normalizeAmount,
  pageQuery,
} from "../shared";
import {
  type Refund,
  RestockTypeSchema,
  TransactionKindSchema,
  TransactionStatusSchema,
} from "./row";

const TransactionFields = `id kind status gateway test errorCode parentTransaction { id } createdAt processedAt amountSet { ${MoneyBagFields} }`;

const RefundLineItemFields = `id lineItem { id } quantity restockType location { id } subtotalSet { ${MoneyBagFields} } totalTaxSet { ${MoneyBagFields} }`;

const RefundShippingLineFields = `id shippingLine { id } subtotalAmountSet { ${MoneyBagFields} }`;

const OrderAdjustmentFields = `id reason amountSet { ${MoneyBagFields} } taxAmountSet { ${MoneyBagFields} }`;

export const RefundFields = `
  id
  legacyResourceId
  note
  createdAt
  processedAt
  duties { originalDuty { id } amountSet { ${MoneyBagFields} } }
  transactions(first: 10) { nodes { ${TransactionFields} } ${PageInfoFields} }
  refundLineItems(first: 50) { nodes { ${RefundLineItemFields} } ${PageInfoFields} }
  refundShippingLines(first: 10) { nodes { ${RefundShippingLineFields} } ${PageInfoFields} }
  orderAdjustments(first: 10) { nodes { ${OrderAdjustmentFields} } ${PageInfoFields} }
`;

const refundConnectionQuery = (name: string, selection: string) => `#graphql
query ${name}($id: ID!, $first: Int!, $after: String) {
  node: refund(id: $id) {
    connection: ${selection}
  }
}
`;

export const RefundTransactionsQuery = refundConnectionQuery(
  "AirfoilRefundTransactions",
  `transactions(first: $first, after: $after) { nodes { ${TransactionFields} } ${PageInfoFields} }`,
);

export const RefundLineItemsQuery = refundConnectionQuery(
  "AirfoilRefundLineItems",
  `refundLineItems(first: $first, after: $after) { nodes { ${RefundLineItemFields} } ${PageInfoFields} }`,
);

export const RefundShippingLinesQuery = refundConnectionQuery(
  "AirfoilRefundShippingLines",
  `refundShippingLines(first: $first, after: $after) { nodes { ${RefundShippingLineFields} } ${PageInfoFields} }`,
);

export const RefundOrderAdjustmentsQuery = refundConnectionQuery(
  "AirfoilRefundOrderAdjustments",
  `orderAdjustments(first: $first, after: $after) { nodes { ${OrderAdjustmentFields} } ${PageInfoFields} }`,
);

export const GraphQLRefundTransactionsSchema = connection(
  Schema.Struct({
    id: Schema.String,
    kind: TransactionKindSchema,
    status: TransactionStatusSchema,
    gateway: Schema.NullOr(Schema.String),
    test: Schema.Boolean,
    errorCode: Schema.NullOr(Schema.String),
    parentTransaction: idRef,
    createdAt: Schema.DateFromString,
    processedAt: Schema.NullOr(Schema.DateFromString),
    amountSet: GraphQLMoneyBagSchema,
  }),
);

export const GraphQLRefundLineItemsSchema = connection(
  Schema.Struct({
    id: Schema.NullOr(Schema.String),
    lineItem: Schema.Struct({ id: Schema.String }),
    quantity: Schema.Int,
    restockType: RestockTypeSchema,
    location: idRef,
    subtotalSet: GraphQLMoneyBagSchema,
    totalTaxSet: GraphQLMoneyBagSchema,
  }),
);

export const GraphQLRefundShippingLinesSchema = connection(
  Schema.Struct({
    id: Schema.String,
    shippingLine: idRef,
    subtotalAmountSet: GraphQLMoneyBagSchema,
  }),
);

export const GraphQLOrderAdjustmentsSchema = connection(
  Schema.Struct({
    id: Schema.String,
    reason: Schema.NullOr(Schema.String),
    amountSet: GraphQLMoneyBagSchema,
    taxAmountSet: GraphQLMoneyBagSchema,
  }),
);

export const GraphQLRefundNodeSchema = Schema.Struct({
  id: Schema.String,
  legacyResourceId: Schema.String,
  note: Schema.NullOr(Schema.String),
  createdAt: Schema.NullOr(Schema.DateFromString),
  processedAt: Schema.DateFromString,
  duties: Schema.NullOr(
    Schema.Array(Schema.Struct({ originalDuty: idRef, amountSet: GraphQLMoneyBagSchema })),
  ),
  transactions: GraphQLRefundTransactionsSchema,
  refundLineItems: GraphQLRefundLineItemsSchema,
  refundShippingLines: GraphQLRefundShippingLinesSchema,
  orderAdjustments: GraphQLOrderAdjustmentsSchema,
});

export type GraphQLRefundNode = Schema.Schema.Type<typeof GraphQLRefundNodeSchema>;

export const fromRefundNode = (
  orderId: string,
  node: GraphQLRefundNode,
  nested: {
    readonly transactions: Nodes<typeof GraphQLRefundTransactionsSchema>;
    readonly refundLineItems: Nodes<typeof GraphQLRefundLineItemsSchema>;
    readonly refundShippingLines: Nodes<typeof GraphQLRefundShippingLinesSchema>;
    readonly orderAdjustments: Nodes<typeof GraphQLOrderAdjustmentsSchema>;
  },
): Refund => ({
  id: node.id,
  legacyResourceId: node.legacyResourceId,
  orderId,
  note: node.note ?? "",
  createdAt: node.createdAt,
  processedAt: node.processedAt,
  version: node.processedAt,
  transactions: nested.transactions.map((transaction) => ({
    id: transaction.id,
    kind: transaction.kind,
    status: transaction.status,
    amount: normalizeAmount(transaction.amountSet.presentmentMoney.amount),
    currencyCode: transaction.amountSet.presentmentMoney.currencyCode,
    gateway: transaction.gateway,
    test: transaction.test,
    errorCode: transaction.errorCode,
    parentTransactionId: transaction.parentTransaction?.id ?? null,
    createdAt: transaction.createdAt,
    processedAt: transaction.processedAt,
  })),
  refundLineItems: nested.refundLineItems.map((item) => ({
    id: item.id,
    lineItemId: item.lineItem.id,
    quantity: item.quantity,
    restockType: item.restockType,
    locationId: item.location?.id ?? null,
    subtotalSet: fromGraphQL.money(item.subtotalSet),
    totalTaxSet: fromGraphQL.money(item.totalTaxSet),
  })),
  refundShippingLines: nested.refundShippingLines.map((line) => ({
    id: line.id,
    shippingLineId: line.shippingLine?.id ?? null,
    subtotalAmountSet: fromGraphQL.money(line.subtotalAmountSet),
  })),
  orderAdjustments: nested.orderAdjustments.map((adjustment) => ({
    id: adjustment.id,
    reason: adjustment.reason,
    amountSet: fromGraphQL.money(adjustment.amountSet),
    taxAmountSet: fromGraphQL.money(adjustment.taxAmountSet),
  })),
  duties: (node.duties ?? []).map((duty) => ({
    dutyId: duty.originalDuty?.id ?? null,
    amountSet: fromGraphQL.money(duty.amountSet),
  })),
});

export const OrderRefundsQuery = pageQuery(
  "AirfoilOrderRefunds",
  "orders",
  `id refunds { ${RefundFields} }`,
);

export const GraphQLOrderRefundsDataSchema = Schema.Struct({
  orders: connection(
    Schema.Struct({ id: Schema.String, refunds: Schema.Array(GraphQLRefundNodeSchema) }),
  ),
});

export const RefundsForOrderQuery = `#graphql
query AirfoilRefundsForOrder($id: ID!) {
  order(id: $id) { id refunds { ${RefundFields} } }
}
`;

export const GraphQLRefundsForOrderSchema = Schema.Struct({
  order: Schema.NullOr(
    Schema.Struct({ id: Schema.String, refunds: Schema.Array(GraphQLRefundNodeSchema) }),
  ),
});

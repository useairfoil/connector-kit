import * as Iceberg from "@useairfoil/connector-kit/iceberg";
import { Schema } from "effect";

import { moneyBag, readVersion } from "./shared";

export const Ref = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Shopify record ID." })),
});

export const Money = Schema.Struct({
  amount: Schema.String.pipe(Schema.annotateKey({ description: "Money amount." })),
  currencyCode: Schema.String.pipe(
    Schema.annotateKey({ description: "Three-letter currency code." }),
  ),
});

export const InventoryTransfersNode = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Shopify record ID." })),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Display name in Shopify." })),
  status: Schema.String.pipe(Schema.annotateKey({ description: "Current status in Shopify." })),
  dateCreated: Schema.NullOr(Schema.DateFromString).pipe(
    Schema.annotateKey({ description: "Time Shopify created the record." }),
  ),
  referenceName: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Merchant reference for the transfer." }),
  ),
  totalQuantity: Schema.Int.pipe(Schema.annotateKey({ description: "Total number of units." })),
  receivedQuantity: Schema.Int.pipe(
    Schema.annotateKey({ description: "Number of units received." }),
  ),
});

export const InventoryTransfersSchema = InventoryTransfersNode.mapFields((fields) => ({
  ...fields,
  version: readVersion,
}))
  .annotate({ description: "Transfers between inventory locations." })
  .pipe(Iceberg.identifier("id"));

export const AbandonedCheckoutsNode = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Shopify record ID." })),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Display name in Shopify." })),
  createdAt: Schema.DateFromString.pipe(
    Schema.annotateKey({ description: "Time Shopify created the record." }),
  ),
  updatedAt: Schema.DateFromString.pipe(
    Schema.annotateKey({ description: "Time Shopify last changed the record." }),
  ),
  completedAt: Schema.NullOr(Schema.DateFromString).pipe(
    Schema.annotateKey({ description: "Time the record was completed." }),
  ),
  customer: Schema.NullOr(Ref).pipe(
    Schema.annotateKey({ description: "Customer linked to the record." }),
  ),
  totalPriceSet: moneyBag.pipe(
    Schema.annotateKey({ description: "Total in shop and presentment currencies." }),
  ),
  lineItemsQuantity: Schema.Int.pipe(
    Schema.annotateKey({ description: "Number of units in the checkout." }),
  ),
  discountCodes: Schema.Array(Schema.String).pipe(
    Schema.annotateKey({ description: "Discount codes applied to the checkout." }),
  ),
});

export const AbandonedCheckoutsSchema = AbandonedCheckoutsNode.mapFields((fields) => ({
  ...fields,
  version: readVersion,
}))
  .annotate({ description: "Abandoned checkouts available to the shop." })
  .pipe(Iceberg.identifier("id"));

export const CollectionsNode = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Shopify record ID." })),
  title: Schema.String.pipe(Schema.annotateKey({ description: "Display title in Shopify." })),
  handle: Schema.String.pipe(Schema.annotateKey({ description: "Collection URL handle." })),
  description: Schema.String.pipe(Schema.annotateKey({ description: "Collection description." })),
  sortOrder: Schema.String.pipe(
    Schema.annotateKey({ description: "Default product order in the collection." }),
  ),
  createdAt: Schema.DateFromString.pipe(
    Schema.annotateKey({ description: "Time Shopify created the record." }),
  ),
  updatedAt: Schema.DateFromString.pipe(
    Schema.annotateKey({ description: "Time Shopify last changed the record." }),
  ),
});

export const CollectionsSchema = CollectionsNode.mapFields((fields) => ({
  ...fields,
  version: readVersion,
}))
  .annotate({ description: "Product collections in the shop." })
  .pipe(Iceberg.identifier("id"));

export const DraftOrdersNode = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Shopify record ID." })),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Display name in Shopify." })),
  status: Schema.String.pipe(Schema.annotateKey({ description: "Current status in Shopify." })),
  createdAt: Schema.DateFromString.pipe(
    Schema.annotateKey({ description: "Time Shopify created the record." }),
  ),
  updatedAt: Schema.DateFromString.pipe(
    Schema.annotateKey({ description: "Time Shopify last changed the record." }),
  ),
  completedAt: Schema.NullOr(Schema.DateFromString).pipe(
    Schema.annotateKey({ description: "Time the record was completed." }),
  ),
  invoiceSentAt: Schema.NullOr(Schema.DateFromString).pipe(
    Schema.annotateKey({ description: "Time the draft order invoice was sent." }),
  ),
  customer: Schema.NullOr(Ref).pipe(
    Schema.annotateKey({ description: "Customer linked to the record." }),
  ),
  order: Schema.NullOr(Ref).pipe(
    Schema.annotateKey({ description: "Order linked to the record." }),
  ),
  totalPriceSet: moneyBag.pipe(
    Schema.annotateKey({ description: "Total in shop and presentment currencies." }),
  ),
  totalQuantityOfLineItems: Schema.Int.pipe(
    Schema.annotateKey({ description: "Number of units on the draft order." }),
  ),
});

export const DraftOrdersSchema = DraftOrdersNode.mapFields((fields) => ({
  ...fields,
  version: readVersion,
}))
  .annotate({ description: "Draft orders and their resulting orders." })
  .pipe(Iceberg.identifier("id"));

export const PaymentsBalanceTransactionsNode = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Shopify record ID." })),
  type: Schema.String.pipe(Schema.annotateKey({ description: "Type of payment record." })),
  transactionDate: Schema.DateFromString.pipe(
    Schema.annotateKey({ description: "Time Shopify recorded the balance transaction." }),
  ),
  sourceType: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Type of object that caused the transaction." }),
  ),
  sourceId: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "ID of the source object." }),
  ),
  sourceOrderTransactionId: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Order transaction that caused the balance movement." }),
  ),
  associatedOrder: Schema.NullOr(Ref).pipe(
    Schema.annotateKey({ description: "Order associated with the balance transaction." }),
  ),
  // The payout ID is null until the transaction is paid out.
  associatedPayout: Schema.Struct({
    id: Schema.NullOr(Schema.String).pipe(Schema.annotateKey({ description: "Payout ID." })),
  }).pipe(Schema.annotateKey({ description: "Payout associated with the balance transaction." })),
  amount: Money.pipe(Schema.annotateKey({ description: "Money amount." })),
  fee: Money.pipe(Schema.annotateKey({ description: "Processing fee." })),
  net: Money.pipe(Schema.annotateKey({ description: "Amount after fees." })),
  test: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether this is a test transaction." }),
  ),
  adjustmentReason: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Reason for the balance adjustment." }),
  ),
});

export const PaymentsBalanceTransactionsSchema = PaymentsBalanceTransactionsNode.mapFields(
  (fields) => ({ ...fields, version: readVersion }),
)
  .annotate({ description: "Balance movements processed by Shopify Payments." })
  .pipe(Iceberg.identifier("id"));

export const PaymentsPayoutsNode = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Shopify record ID." })),
  status: Schema.String.pipe(Schema.annotateKey({ description: "Current status in Shopify." })),
  issuedAt: Schema.DateFromString.pipe(
    Schema.annotateKey({ description: "Time the payout was issued." }),
  ),
  net: Money.pipe(Schema.annotateKey({ description: "Amount after fees." })),
  transactionType: Schema.String.pipe(
    Schema.annotateKey({ description: "Kind of payout, such as a deposit." }),
  ),
});

export const PaymentsPayoutsSchema = PaymentsPayoutsNode.mapFields((fields) => ({
  ...fields,
  version: readVersion,
}))
  .annotate({ description: "Shopify Payments payouts." })
  .pipe(Iceberg.identifier("id"));

export const PaymentsDisputesNode = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Shopify record ID." })),
  status: Schema.String.pipe(Schema.annotateKey({ description: "Current status in Shopify." })),
  type: Schema.String.pipe(Schema.annotateKey({ description: "Type of payment record." })),
  order: Schema.NullOr(Ref).pipe(
    Schema.annotateKey({ description: "Order linked to the record." }),
  ),
  amount: Money.pipe(Schema.annotateKey({ description: "Money amount." })),
  initiatedAt: Schema.DateFromString.pipe(
    Schema.annotateKey({ description: "Time the dispute started." }),
  ),
  evidenceDueBy: Schema.NullOr(Schema.DateFromString).pipe(
    Schema.annotateKey({ description: "Deadline to send evidence." }),
  ),
  finalizedOn: Schema.NullOr(Schema.DateFromString).pipe(
    Schema.annotateKey({ description: "Time Shopify finalized the dispute." }),
  ),
});

export const PaymentsDisputesSchema = PaymentsDisputesNode.mapFields((fields) => ({
  ...fields,
  version: readVersion,
}))
  .annotate({ description: "Disputes on Shopify Payments transactions." })
  .pipe(Iceberg.identifier("id"));

export const Discount = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Shopify record ID." })),
  discount: Schema.Struct({
    __typename: Schema.String.pipe(
      Schema.annotateKey({ description: "GraphQL type of the record." }),
    ),
    title: Schema.String.pipe(Schema.annotateKey({ description: "Display title in Shopify." })),
    status: Schema.String.pipe(Schema.annotateKey({ description: "Current status in Shopify." })),
    startsAt: Schema.DateFromString.pipe(
      Schema.annotateKey({ description: "Time the discount starts." }),
    ),
    endsAt: Schema.NullOr(Schema.DateFromString).pipe(
      Schema.annotateKey({ description: "Time the discount ends." }),
    ),
    createdAt: Schema.DateFromString.pipe(
      Schema.annotateKey({ description: "Time Shopify created the record." }),
    ),
    updatedAt: Schema.DateFromString.pipe(
      Schema.annotateKey({ description: "Time Shopify last changed the record." }),
    ),
    asyncUsageCount: Schema.Int.pipe(
      Schema.annotateKey({ description: "Approximate number of times the discount was used." }),
    ),
    summary: Schema.optional(Schema.String).pipe(
      Schema.annotateKey({ description: "Shopify summary of the discount." }),
    ),
    usageLimit: Schema.optional(Schema.NullOr(Schema.Int)).pipe(
      Schema.annotateKey({ description: "Maximum number of redemptions." }),
    ),
  }).pipe(Schema.annotateKey({ description: "Shopify discount details." })),
});

export const DiscountSchema = Discount.mapFields((fields) => ({ ...fields, version: readVersion }))
  .annotate({ description: "Automatic and code discounts configured in Shopify." })
  .pipe(Iceberg.identifier("id"));

import { Resource } from "@useairfoil/connector-kit";
import { DateTime, Duration, Effect, Schema } from "effect";

import type { ShopifyApiClientService } from "../api/client";

import {
  InventoryTransfersSchema,
  AbandonedCheckoutsSchema,
  CollectionsSchema,
  DraftOrdersSchema,
  PaymentsBalanceTransactionsSchema,
  PaymentsPayoutsSchema,
  PaymentsDisputesSchema,
  DiscountSchema,
  InventoryTransfersNode,
  AbandonedCheckoutsNode,
  CollectionsNode,
  DraftOrdersNode,
  PaymentsBalanceTransactionsNode,
  PaymentsPayoutsNode,
  PaymentsDisputesNode,
  Discount,
} from "./schemas/storefront-reads";
import { connection, nextCursor, pollPages } from "./shared";

export {
  InventoryTransfersSchema,
  AbandonedCheckoutsSchema,
  CollectionsSchema,
  DraftOrdersSchema,
  PaymentsBalanceTransactionsSchema,
  PaymentsPayoutsSchema,
  PaymentsDisputesSchema,
  DiscountSchema,
} from "./schemas/storefront-reads";

const listSources = <Item extends object>(
  api: Pick<ShopifyApiClientService, "fetchGraphQL">,
  operationName: string,
  name: string,
  fields: string,
  item: Schema.Decoder<Item>,
  options: { readonly underPayments?: boolean; readonly interval?: Duration.Duration } = {},
) => {
  const pageSchema = Schema.Struct({ items: connection(item) });
  const paymentsSchema = Schema.Struct({ account: Schema.NullOr(pageSchema) });
  const list = `items: ${name}(first: $first, after: $after) {
    nodes { ${fields} }
    pageInfo { hasNextPage endCursor }
  }`;
  const selection = options.underPayments ? `account: shopifyPaymentsAccount { ${list} }` : list;
  const query = `#graphql
query ${operationName}($first: Int!, $after: String) {
  ${selection}
}
`;
  return pollPages(
    50,
    (first, after) =>
      Effect.gen(function* () {
        const request = { operationName, query, variables: { first, after } };
        const page = options.underPayments
          ? (yield* api.fetchGraphQL({ ...request, schema: paymentsSchema })).account
          : yield* api.fetchGraphQL({ ...request, schema: pageSchema });
        if (page === null) return { rows: [], next: undefined };
        const { nodes, pageInfo } = page.items;
        const version = yield* DateTime.nowAsDate;
        return { rows: nodes.map((node) => ({ ...node, version })), next: nextCursor(pageInfo) };
      }),
    options.interval,
  );
};

const InventoryTransfersFields =
  "id name status dateCreated referenceName totalQuantity receivedQuantity";

const AbandonedCheckoutsFields =
  "id name createdAt updatedAt completedAt customer { id } totalPriceSet { shopMoney { amount currencyCode } presentmentMoney { amount currencyCode } } lineItemsQuantity discountCodes";

const CollectionsFields = "id title handle description sortOrder createdAt updatedAt";

const DraftOrdersFields =
  "id name status createdAt updatedAt completedAt invoiceSentAt customer { id } order { id } totalPriceSet { shopMoney { amount currencyCode } presentmentMoney { amount currencyCode } } totalQuantityOfLineItems";

const PaymentsBalanceTransactionsFields =
  "id type transactionDate sourceType sourceId sourceOrderTransactionId associatedOrder { id } associatedPayout { id } amount { amount currencyCode } fee { amount currencyCode } net { amount currencyCode } test adjustmentReason";

const PaymentsPayoutsFields = "id status issuedAt net { amount currencyCode } transactionType";

const PaymentsDisputesFields =
  "id status type order { id } amount { amount currencyCode } initiatedAt evidenceDueBy finalizedOn";

const discountFields = [
  "AutomaticApp",
  "AutomaticBasic",
  "AutomaticBxgy",
  "AutomaticFreeShipping",
  "CodeApp",
  "CodeBasic",
  "CodeBxgy",
  "CodeFreeShipping",
].map(
  (kind) =>
    `... on Discount${kind} {
    title status startsAt endsAt createdAt updatedAt asyncUsageCount
    ${kind.endsWith("App") ? "" : "summary"}
    ${kind.startsWith("Code") ? "usageLimit" : ""}
  }`,
);
const DiscountFields = `id discount { __typename ${discountFields.join("\n")} }`;

export const storefrontReads = (api: Pick<ShopifyApiClientService, "fetchGraphQL">) => [
  Resource.entity({
    name: "discounts",
    version: "version",
    rowSchema: DiscountSchema,
    ...listSources(api, "AirfoilDiscounts", "discountNodes", DiscountFields, Discount),
  }),
  Resource.entity({
    name: "inventory_transfers",
    version: "version",
    rowSchema: InventoryTransfersSchema,
    ...listSources(
      api,
      "AirfoilInventoryTransfers",
      "inventoryTransfers",
      InventoryTransfersFields,
      InventoryTransfersNode,
    ),
  }),
  Resource.entity({
    name: "abandoned_checkouts",
    version: "version",
    rowSchema: AbandonedCheckoutsSchema,
    ...listSources(
      api,
      "AirfoilAbandonedCheckouts",
      "abandonedCheckouts",
      AbandonedCheckoutsFields,
      AbandonedCheckoutsNode,
      { interval: Duration.days(1) },
    ),
  }),
  Resource.entity({
    name: "collections",
    version: "version",
    rowSchema: CollectionsSchema,
    ...listSources(api, "AirfoilCollections", "collections", CollectionsFields, CollectionsNode),
  }),
  Resource.entity({
    name: "draft_orders",
    version: "version",
    rowSchema: DraftOrdersSchema,
    ...listSources(api, "AirfoilDraftOrders", "draftOrders", DraftOrdersFields, DraftOrdersNode),
  }),
  Resource.entity({
    name: "shopify_payments_balance_transactions",
    version: "version",
    rowSchema: PaymentsBalanceTransactionsSchema,
    ...listSources(
      api,
      "AirfoilPaymentsBalanceTransactions",
      "balanceTransactions",
      PaymentsBalanceTransactionsFields,
      PaymentsBalanceTransactionsNode,
      { underPayments: true, interval: Duration.days(1) },
    ),
  }),
  Resource.entity({
    name: "shopify_payments_payouts",
    version: "version",
    rowSchema: PaymentsPayoutsSchema,
    ...listSources(
      api,
      "AirfoilPaymentsPayouts",
      "payouts",
      PaymentsPayoutsFields,
      PaymentsPayoutsNode,
      { underPayments: true },
    ),
  }),
  Resource.entity({
    name: "shopify_payments_disputes",
    version: "version",
    rowSchema: PaymentsDisputesSchema,
    ...listSources(
      api,
      "AirfoilPaymentsDisputes",
      "disputes",
      PaymentsDisputesFields,
      PaymentsDisputesNode,
      { underPayments: true },
    ),
  }),
];

import { ConnectorApp, Demo, RuntimeConfig } from "@useairfoil/connector-kit";
import { Command } from "effect/cli";

import { CartSchema } from "../resources/carts/row";
import { CustomerSchema } from "../resources/customers/row";
import {
  InventoryItemSchema,
  InventoryLevelSchema,
  InventoryShipmentSchema,
  LocationSchema,
} from "../resources/inventory";
import {
  FulfillmentOrderSchema,
  FulfillmentSchema,
  OrderTransactionSchema,
} from "../resources/order-children";
import { OrderSchema } from "../resources/orders/row";
import { ProductSchema } from "../resources/products/row";
import { RefundSchema } from "../resources/refunds/row";
import { ReturnSchema, ReverseDeliverySchema } from "../resources/returns";
import {
  InventoryTransfersSchema,
  AbandonedCheckoutsSchema,
  CollectionsSchema,
  DiscountSchema,
  DraftOrdersSchema,
  PaymentsBalanceTransactionsSchema,
  PaymentsPayoutsSchema,
  PaymentsDisputesSchema,
} from "../resources/storefront-reads";
import { customerRows } from "./customers";
import { setupRows } from "./setup";

export const demo = Demo.define({
  name: "producer-shopify",
  setup: {
    tables: [
      Demo.table({
        name: "inventory_transfers",
        rowSchema: InventoryTransfersSchema,
        version: "version",
      }),
      Demo.table({ name: "collections", rowSchema: CollectionsSchema, version: "version" }),
      Demo.table({
        name: "inventory_shipments",
        rowSchema: InventoryShipmentSchema,
        version: "version",
      }),
      Demo.table({ name: "discounts", rowSchema: DiscountSchema, version: "version" }),
      Demo.table({ name: "products", rowSchema: ProductSchema, version: "updatedAt" }),
      Demo.table({ name: "locations", rowSchema: LocationSchema, version: "updatedAt" }),
      Demo.table({ name: "inventory_items", rowSchema: InventoryItemSchema, version: "updatedAt" }),
      Demo.table({
        name: "inventory_levels",
        rowSchema: InventoryLevelSchema,
        version: "updatedAt",
      }),
    ],
    rows: (context) => {
      const rows = setupRows(context);
      const version = context.now;
      return {
        ...rows,
        discounts: [
          {
            id: "gid://shopify/DiscountAutomaticNode/9001",
            discount: {
              __typename: "DiscountAutomaticBasic",
              title: "First order offer",
              status: "ACTIVE",
              startsAt: version,
              endsAt: null,
              createdAt: version,
              updatedAt: version,
              asyncUsageCount: 12,
              summary: "10% off when you spend $50",
            },
            version,
          },
        ],
        inventory_shipments: [
          {
            id: "gid://shopify/InventoryShipment/9001",
            transferId: "gid://shopify/InventoryTransfer/9001",
            name: "#SH9001",
            status: "RECEIVED",
            dateCreated: version,
            dateShipped: version,
            dateReceived: version,
            lineItemTotalQuantity: 12,
            totalReceivedQuantity: 12,
            totalAcceptedQuantity: 12,
            totalRejectedQuantity: 0,
            version,
          },
        ],
        inventory_transfers: [
          {
            id: "gid://shopify/InventoryTransfer/9001",
            name: "#TR9001",
            status: "TRANSFERRED",
            dateCreated: version,
            referenceName: "Warehouse stock",
            totalQuantity: 12,
            receivedQuantity: 12,
            version,
          },
        ],
        collections: [
          {
            id: "gid://shopify/Collection/9001",
            title: "Everyday essentials",
            handle: "everyday-essentials",
            description: "Shop essentials.",
            sortOrder: "BEST_SELLING",
            createdAt: version,
            updatedAt: version,
            version,
          },
        ],
      };
    },
  },
  group: {
    tables: [
      Demo.table({
        name: "abandoned_checkouts",
        rowSchema: AbandonedCheckoutsSchema,
        version: "version",
      }),
      Demo.table({ name: "draft_orders", rowSchema: DraftOrdersSchema, version: "version" }),
      Demo.table({
        name: "shopify_payments_balance_transactions",
        rowSchema: PaymentsBalanceTransactionsSchema,
        version: "version",
      }),
      Demo.table({
        name: "shopify_payments_payouts",
        rowSchema: PaymentsPayoutsSchema,
        version: "version",
      }),
      Demo.table({
        name: "shopify_payments_disputes",
        rowSchema: PaymentsDisputesSchema,
        version: "version",
      }),
      Demo.table({ name: "returns", rowSchema: ReturnSchema, version: "version" }),
      Demo.table({
        name: "reverse_deliveries",
        rowSchema: ReverseDeliverySchema,
        version: "version",
      }),
      Demo.table({ name: "customers", rowSchema: CustomerSchema, version: "updatedAt" }),
      Demo.table({ name: "orders", rowSchema: OrderSchema, version: "updatedAt" }),
      Demo.table({ name: "refunds", rowSchema: RefundSchema, version: "version" }),
      Demo.table({ name: "carts", rowSchema: CartSchema, version: "updatedAt" }),
      Demo.table({
        name: "order_transactions",
        rowSchema: OrderTransactionSchema,
        version: "version",
      }),
      Demo.table({ name: "fulfillments", rowSchema: FulfillmentSchema, version: "version" }),
      Demo.table({
        name: "fulfillment_orders",
        rowSchema: FulfillmentOrderSchema,
        version: "updatedAt",
      }),
    ],
    rows: (index, context) => {
      const rows = customerRows(index, context);
      const customer = rows.customers[0];
      const order = rows.orders[0];
      const version = context.now;
      const money = { amount: "42.00", currencyCode: "USD" };
      const totalPriceSet = { shopMoney: money, presentmentMoney: money };
      const returnId = `gid://shopify/Return/${index}`;
      const returned = index % 12 === 0;
      const payout = { id: `gid://shopify/ShopifyPaymentsPayout/${index}` };
      return {
        ...rows,
        returns:
          order && returned
            ? [
                {
                  id: returnId,
                  orderId: order.id,
                  name: `#R${index}`,
                  status: "OPEN",
                  createdAt: version,
                  closedAt: null,
                  requestApprovedAt: version,
                  totalQuantity: 1,
                  version,
                },
              ]
            : [],
        reverse_deliveries:
          order && returned
            ? [
                {
                  id: `gid://shopify/ReverseDelivery/${index}`,
                  orderId: order.id,
                  returnId,
                  reverseFulfillmentOrderId: `gid://shopify/ReverseFulfillmentOrder/${index}`,
                  deliverable: { __typename: "ReverseDeliveryShippingDeliverable" },
                  version,
                },
              ]
            : [],
        abandoned_checkouts: [
          {
            id: `gid://shopify/AbandonedCheckout/${index}`,
            name: `#AC${index}`,
            createdAt: version,
            updatedAt: version,
            completedAt: null,
            customer: customer ? { id: customer.id } : null,
            totalPriceSet,
            lineItemsQuantity: 1,
            discountCodes: [],
            version,
          },
        ],
        draft_orders: [
          {
            id: `gid://shopify/DraftOrder/${index}`,
            name: `#D${index}`,
            status: order ? "COMPLETED" : "OPEN",
            createdAt: version,
            updatedAt: version,
            completedAt: order ? version : null,
            invoiceSentAt: null,
            customer: customer ? { id: customer.id } : null,
            order: order ? { id: order.id } : null,
            totalPriceSet,
            totalQuantityOfLineItems: 1,
            version,
          },
        ],
        shopify_payments_balance_transactions: order
          ? [
              {
                id: `gid://shopify/ShopifyPaymentsBalanceTransaction/${index}`,
                type: "CHARGE",
                transactionDate: version,
                sourceType: "CHARGE",
                sourceId: null,
                sourceOrderTransactionId: null,
                associatedOrder: { id: order.id },
                associatedPayout: payout,
                amount: money,
                fee: { ...money, amount: "1.25" },
                net: { ...money, amount: "40.75" },
                test: false,
                adjustmentReason: null,
                version,
              },
            ]
          : [],
        shopify_payments_payouts: order
          ? [
              {
                ...payout,
                status: "PAID",
                issuedAt: version,
                net: { ...money, amount: "40.75" },
                transactionType: "DEPOSIT",
                version,
              },
            ]
          : [],
        shopify_payments_disputes:
          order && index % 20 === 0
            ? [
                {
                  id: `gid://shopify/ShopifyPaymentsDispute/${index}`,
                  status: "NEEDS_RESPONSE",
                  type: "CHARGEBACK",
                  order: { id: order.id },
                  amount: money,
                  initiatedAt: version,
                  evidenceDueBy: null,
                  finalizedOn: null,
                  version,
                },
              ]
            : [],
      };
    },
  },
});

export const demoCommand = ConnectorApp.makeDemoCommand(demo).pipe(
  Command.provide(RuntimeConfig.layerHosted()),
);

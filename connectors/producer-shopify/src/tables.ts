import * as Schema from "effect/Schema";

import { CartSchema } from "./resources/carts/row";
import { CustomerSchema } from "./resources/customers/row";
import { OrderSchema } from "./resources/orders/row";
import { ProductSchema } from "./resources/products/row";
import { RefundSchema } from "./resources/refunds/row";
import {
  InventoryItemSchema,
  InventoryLevelSchema,
  InventoryShipmentSchema,
  LocationSchema,
} from "./resources/schemas/inventory";
import {
  FulfillmentOrderSchema,
  FulfillmentSchema,
  OrderTransactionSchema,
} from "./resources/schemas/order-children";
import { ReturnSchema, ReverseDeliverySchema } from "./resources/schemas/returns";
import {
  InventoryTransfersSchema,
  AbandonedCheckoutsSchema,
  CollectionsSchema,
  DiscountSchema,
  DraftOrdersSchema,
  PaymentsBalanceTransactionsSchema,
  PaymentsPayoutsSchema,
  PaymentsDisputesSchema,
} from "./resources/schemas/storefront-reads";

export const tableSchemas: Readonly<Record<string, Schema.Top>> = {
  products: ProductSchema,
  carts: CartSchema,
  customers: CustomerSchema,
  orders: OrderSchema,
  refunds: RefundSchema,
  locations: LocationSchema,
  inventory_items: InventoryItemSchema,
  inventory_levels: InventoryLevelSchema,
  order_transactions: OrderTransactionSchema,
  fulfillments: FulfillmentSchema,
  fulfillment_orders: FulfillmentOrderSchema,
  discounts: DiscountSchema,
  inventory_transfers: InventoryTransfersSchema,
  abandoned_checkouts: AbandonedCheckoutsSchema,
  collections: CollectionsSchema,
  draft_orders: DraftOrdersSchema,
  shopify_payments_balance_transactions: PaymentsBalanceTransactionsSchema,
  shopify_payments_payouts: PaymentsPayoutsSchema,
  shopify_payments_disputes: PaymentsDisputesSchema,
  inventory_shipments: InventoryShipmentSchema,
  returns: ReturnSchema,
  reverse_deliveries: ReverseDeliverySchema,
};

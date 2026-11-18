import * as Iceberg from "@useairfoil/connector-kit/iceberg";
import { Schema } from "effect";

import { moneyBag, readVersion } from "./shared";

export const text = (description: string) =>
  Schema.String.pipe(Schema.annotateKey({ description }));

export const time = (description: string) =>
  Schema.DateFromString.pipe(Schema.annotateKey({ description }));

export const id = text("Shopify record ID.");

export const orderId = text("Order this record belongs to.");

export const Transaction = Schema.Struct({
  id,
  kind: text("Kind of transaction, such as a sale or refund."),
  status: text("Transaction status."),
  createdAt: time("Time Shopify created the transaction."),
  gateway: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Payment gateway." }),
  ),
  amountSet: moneyBag.pipe(
    Schema.annotateKey({ description: "Transaction amount in both currencies." }),
  ),
  parentTransaction: Schema.NullOr(Schema.Struct({ id })).pipe(
    Schema.annotateKey({ description: "Transaction this capture, void, or refund refers to." }),
  ),
});

export const Fulfillment = Schema.Struct({
  id,
  status: text("Fulfillment status."),
  createdAt: time("Time Shopify created the fulfillment."),
  updatedAt: time("Time Shopify updated the fulfillment."),
  trackingInfo: Schema.Array(
    Schema.Struct({
      company: Schema.NullOr(Schema.String).pipe(
        Schema.annotateKey({ description: "Shipping carrier." }),
      ),
      number: Schema.NullOr(Schema.String).pipe(
        Schema.annotateKey({ description: "Tracking number." }),
      ),
      url: Schema.NullOr(Schema.String).pipe(Schema.annotateKey({ description: "Tracking URL." })),
    }),
  ).pipe(Schema.annotateKey({ description: "Shipment tracking details." })),
});

export const OrderTransactionSchema = Transaction.mapFields((fields) => ({
  ...fields,
  orderId,
  version: readVersion,
}))
  .annotate({ description: "Payment transactions for Shopify orders." })
  .pipe(Iceberg.identifier("id"));

export const FulfillmentSchema = Fulfillment.mapFields((fields) => ({
  ...fields,
  orderId,
  version: readVersion,
}))
  .annotate({ description: "Shopify order shipments and fulfillment status." })
  .pipe(Iceberg.identifier("id"));

export const FulfillmentOrder = Schema.Struct({
  id,
  orderId,
  status: text("Fulfillment order status."),
  requestStatus: text("Status of the fulfillment request."),
  createdAt: time("Time Shopify created the fulfillment order."),
  updatedAt: time("Time Shopify updated the fulfillment order."),
});

export const FulfillmentOrderSchema = FulfillmentOrder.annotate({
  description: "Shopify orders assigned for fulfillment.",
}).pipe(Iceberg.identifier("id"));

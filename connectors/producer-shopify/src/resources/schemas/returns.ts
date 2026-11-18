import * as Iceberg from "@useairfoil/connector-kit/iceberg";
import { Schema } from "effect";

import { readVersion } from "./shared";

export const Id = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Shopify record ID." })),
});

export const DateOrNull = Schema.NullOr(Schema.DateFromString);

export const Return = Schema.Struct({
  ...Id.fields,
  name: Schema.String.pipe(Schema.annotateKey({ description: "Display name in Shopify." })),
  status: Schema.String.pipe(Schema.annotateKey({ description: "Current status in Shopify." })),
  createdAt: Schema.DateFromString.pipe(
    Schema.annotateKey({ description: "Time Shopify created the record." }),
  ),
  closedAt: DateOrNull.pipe(Schema.annotateKey({ description: "Time the return was closed." })),
  requestApprovedAt: DateOrNull.pipe(
    Schema.annotateKey({ description: "Time the return request was approved." }),
  ),
  totalQuantity: Schema.Int.pipe(Schema.annotateKey({ description: "Total number of units." })),
});

export const ReverseDelivery = Schema.Struct({
  ...Id.fields,
  deliverable: Schema.NullOr(
    Schema.Struct({
      __typename: Schema.String.pipe(
        Schema.annotateKey({ description: "GraphQL type of the delivery method." }),
      ),
    }),
  ).pipe(Schema.annotateKey({ description: "Delivery method for the returned goods." })),
});

export const ReturnSchema = Return.mapFields((fields) => ({
  ...fields,
  orderId: Schema.String.pipe(
    Schema.annotateKey({ description: "Order that contains the return." }),
  ),
  version: readVersion,
}))
  .annotate({ description: "Returns requested for Shopify orders." })
  .pipe(Iceberg.identifier("id"));

export const ReverseDeliverySchema = ReverseDelivery.mapFields((fields) => ({
  ...fields,
  orderId: Schema.String.pipe(
    Schema.annotateKey({ description: "Order that contains the return." }),
  ),
  returnId: Schema.String.pipe(
    Schema.annotateKey({ description: "Return this delivery belongs to." }),
  ),
  reverseFulfillmentOrderId: Schema.String.pipe(
    Schema.annotateKey({ description: "Reverse fulfillment order that groups these items." }),
  ),
  version: readVersion,
}))
  .annotate({ description: "Return shipments and how they are delivered." })
  .pipe(Iceberg.identifier("id"));

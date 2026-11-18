import * as Iceberg from "@useairfoil/connector-kit/iceberg";
import { Schema } from "effect";

import { readVersion } from "./shared";

export const id = Schema.String.pipe(Schema.annotateKey({ description: "Shopify record ID." }));

export const LocationSchema = Schema.Struct({
  id,
  name: Schema.String.pipe(Schema.annotateKey({ description: "Location name." })),
  isActive: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the location is active." }),
  ),
  fulfillsOnlineOrders: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the location fulfills online orders." }),
  ),
  createdAt: Schema.DateFromString.pipe(
    Schema.annotateKey({ description: "Time Shopify created the location." }),
  ),
  updatedAt: Schema.DateFromString.pipe(
    Schema.annotateKey({ description: "Time Shopify last updated the location." }),
  ),
})
  .annotate({ description: "Shop locations that hold or fulfill inventory." })
  .pipe(Iceberg.identifier("id"));

export const InventoryItemSchema = Schema.Struct({
  id,
  sku: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Stock keeping unit." }),
  ),
  tracked: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether Shopify tracks stock." }),
  ),
  requiresShipping: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the item requires shipping." }),
  ),
  updatedAt: Schema.DateFromString.pipe(
    Schema.annotateKey({ description: "Time Shopify last updated the item." }),
  ),
})
  .annotate({ description: "Inventory items tracked by the shop." })
  .pipe(Iceberg.identifier("id"));

export const InventoryLevelNode = Schema.Struct({
  id,
  isActive: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the stock level is active." }),
  ),
  location: Schema.Struct({ id }).pipe(
    Schema.annotateKey({ description: "Location where stock is held." }),
  ),
  quantities: Schema.Array(
    Schema.Struct({
      name: Schema.String.pipe(Schema.annotateKey({ description: "Inventory state." })),
      quantity: Schema.Int.pipe(Schema.annotateKey({ description: "Units in this state." })),
    }),
  ).pipe(Schema.annotateKey({ description: "Stock quantities by inventory state." })),
  updatedAt: Schema.DateFromString.pipe(
    Schema.annotateKey({ description: "Time Shopify last updated the stock level." }),
  ),
});

export const InventoryLevelSchema = InventoryLevelNode.mapFields((fields) => ({
  ...fields,
  inventoryItemId: Schema.String.pipe(Schema.annotateKey({ description: "Inventory item ID." })),
}))
  .annotate({ description: "Inventory units by item and location." })
  .pipe(Iceberg.identifier("id"));

export const InventoryShipmentNode = Schema.Struct({
  id,
  name: Schema.String.pipe(Schema.annotateKey({ description: "Display name in Shopify." })),
  status: Schema.String.pipe(Schema.annotateKey({ description: "Current status in Shopify." })),
  dateCreated: Schema.NullOr(Schema.DateFromString).pipe(
    Schema.annotateKey({ description: "Time Shopify created the record." }),
  ),
  dateShipped: Schema.NullOr(Schema.DateFromString).pipe(
    Schema.annotateKey({ description: "Time the shipment was sent." }),
  ),
  dateReceived: Schema.NullOr(Schema.DateFromString).pipe(
    Schema.annotateKey({ description: "Time the shipment arrived." }),
  ),
  lineItemTotalQuantity: Schema.Int.pipe(
    Schema.annotateKey({ description: "Total number of units in the shipment." }),
  ),
  totalReceivedQuantity: Schema.Int.pipe(
    Schema.annotateKey({ description: "Number of units received." }),
  ),
  totalAcceptedQuantity: Schema.Int.pipe(
    Schema.annotateKey({ description: "Number of units accepted." }),
  ),
  totalRejectedQuantity: Schema.Int.pipe(
    Schema.annotateKey({ description: "Number of units rejected." }),
  ),
});

export const InventoryShipmentSchema = InventoryShipmentNode.mapFields((fields) => ({
  ...fields,
  transferId: Schema.String.pipe(
    Schema.annotateKey({ description: "Inventory transfer that contains this shipment." }),
  ),
  version: readVersion,
}))
  .annotate({ description: "Shipments attached to inventory transfers." })
  .pipe(Iceberg.identifier("id"));

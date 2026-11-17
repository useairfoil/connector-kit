import { Iceberg, Resource } from "@useairfoil/connector-kit";
import { Duration, Effect, Schema } from "effect";

import type { ShopifyApiClientService } from "../api/client";

import { nestedPageSchema } from "../api/client";
import {
  connection,
  followQuery,
  nextCursor,
  PageInfoFields,
  pageQuery,
  pollPages,
  readItems,
  readVersion,
  withReadVersion,
} from "./shared";

type Api = Pick<ShopifyApiClientService, "fetchGraphQL" | "followConnection">;

const id = Schema.String.pipe(Schema.annotateKey({ description: "Shopify record ID." }));

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

const InventoryLevelNode = Schema.Struct({
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

const InventoryShipmentNode = Schema.Struct({
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

const LocationsQuery = `#graphql
query AirfoilLocations($first: Int!, $after: String) {
  items: locations(first: $first, after: $after, includeInactive: true, includeLegacy: true) {
    nodes { id name isActive fulfillsOnlineOrders createdAt updatedAt }
    ${PageInfoFields}
  }
}
`;

const InventoryItemsQuery = pageQuery(
  "AirfoilInventoryItems",
  "items: inventoryItems",
  "id sku tracked requiresShipping updatedAt",
);

const InventoryLevelFields = `id updatedAt isActive location { id }
  quantities(names: ["available", "on_hand", "committed", "incoming", "reserved", "damaged", "safety_stock", "quality_control"]) {
    name quantity
  }`;

const InventoryLevelsQuery = pageQuery(
  "AirfoilInventoryLevels",
  "inventoryItems",
  // Inactive levels are hidden by default and would never update.
  `id inventoryLevels(first: 25, includeInactive: true) { nodes { ${InventoryLevelFields} } ${PageInfoFields} }`,
);

const InventoryLevelsData = Schema.Struct({
  inventoryItems: connection(
    Schema.Struct({ id: Schema.String, inventoryLevels: connection(InventoryLevelNode) }),
  ),
});

const InventoryShipmentFields =
  "id name status dateCreated dateShipped dateReceived lineItemTotalQuantity totalReceivedQuantity totalAcceptedQuantity totalRejectedQuantity";

const InventoryShipmentsQuery = pageQuery(
  "AirfoilInventoryShipments",
  "inventoryTransfers",
  `id shipments(first: 25) { nodes { ${InventoryShipmentFields} } ${PageInfoFields} }`,
);

const InventoryShipmentsData = Schema.Struct({
  inventoryTransfers: connection(
    Schema.Struct({ id: Schema.String, shipments: connection(InventoryShipmentNode) }),
  ),
});

export const makeLocations = (api: Api) =>
  Resource.entity({
    name: "locations",
    rowSchema: LocationSchema,
    version: "updatedAt",
    ...pollPages(50, readItems(api, "AirfoilLocations", LocationsQuery, LocationSchema)),
  });

export const makeInventoryItems = (api: Api) =>
  Resource.entity({
    name: "inventory_items",
    rowSchema: InventoryItemSchema,
    version: "updatedAt",
    ...pollPages(
      50,
      readItems(api, "AirfoilInventoryItems", InventoryItemsQuery, InventoryItemSchema),
    ),
  });

export const makeInventoryLevels = (api: Api) =>
  Resource.entity({
    name: "inventory_levels",
    rowSchema: InventoryLevelSchema,
    version: "updatedAt",
    ...pollPages(
      25,
      (first, after) =>
        Effect.gen(function* () {
          const { inventoryItems } = yield* api.fetchGraphQL({
            operationName: "AirfoilInventoryLevels",
            query: InventoryLevelsQuery,
            schema: InventoryLevelsData,
            variables: { first, after },
          });
          const rows = yield* Effect.forEach(inventoryItems.nodes, (item) =>
            api
              .followConnection(item.inventoryLevels, {
                id: item.id,
                operationName: "AirfoilInventoryItemLevels",
                query: followQuery(
                  "AirfoilInventoryItemLevels",
                  "inventoryItem",
                  "inventoryLevels",
                  InventoryLevelFields,
                  ", includeInactive: true",
                ),
                schema: nestedPageSchema(connection(InventoryLevelNode)),
              })
              .pipe(
                Effect.map((levels) =>
                  levels.map((level) => ({ ...level, inventoryItemId: item.id })),
                ),
              ),
          );
          return { rows: rows.flat(), next: nextCursor(inventoryItems.pageInfo) };
        }),
      Duration.days(1),
    ),
  });

export const makeInventoryShipments = (api: Api) =>
  Resource.entity({
    name: "inventory_shipments",
    rowSchema: InventoryShipmentSchema,
    version: "version",
    ...pollPages(25, (first, after) =>
      Effect.gen(function* () {
        const { inventoryTransfers } = yield* api.fetchGraphQL({
          operationName: "AirfoilInventoryShipments",
          query: InventoryShipmentsQuery,
          schema: InventoryShipmentsData,
          variables: { first, after },
        });
        const shipments = yield* Effect.forEach(inventoryTransfers.nodes, (transfer) =>
          api
            .followConnection(transfer.shipments, {
              id: transfer.id,
              operationName: "AirfoilInventoryTransferShipments",
              query: followQuery(
                "AirfoilInventoryTransferShipments",
                "inventoryTransfer",
                "shipments",
                InventoryShipmentFields,
              ),
              schema: nestedPageSchema(connection(InventoryShipmentNode)),
            })
            .pipe(
              Effect.map((items) => items.map((item) => ({ ...item, transferId: transfer.id }))),
            ),
        );
        return yield* withReadVersion({
          rows: shipments.flat(),
          next: nextCursor(inventoryTransfers.pageInfo),
        });
      }),
    ),
  });

import { describe, expect, it } from "@effect/vitest";
import { ConnectorApp, ConnectorError } from "@useairfoil/connector-kit";
import { ConfigProvider, Effect, Layer, Ref } from "effect";

import type { ShopifyApiClientService } from "../src/api/client";

import { demo } from "../src/demo";
import { ShopifyApiClient, ShopifyConnector } from "../src/index";
import { tableSchemas } from "../src/tables";

describe("producer-shopify configuration checks", () => {
  it.effect("uses the resource-specific read-only checks", () =>
    Effect.gen(function* () {
      const connectionRuns = yield* Ref.make(0);
      const productCheckRuns = yield* Ref.make(0);
      const orderCheckRuns = yield* Ref.make(0);
      const customerCheckRuns = yield* Ref.make(0);
      const api: ShopifyApiClientService = {
        checkConnection: Ref.update(connectionRuns, (runs) => runs + 1),
        checkProductsAccess: Ref.update(productCheckRuns, (runs) => runs + 1),
        checkOrdersAccess: Ref.update(orderCheckRuns, (runs) => runs + 1),
        checkCustomersAccess: Ref.update(customerCheckRuns, (runs) => runs + 1),
        followConnection: (first) => Effect.succeed(first.nodes),
        fetchGraphQL: () => Effect.fail(new ConnectorError({ message: "Unexpected fetchGraphQL" })),
        fetchProducts: () =>
          Effect.fail(new ConnectorError({ message: "Unexpected fetchProducts" })),
        fetchProductById: () =>
          Effect.fail(new ConnectorError({ message: "Unexpected fetchProductById" })),
        fetchOrders: () => Effect.fail(new ConnectorError({ message: "Unexpected fetchOrders" })),
        fetchRefundsForOrder: () => Effect.succeed([]),
        fetchRefunds: () => Effect.fail(new ConnectorError({ message: "Unexpected fetchRefunds" })),
        fetchCustomers: () =>
          Effect.fail(new ConnectorError({ message: "Unexpected fetchCustomers" })),
        fetchCustomerById: () =>
          Effect.fail(new ConnectorError({ message: "Unexpected fetchCustomerById" })),
      };
      const connectorLayer = Layer.effect(ShopifyConnector.ShopifyConnector)(
        ShopifyConnector.ShopifyConfigDef.config.pipe(
          Effect.flatMap(ShopifyConnector.make),
          Effect.provideService(ShopifyApiClient.ShopifyApiClient, api),
        ),
      );

      const result = yield* ConnectorApp.check(ShopifyConnector.ShopifyConnector, connectorLayer, {
        resources: ["products", "carts", "customers", "orders", "refunds"],
      });
      const connector = yield* ShopifyConnector.ShopifyConnector.pipe(
        Effect.provide(connectorLayer),
      );

      expect(Object.keys(tableSchemas)).toEqual(
        connector.resources.map((resource) => resource.name),
      );
      for (const resource of connector.resources) {
        expect(tableSchemas[resource.name]).toBe(resource.rowSchema);
      }
      const demoTables = [...demo.setup.tables, ...demo.group.tables];
      expect(demoTables.map((table) => table.name).toSorted()).toEqual(
        Object.keys(tableSchemas).toSorted(),
      );
      for (const table of demoTables) {
        const resource = connector.resources.find((item) => item.name === table.name);
        expect(table.rowSchema).toBe(resource?.rowSchema);
        expect(table.version).toBe(resource?.version);
      }
      expect(result).toEqual({
        products: { _tag: "ok" },
        carts: { _tag: "ok" },
        customers: { _tag: "ok" },
        orders: { _tag: "ok" },
        refunds: { _tag: "ok" },
      });
      expect(yield* Ref.get(productCheckRuns)).toBe(1);
      expect(yield* Ref.get(orderCheckRuns)).toBe(2);
      expect(yield* Ref.get(customerCheckRuns)).toBe(1);
      expect(yield* Ref.get(connectionRuns)).toBe(1);
    }).pipe(
      Effect.provide(
        ConfigProvider.layer(
          ConfigProvider.fromUnknown({
            SHOPIFY_SHOP_DOMAIN: "example.myshopify.com",
            SHOPIFY_CLIENT_ID: "test-client-id",
            SHOPIFY_CLIENT_SECRET: "test-client-secret",
            SHOPIFY_WEBHOOK_SECRET: "test-webhook-secret",
          }),
        ),
      ),
    ),
  );
});

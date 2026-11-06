import * as Manifest from "@useairfoil/connector-kit/manifest";

import { webhookSubscriptions } from "./webhook-events";

const connectionFields = {
  shopDomain: Manifest.string({
    runtimeKey: "SHOPIFY_SHOP_DOMAIN",
    description: "Shopify shop domain, for example example.myshopify.com.",
  }),
  clientId: Manifest.string({
    runtimeKey: "SHOPIFY_CLIENT_ID",
    description: "Client ID for the merchant-owned Shopify Dev Dashboard app.",
  }),
  clientSecret: Manifest.secret({
    runtimeKey: "SHOPIFY_CLIENT_SECRET",
    description: "Client secret for the merchant-owned Shopify Dev Dashboard app.",
  }),
};

const webhookFields = {
  webhookSecret: Manifest.secret({
    runtimeKey: "SHOPIFY_WEBHOOK_SECRET",
    description: "Shopify webhook HMAC secret.",
  }),
};

export const ShopifyConnectionConfigDef = Manifest.defineConfig(connectionFields);
export const ShopifyWebhookConfigDef = Manifest.defineConfig(webhookFields);
export const ShopifyConfigDef = Manifest.defineConfig({
  ...connectionFields,
  ...webhookFields,
});

export type ShopifyConnectionConfig = Manifest.ConfigValuesOf<typeof ShopifyConnectionConfigDef>;
export type ShopifyWebhookConfig = Manifest.ConfigValuesOf<typeof ShopifyWebhookConfigDef>;
export type ShopifyConfig = Manifest.ConfigValuesOf<typeof ShopifyConfigDef>;

export const manifest = Manifest.define({
  name: "producer-shopify",
  title: "Shopify",
  webhook: {
    path: "/webhooks/shopify",
    requirement: "required",
    events: webhookSubscriptions,
    configFields: ["webhookSecret"],
    documentationUrl: "https://shopify.dev/docs/apps/build/webhooks",
  },
  config: ShopifyConfigDef.spec,
  resources: [
    { name: "products", capabilities: ["backfill", "webhook"] },
    { name: "carts", capabilities: ["webhook"] },
    { name: "customers", capabilities: ["backfill", "webhook"] },
    { name: "orders", capabilities: ["backfill", "webhook"] },
    { name: "refunds", capabilities: ["backfill", "webhook"] },
  ],
});

import * as Manifest from "@useairfoil/connector-kit/manifest";

import {
  checkoutEventTypes,
  customerEventTypes,
  orderEventTypes,
  subscriptionEventTypes,
  refundEventTypes,
  productEventTypes,
  discountEventTypes,
} from "./webhook-events";

const connectionFields = {
  accessToken: Manifest.secret({
    runtimeKey: "POLAR_ACCESS_TOKEN",
    description: "Polar organization access token used for REST API requests.",
  }),
  apiBaseUrl: Manifest.string({
    runtimeKey: "POLAR_API_BASE_URL",
    description: "Polar API base URL, including the /v1 path.",
  }),
  organizationId: Manifest.optional(
    Manifest.string({
      runtimeKey: "POLAR_ORGANIZATION_ID",
      description: "Optional Polar organization ID filter for list endpoints.",
    }),
  ),
};

const webhookFields = {
  webhookSecret: Manifest.secret({
    runtimeKey: "POLAR_WEBHOOK_SECRET",
    description: "Polar webhook signing secret.",
  }),
};

export const PolarConnectionConfigDef = Manifest.defineConfig(connectionFields);
export const PolarWebhookConfigDef = Manifest.defineConfig(webhookFields);
export const PolarConfigDef = Manifest.defineConfig({
  ...connectionFields,
  ...webhookFields,
});

export type PolarConnectionConfig = Manifest.ConfigValuesOf<typeof PolarConnectionConfigDef>;
export type PolarWebhookConfig = Manifest.ConfigValuesOf<typeof PolarWebhookConfigDef>;
export type PolarConfig = Manifest.ConfigValuesOf<typeof PolarConfigDef>;

export const manifest = Manifest.define({
  name: "producer-polar",
  title: "Polar",
  webhook: {
    path: "/webhook",
    requirement: "required",
    events: [
      { resource: "checkouts", types: checkoutEventTypes },
      { resource: "customers", types: customerEventTypes },
      { resource: "orders", types: orderEventTypes },
      { resource: "subscriptions", types: subscriptionEventTypes },
      { resource: "refunds", types: refundEventTypes },
      { resource: "products", types: productEventTypes },
      { resource: "discounts", types: discountEventTypes },
    ],
    configFields: ["webhookSecret"],
    documentationUrl: "https://polar.sh/docs/integrate/webhooks/endpoints",
  },
  config: PolarConfigDef.spec,
  resources: [
    { name: "customers", capabilities: ["backfill", "webhook"] },
    { name: "checkouts", capabilities: ["backfill", "webhook"] },
    { name: "orders", capabilities: ["backfill", "webhook"] },
    { name: "subscriptions", capabilities: ["backfill", "webhook"] },
    { name: "refunds", capabilities: ["backfill", "webhook"] },
    { name: "products", capabilities: ["backfill", "webhook"] },
    { name: "discounts", capabilities: ["backfill", "webhook"] },
  ],
});

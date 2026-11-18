import * as Iceberg from "@useairfoil/connector-kit/iceberg";
import * as Manifest from "@useairfoil/connector-kit/manifest";

import { tableSchemas } from "./tables";
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
    {
      name: "customers",
      description: Iceberg.resolveDescription(tableSchemas.customers),
      capabilities: ["backfill", "webhook"],
    },
    {
      name: "checkouts",
      description: Iceberg.resolveDescription(tableSchemas.checkouts),
      capabilities: ["backfill", "webhook"],
    },
    {
      name: "orders",
      description: Iceberg.resolveDescription(tableSchemas.orders),
      capabilities: ["backfill", "webhook"],
    },
    {
      name: "subscriptions",
      description: Iceberg.resolveDescription(tableSchemas.subscriptions),
      capabilities: ["backfill", "webhook"],
    },
    {
      name: "refunds",
      description: Iceberg.resolveDescription(tableSchemas.refunds),
      capabilities: ["backfill", "webhook"],
    },
    {
      name: "products",
      description: Iceberg.resolveDescription(tableSchemas.products),
      capabilities: ["backfill", "webhook"],
    },
    {
      name: "discounts",
      description: Iceberg.resolveDescription(tableSchemas.discounts),
      capabilities: ["backfill", "webhook"],
    },
    {
      name: "payments",
      description: Iceberg.resolveDescription(tableSchemas.payments),
      capabilities: ["backfill", "changes"],
    },
    {
      name: "disputes",
      description: Iceberg.resolveDescription(tableSchemas.disputes),
      capabilities: ["backfill", "changes"],
    },
    {
      name: "usage_events",
      description: Iceberg.resolveDescription(tableSchemas.usage_events),
      capabilities: ["backfill", "changes"],
    },
    {
      name: "meters",
      description: Iceberg.resolveDescription(tableSchemas.meters),
      capabilities: ["backfill", "changes"],
    },
    {
      name: "customer_meters",
      description: Iceberg.resolveDescription(tableSchemas.customer_meters),
      capabilities: ["backfill", "changes"],
    },
    {
      name: "benefits",
      description: Iceberg.resolveDescription(tableSchemas.benefits),
      capabilities: ["backfill", "changes"],
    },
    {
      name: "checkout_links",
      description: Iceberg.resolveDescription(tableSchemas.checkout_links),
      capabilities: ["backfill", "changes"],
    },
    {
      name: "custom_fields",
      description: Iceberg.resolveDescription(tableSchemas.custom_fields),
      capabilities: ["backfill", "changes"],
    },
    {
      name: "license_keys",
      description: Iceberg.resolveDescription(tableSchemas.license_keys),
      capabilities: ["backfill", "changes"],
    },
    {
      name: "benefit_grants",
      description: Iceberg.resolveDescription(tableSchemas.benefit_grants),
      capabilities: ["backfill", "changes"],
    },
    {
      name: "customer_members",
      description: Iceberg.resolveDescription(tableSchemas.customer_members),
      capabilities: ["backfill", "changes"],
    },
    {
      name: "customer_seats",
      description: Iceberg.resolveDescription(tableSchemas.customer_seats),
      capabilities: ["backfill", "changes"],
    },
    {
      name: "license_activations",
      description: Iceberg.resolveDescription(tableSchemas.license_activations),
      capabilities: ["backfill", "changes"],
    },
  ],
});

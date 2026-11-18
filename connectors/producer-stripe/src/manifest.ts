import * as Iceberg from "@useairfoil/connector-kit/iceberg";
import * as Manifest from "@useairfoil/connector-kit/manifest";

import { tableSchemas } from "./tables";
import { webhookEvents } from "./webhook/events";

const connectionFields = {
  apiKey: Manifest.secret({
    runtimeKey: "STRIPE_API_KEY",
    description: "Stripe restricted API key with read access to the synced resources and events.",
  }),
  rateLimitPerSecond: Manifest.number({
    runtimeKey: "STRIPE_RATE_LIMIT_PER_SECOND",
    description: "Maximum Stripe API requests per second, shared by all resources.",
    default: 20,
    integer: true,
    minimum: 1,
  }),
};

const webhookFields = {
  webhookSecret: Manifest.secret({
    runtimeKey: "STRIPE_WEBHOOK_SECRET",
    description: "Signing secret of the Stripe webhook endpoint.",
  }),
};

export const StripeConnectionConfigDef = Manifest.defineConfig(connectionFields);
export const StripeWebhookConfigDef = Manifest.defineConfig(webhookFields);
export const StripeConfigDef = Manifest.defineConfig({
  ...connectionFields,
  ...webhookFields,
});

export type StripeConnectionConfig = Manifest.ConfigValuesOf<typeof StripeConnectionConfigDef>;
export type StripeWebhookConfig = Manifest.ConfigValuesOf<typeof StripeWebhookConfigDef>;
export type StripeConfig = Manifest.ConfigValuesOf<typeof StripeConfigDef>;

export const manifest = Manifest.define({
  name: "producer-stripe",
  title: "Stripe",
  webhook: {
    path: "/webhook",
    requirement: "required",
    events: Object.entries(webhookEvents).map(([resource, types]) => ({ resource, types })),
    configFields: ["webhookSecret"],
    documentationUrl: "https://docs.stripe.com/webhooks",
  },
  config: StripeConfigDef.spec,
  resources: [
    {
      name: "customers",
      description: Iceberg.resolveDescription(tableSchemas.customers),
      capabilities: ["backfill", "changes", "webhook"],
    },
    {
      name: "products",
      description: Iceberg.resolveDescription(tableSchemas.products),
      capabilities: ["backfill", "changes", "webhook"],
    },
    {
      name: "prices",
      description: Iceberg.resolveDescription(tableSchemas.prices),
      capabilities: ["backfill", "changes", "webhook"],
    },
    {
      name: "subscriptions",
      description: Iceberg.resolveDescription(tableSchemas.subscriptions),
      capabilities: ["backfill", "changes", "webhook"],
    },
    {
      name: "invoices",
      description: Iceberg.resolveDescription(tableSchemas.invoices),
      capabilities: ["backfill", "changes", "webhook"],
    },
    {
      name: "charges",
      description: Iceberg.resolveDescription(tableSchemas.charges),
      capabilities: ["backfill", "changes", "webhook"],
    },
    {
      name: "invoice_payments",
      description: Iceberg.resolveDescription(tableSchemas.invoice_payments),
      capabilities: ["backfill", "changes", "webhook"],
    },
    {
      name: "refunds",
      description: Iceberg.resolveDescription(tableSchemas.refunds),
      capabilities: ["backfill", "changes", "webhook"],
    },
    {
      name: "payment_intents",
      description: Iceberg.resolveDescription(tableSchemas.payment_intents),
      capabilities: ["backfill", "changes", "webhook"],
    },
    {
      name: "payouts",
      description: Iceberg.resolveDescription(tableSchemas.payouts),
      capabilities: ["backfill", "changes", "webhook"],
    },
    {
      name: "disputes",
      description: Iceberg.resolveDescription(tableSchemas.disputes),
      capabilities: ["backfill", "changes", "webhook"],
    },
    {
      name: "credit_notes",
      description: Iceberg.resolveDescription(tableSchemas.credit_notes),
      capabilities: ["backfill", "changes", "webhook"],
    },
    {
      name: "checkout_sessions",
      description: Iceberg.resolveDescription(tableSchemas.checkout_sessions),
      capabilities: ["backfill", "changes", "webhook"],
    },
    {
      name: "subscription_schedules",
      description: Iceberg.resolveDescription(tableSchemas.subscription_schedules),
      capabilities: ["backfill", "changes", "webhook"],
    },
    {
      name: "coupons",
      description: Iceberg.resolveDescription(tableSchemas.coupons),
      capabilities: ["backfill", "changes", "webhook"],
    },
    {
      name: "promotion_codes",
      description: Iceberg.resolveDescription(tableSchemas.promotion_codes),
      capabilities: ["backfill", "changes", "webhook"],
    },
    {
      name: "meter_summaries",
      description: Iceberg.resolveDescription(tableSchemas.meter_summaries),
      capabilities: ["backfill", "changes"],
    },
    {
      name: "billing_meters",
      description: Iceberg.resolveDescription(tableSchemas.billing_meters),
      capabilities: ["backfill", "changes", "webhook"],
    },
    {
      name: "balance_transactions",
      description: Iceberg.resolveDescription(tableSchemas.balance_transactions),
      capabilities: ["backfill", "changes"],
    },
  ],
});

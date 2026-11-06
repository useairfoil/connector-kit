import * as Manifest from "@useairfoil/connector-kit/manifest";

import { webhookEvents } from "./webhook/events";

const connectionFields = {
  accessToken: Manifest.secret({
    runtimeKey: "HUBSPOT_ACCESS_TOKEN",
    description: "HubSpot service key or static app token with read access to the synced objects.",
  }),
};

const webhookFields = {
  clientSecret: Manifest.optional(
    Manifest.secret({
      runtimeKey: "HUBSPOT_CLIENT_SECRET",
      description: "Client secret of the HubSpot app that sends webhooks. Turns on webhooks.",
    }),
  ),
};

export const HubSpotConnectionConfigDef = Manifest.defineConfig(connectionFields);
export const HubSpotWebhookConfigDef = Manifest.defineConfig(webhookFields);
export const HubSpotConfigDef = Manifest.defineConfig({
  ...connectionFields,
  ...webhookFields,
});

export type HubSpotConnectionConfig = Manifest.ConfigValuesOf<typeof HubSpotConnectionConfigDef>;
export type HubSpotWebhookConfig = Manifest.ConfigValuesOf<typeof HubSpotWebhookConfigDef>;
export type HubSpotConfig = Manifest.ConfigValuesOf<typeof HubSpotConfigDef>;

const crmCapabilities = ["backfill", "changes", "webhook"] as const;

const resources = [
  { name: "contacts", capabilities: crmCapabilities },
  { name: "companies", capabilities: crmCapabilities },
  { name: "deals", capabilities: crmCapabilities },
  { name: "tickets", capabilities: crmCapabilities },
  { name: "calls", capabilities: crmCapabilities },
  { name: "emails", capabilities: crmCapabilities },
  { name: "meetings", capabilities: crmCapabilities },
  { name: "notes", capabilities: crmCapabilities },
  { name: "tasks", capabilities: crmCapabilities },
  { name: "communications", capabilities: crmCapabilities },
  { name: "postal_mail", capabilities: crmCapabilities },
  { name: "feedback_submissions", capabilities: crmCapabilities },
  { name: "line_items", capabilities: crmCapabilities },
  { name: "products", capabilities: crmCapabilities },
  { name: "quotes", capabilities: crmCapabilities },
  { name: "leads", capabilities: crmCapabilities },
  { name: "invoices", capabilities: crmCapabilities },
  { name: "orders", capabilities: crmCapabilities },
  { name: "carts", capabilities: crmCapabilities },
  { name: "commerce_payments", capabilities: crmCapabilities },
  { name: "subscriptions", capabilities: crmCapabilities },
  { name: "discounts", capabilities: crmCapabilities },
  { name: "fees", capabilities: crmCapabilities },
  { name: "taxes", capabilities: crmCapabilities },
  { name: "goal_targets", capabilities: crmCapabilities },
  { name: "users", capabilities: crmCapabilities },
  { name: "deal_split", capabilities: ["backfill", "changes"] },
  { name: "custom_objects", capabilities: crmCapabilities },
  { name: "owners", capabilities: ["backfill", "changes"] },
  { name: "pipelines", capabilities: ["backfill", "changes"] },
  { name: "properties", capabilities: ["backfill", "changes"] },
  { name: "teams", capabilities: ["backfill", "changes"] },
  { name: "lists", capabilities: ["backfill", "changes"] },
] as const;

export const manifest = Manifest.define({
  name: "producer-hubspot",
  title: "HubSpot",
  webhook: {
    path: "/webhooks/hubspot",
    requirement: "optional",
    events: resources
      .filter((resource) => resource.capabilities.some((capability) => capability === "webhook"))
      .map((resource) => ({
        resource: resource.name,
        types: Object.values(webhookEvents).filter(
          (event) =>
            (resource.name === "contacts" || event !== webhookEvents.contact_privacyDeletion) &&
            (resource.name !== "custom_objects" ||
              event !== webhookEvents.object_associationChange),
        ),
      })),
    configFields: ["clientSecret"],
    documentationUrl: "https://developers.hubspot.com/docs/api/webhooks",
  },
  config: HubSpotConfigDef.spec,
  resources,
});

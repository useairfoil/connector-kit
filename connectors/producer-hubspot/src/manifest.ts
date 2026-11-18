import * as Iceberg from "@useairfoil/connector-kit/iceberg";
import * as Manifest from "@useairfoil/connector-kit/manifest";

import { tableSchemas } from "./tables";
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
  {
    name: "contacts",
    description: Iceberg.resolveDescription(tableSchemas.contacts),
    capabilities: crmCapabilities,
  },
  {
    name: "companies",
    description: Iceberg.resolveDescription(tableSchemas.companies),
    capabilities: crmCapabilities,
  },
  {
    name: "deals",
    description: Iceberg.resolveDescription(tableSchemas.deals),
    capabilities: crmCapabilities,
  },
  {
    name: "tickets",
    description: Iceberg.resolveDescription(tableSchemas.tickets),
    capabilities: crmCapabilities,
  },
  {
    name: "calls",
    description: Iceberg.resolveDescription(tableSchemas.calls),
    capabilities: crmCapabilities,
  },
  {
    name: "emails",
    description: Iceberg.resolveDescription(tableSchemas.emails),
    capabilities: crmCapabilities,
  },
  {
    name: "meetings",
    description: Iceberg.resolveDescription(tableSchemas.meetings),
    capabilities: crmCapabilities,
  },
  {
    name: "notes",
    description: Iceberg.resolveDescription(tableSchemas.notes),
    capabilities: crmCapabilities,
  },
  {
    name: "tasks",
    description: Iceberg.resolveDescription(tableSchemas.tasks),
    capabilities: crmCapabilities,
  },
  {
    name: "communications",
    description: Iceberg.resolveDescription(tableSchemas.communications),
    capabilities: crmCapabilities,
  },
  {
    name: "postal_mail",
    description: Iceberg.resolveDescription(tableSchemas.postal_mail),
    capabilities: crmCapabilities,
  },
  {
    name: "feedback_submissions",
    description: Iceberg.resolveDescription(tableSchemas.feedback_submissions),
    capabilities: crmCapabilities,
  },
  {
    name: "line_items",
    description: Iceberg.resolveDescription(tableSchemas.line_items),
    capabilities: crmCapabilities,
  },
  {
    name: "products",
    description: Iceberg.resolveDescription(tableSchemas.products),
    capabilities: crmCapabilities,
  },
  {
    name: "quotes",
    description: Iceberg.resolveDescription(tableSchemas.quotes),
    capabilities: crmCapabilities,
  },
  {
    name: "leads",
    description: Iceberg.resolveDescription(tableSchemas.leads),
    capabilities: crmCapabilities,
  },
  {
    name: "invoices",
    description: Iceberg.resolveDescription(tableSchemas.invoices),
    capabilities: crmCapabilities,
  },
  {
    name: "orders",
    description: Iceberg.resolveDescription(tableSchemas.orders),
    capabilities: crmCapabilities,
  },
  {
    name: "carts",
    description: Iceberg.resolveDescription(tableSchemas.carts),
    capabilities: crmCapabilities,
  },
  {
    name: "commerce_payments",
    description: Iceberg.resolveDescription(tableSchemas.commerce_payments),
    capabilities: crmCapabilities,
  },
  {
    name: "subscriptions",
    description: Iceberg.resolveDescription(tableSchemas.subscriptions),
    capabilities: crmCapabilities,
  },
  {
    name: "discounts",
    description: Iceberg.resolveDescription(tableSchemas.discounts),
    capabilities: crmCapabilities,
  },
  {
    name: "fees",
    description: Iceberg.resolveDescription(tableSchemas.fees),
    capabilities: crmCapabilities,
  },
  {
    name: "taxes",
    description: Iceberg.resolveDescription(tableSchemas.taxes),
    capabilities: crmCapabilities,
  },
  {
    name: "goal_targets",
    description: Iceberg.resolveDescription(tableSchemas.goal_targets),
    capabilities: crmCapabilities,
  },
  {
    name: "users",
    description: Iceberg.resolveDescription(tableSchemas.users),
    capabilities: crmCapabilities,
  },
  {
    name: "deal_split",
    description: Iceberg.resolveDescription(tableSchemas.deal_split),
    capabilities: ["backfill", "changes"],
  },
  {
    name: "custom_objects",
    description: Iceberg.resolveDescription(tableSchemas.custom_objects),
    capabilities: crmCapabilities,
  },
  {
    name: "owners",
    description: Iceberg.resolveDescription(tableSchemas.owners),
    capabilities: ["backfill", "changes"],
  },
  {
    name: "pipelines",
    description: Iceberg.resolveDescription(tableSchemas.pipelines),
    capabilities: ["backfill", "changes"],
  },
  {
    name: "properties",
    description: Iceberg.resolveDescription(tableSchemas.properties),
    capabilities: ["backfill", "changes"],
  },
  {
    name: "teams",
    description: Iceberg.resolveDescription(tableSchemas.teams),
    capabilities: ["backfill", "changes"],
  },
  {
    name: "lists",
    description: Iceberg.resolveDescription(tableSchemas.lists),
    capabilities: ["backfill", "changes"],
  },
  {
    name: "projects",
    description: Iceberg.resolveDescription(tableSchemas.projects),
    capabilities: ["backfill", "changes"],
  },
  {
    name: "appointments",
    description: Iceberg.resolveDescription(tableSchemas.appointments),
    capabilities: ["backfill", "changes"],
  },
  {
    name: "courses",
    description: Iceberg.resolveDescription(tableSchemas.courses),
    capabilities: ["backfill", "changes"],
  },
  {
    name: "listings",
    description: Iceberg.resolveDescription(tableSchemas.listings),
    capabilities: ["backfill", "changes"],
  },
  {
    name: "services",
    description: Iceberg.resolveDescription(tableSchemas.services),
    capabilities: ["backfill", "changes"],
  },
  {
    name: "commerce_links",
    description: Iceberg.resolveDescription(tableSchemas.commerce_links),
    capabilities: ["backfill", "changes"],
  },
  {
    name: "peer_links",
    description: Iceberg.resolveDescription(tableSchemas.peer_links),
    capabilities: ["backfill", "changes"],
  },
  {
    name: "segment_memberships",
    description: Iceberg.resolveDescription(tableSchemas.segment_memberships),
    capabilities: ["backfill", "changes"],
  },
  {
    name: "marketing_events",
    description: Iceberg.resolveDescription(tableSchemas.marketing_events),
    capabilities: ["backfill", "changes"],
  },
  {
    name: "marketing_event_participation",
    description: Iceberg.resolveDescription(tableSchemas.marketing_event_participation),
    capabilities: ["backfill", "changes"],
  },
  {
    name: "deal_property_history",
    description: Iceberg.resolveDescription(tableSchemas.deal_property_history),
    capabilities: ["backfill", "changes"],
  },
] as const;

export const manifest = Manifest.define({
  name: "producer-hubspot",
  title: "HubSpot",
  webhook: {
    path: "/webhook",
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

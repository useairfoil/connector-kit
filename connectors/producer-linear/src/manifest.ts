import * as Iceberg from "@useairfoil/connector-kit/iceberg";
import * as Manifest from "@useairfoil/connector-kit/manifest";

import { tableSchemas } from "./tables";
import { webhookSubscriptions } from "./webhook/events";

const connectionFields = {
  apiKey: Manifest.secret({
    runtimeKey: "LINEAR_API_KEY",
    description: "Linear personal API key with Read permission.",
    placeholder: "lin_api_...",
  }),
};

const webhookFields = {
  webhookSecret: Manifest.secret({
    runtimeKey: "LINEAR_WEBHOOK_SECRET",
    description: "Signing secret of the Linear webhook.",
  }),
};

export const LinearConnectionConfigDef = Manifest.defineConfig(connectionFields);
export const LinearWebhookConfigDef = Manifest.defineConfig(webhookFields);
export const LinearConfigDef = Manifest.defineConfig({
  ...connectionFields,
  ...webhookFields,
});

export type LinearConnectionConfig = Manifest.ConfigValuesOf<typeof LinearConnectionConfigDef>;
export type LinearWebhookConfig = Manifest.ConfigValuesOf<typeof LinearWebhookConfigDef>;
export type LinearConfig = Manifest.ConfigValuesOf<typeof LinearConfigDef>;

const capabilities = ["backfill", "changes"] as const;
const withWebhook = ["backfill", "changes", "webhook"] as const;

export const manifest = Manifest.define({
  name: "producer-linear",
  title: "Linear",
  webhook: {
    path: "/webhook",
    requirement: "required",
    events: webhookSubscriptions,
    configFields: ["webhookSecret"],
    documentationUrl: "https://linear.app/developers/webhooks",
  },
  config: LinearConfigDef.spec,
  resources: [
    {
      name: "issues",
      description: Iceberg.resolveDescription(tableSchemas.issues),
      capabilities: withWebhook,
    },
    {
      name: "issue_history",
      description: Iceberg.resolveDescription(tableSchemas.issue_history),
      capabilities: withWebhook,
    },
    {
      name: "comments",
      description: Iceberg.resolveDescription(tableSchemas.comments),
      capabilities: withWebhook,
    },
    {
      name: "issue_relations",
      description: Iceberg.resolveDescription(tableSchemas.issue_relations),
      capabilities,
    },
    {
      name: "attachments",
      description: Iceberg.resolveDescription(tableSchemas.attachments),
      capabilities: withWebhook,
    },
    {
      name: "issue_labels",
      description: Iceberg.resolveDescription(tableSchemas.issue_labels),
      capabilities: withWebhook,
    },
    {
      name: "workflow_states",
      description: Iceberg.resolveDescription(tableSchemas.workflow_states),
      capabilities,
    },
    {
      name: "teams",
      description: Iceberg.resolveDescription(tableSchemas.teams),
      capabilities,
    },
    {
      name: "team_memberships",
      description: Iceberg.resolveDescription(tableSchemas.team_memberships),
      capabilities,
    },
    {
      name: "users",
      description: Iceberg.resolveDescription(tableSchemas.users),
      capabilities: withWebhook,
    },
    {
      name: "external_users",
      description: Iceberg.resolveDescription(tableSchemas.external_users),
      capabilities,
    },
    {
      name: "cycles",
      description: Iceberg.resolveDescription(tableSchemas.cycles),
      capabilities: withWebhook,
    },
    {
      name: "projects",
      description: Iceberg.resolveDescription(tableSchemas.projects),
      capabilities: withWebhook,
    },
    {
      name: "project_milestones",
      description: Iceberg.resolveDescription(tableSchemas.project_milestones),
      capabilities,
    },
    {
      name: "project_updates",
      description: Iceberg.resolveDescription(tableSchemas.project_updates),
      capabilities: withWebhook,
    },
    {
      name: "project_statuses",
      description: Iceberg.resolveDescription(tableSchemas.project_statuses),
      capabilities,
    },
    {
      name: "project_labels",
      description: Iceberg.resolveDescription(tableSchemas.project_labels),
      capabilities: withWebhook,
    },
    {
      name: "project_relations",
      description: Iceberg.resolveDescription(tableSchemas.project_relations),
      capabilities,
    },
    {
      name: "initiatives",
      description: Iceberg.resolveDescription(tableSchemas.initiatives),
      capabilities: withWebhook,
    },
    {
      name: "initiative_updates",
      description: Iceberg.resolveDescription(tableSchemas.initiative_updates),
      capabilities: withWebhook,
    },
    {
      name: "initiative_labels",
      description: Iceberg.resolveDescription(tableSchemas.initiative_labels),
      capabilities,
    },
    {
      name: "initiative_relations",
      description: Iceberg.resolveDescription(tableSchemas.initiative_relations),
      capabilities,
    },
    {
      name: "initiative_to_projects",
      description: Iceberg.resolveDescription(tableSchemas.initiative_to_projects),
      capabilities,
    },
    {
      name: "documents",
      description: Iceberg.resolveDescription(tableSchemas.documents),
      capabilities: withWebhook,
    },
    {
      name: "customers",
      description: Iceberg.resolveDescription(tableSchemas.customers),
      capabilities: withWebhook,
    },
    {
      name: "customer_needs",
      description: Iceberg.resolveDescription(tableSchemas.customer_needs),
      capabilities: withWebhook,
    },
    {
      name: "customer_statuses",
      description: Iceberg.resolveDescription(tableSchemas.customer_statuses),
      capabilities,
    },
    {
      name: "customer_tiers",
      description: Iceberg.resolveDescription(tableSchemas.customer_tiers),
      capabilities,
    },
    {
      name: "releases",
      description: Iceberg.resolveDescription(tableSchemas.releases),
      capabilities,
    },
    {
      name: "release_notes",
      description: Iceberg.resolveDescription(tableSchemas.release_notes),
      capabilities,
    },
    {
      name: "release_pipelines",
      description: Iceberg.resolveDescription(tableSchemas.release_pipelines),
      capabilities,
    },
    {
      name: "release_stages",
      description: Iceberg.resolveDescription(tableSchemas.release_stages),
      capabilities,
    },
    {
      name: "issue_to_releases",
      description: Iceberg.resolveDescription(tableSchemas.issue_to_releases),
      capabilities,
    },
    {
      name: "issue_state_spans",
      description: Iceberg.resolveDescription(tableSchemas.issue_state_spans),
      capabilities,
    },
    {
      name: "project_history",
      description: Iceberg.resolveDescription(tableSchemas.project_history),
      capabilities,
    },
    {
      name: "project_external_links",
      description: Iceberg.resolveDescription(tableSchemas.project_external_links),
      capabilities,
    },
    {
      name: "initiative_history",
      description: Iceberg.resolveDescription(tableSchemas.initiative_history),
      capabilities,
    },
    {
      name: "release_history",
      description: Iceberg.resolveDescription(tableSchemas.release_history),
      capabilities,
    },
    {
      name: "templates",
      description: Iceberg.resolveDescription(tableSchemas.templates),
      capabilities,
    },
    {
      name: "custom_views",
      description: Iceberg.resolveDescription(tableSchemas.custom_views),
      capabilities,
    },
    {
      name: "team_sla_rules",
      description: Iceberg.resolveDescription(tableSchemas.team_sla_rules),
      capabilities,
    },
  ],
});

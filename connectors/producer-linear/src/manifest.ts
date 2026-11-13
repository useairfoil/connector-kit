import * as Manifest from "@useairfoil/connector-kit/manifest";

import { webhookSubscriptions } from "./webhook/events";

const connectionFields = {
  apiKey: Manifest.secret({
    runtimeKey: "LINEAR_API_KEY",
    description: "Linear personal API key with Read permission, for example lin_api_...",
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
    { name: "issues", capabilities: withWebhook },
    { name: "issue_history", capabilities: withWebhook },
    { name: "comments", capabilities: withWebhook },
    { name: "issue_relations", capabilities },
    { name: "attachments", capabilities: withWebhook },
    { name: "issue_labels", capabilities: withWebhook },
    { name: "workflow_states", capabilities },
    { name: "teams", capabilities },
    { name: "team_memberships", capabilities },
    { name: "users", capabilities: withWebhook },
    { name: "external_users", capabilities },
    { name: "cycles", capabilities: withWebhook },
    { name: "projects", capabilities: withWebhook },
    { name: "project_milestones", capabilities },
    { name: "project_updates", capabilities: withWebhook },
    { name: "project_statuses", capabilities },
    { name: "project_labels", capabilities: withWebhook },
    { name: "project_relations", capabilities },
    { name: "initiatives", capabilities: withWebhook },
    { name: "initiative_updates", capabilities: withWebhook },
    { name: "initiative_labels", capabilities },
    { name: "initiative_relations", capabilities },
    { name: "initiative_to_projects", capabilities },
    { name: "documents", capabilities: withWebhook },
    { name: "customers", capabilities: withWebhook },
    { name: "customer_needs", capabilities: withWebhook },
    { name: "customer_statuses", capabilities },
    { name: "customer_tiers", capabilities },
    { name: "releases", capabilities },
    { name: "release_notes", capabilities },
    { name: "release_pipelines", capabilities },
    { name: "release_stages", capabilities },
    { name: "issue_to_releases", capabilities },
  ],
});

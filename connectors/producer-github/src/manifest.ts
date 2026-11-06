import * as Manifest from "@useairfoil/connector-kit/manifest";

import { webhookSubscriptions } from "./webhook/events";

const connectionFields = {
  appClientId: Manifest.string({
    runtimeKey: "GITHUB_APP_CLIENT_ID",
    description: "Client ID of the GitHub App, for example Iv23li...",
  }),
  appPrivateKey: Manifest.secret({
    runtimeKey: "GITHUB_APP_PRIVATE_KEY",
    description: "PEM private key of the GitHub App. Newlines may be written as \\n.",
  }),
  installationId: Manifest.number({
    runtimeKey: "GITHUB_INSTALLATION_ID",
    description: "ID of the GitHub App installation to sync.",
    integer: true,
    minimum: 1,
  }),
};

const webhookFields = {
  webhookSecret: Manifest.secret({
    runtimeKey: "GITHUB_WEBHOOK_SECRET",
    description: "Webhook secret of the GitHub App.",
  }),
  installationId: connectionFields.installationId,
};

export const GitHubConnectionConfigDef = Manifest.defineConfig(connectionFields);
export const GitHubWebhookConfigDef = Manifest.defineConfig(webhookFields);
export const GitHubConfigDef = Manifest.defineConfig({
  ...connectionFields,
  ...webhookFields,
});

export type GitHubConnectionConfig = Manifest.ConfigValuesOf<typeof GitHubConnectionConfigDef>;
export type GitHubWebhookConfig = Manifest.ConfigValuesOf<typeof GitHubWebhookConfigDef>;
export type GitHubConfig = Manifest.ConfigValuesOf<typeof GitHubConfigDef>;

export const manifest = Manifest.define({
  name: "producer-github",
  title: "GitHub",
  webhook: {
    path: "/webhooks/github",
    requirement: "required",
    events: webhookSubscriptions,
    configFields: ["webhookSecret"],
    documentationUrl: "https://docs.github.com/en/webhooks",
  },
  config: GitHubConfigDef.spec,
  resources: [
    { name: "repositories", capabilities: ["backfill", "changes", "webhook"] },
    { name: "issues", capabilities: ["backfill", "changes", "webhook"] },
    { name: "pull_requests", capabilities: ["backfill", "changes", "webhook"] },
    { name: "issue_comments", capabilities: ["backfill", "changes", "webhook"] },
    { name: "pull_request_reviews", capabilities: ["backfill", "changes", "webhook"] },
    { name: "pull_request_review_comments", capabilities: ["backfill", "changes", "webhook"] },
    { name: "pull_request_commits", capabilities: ["backfill", "changes", "webhook"] },
    { name: "commits", capabilities: ["backfill", "changes", "webhook"] },
    { name: "check_runs", capabilities: ["backfill", "changes", "webhook"] },
    { name: "commit_statuses", capabilities: ["backfill", "changes", "webhook"] },
    { name: "workflow_runs", capabilities: ["backfill", "changes", "webhook"] },
    { name: "workflow_jobs", capabilities: ["backfill", "changes", "webhook"] },
    { name: "releases", capabilities: ["backfill", "changes", "webhook"] },
  ],
});

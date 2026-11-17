import * as Manifest from "@useairfoil/connector-kit/manifest";

export const ZendeskConfigDef = Manifest.defineConfig({
  subdomain: Manifest.string({
    runtimeKey: "ZENDESK_SUBDOMAIN",
    description: "Zendesk subdomain, for example acme for acme.zendesk.com.",
  }),
  clientId: Manifest.string({
    runtimeKey: "ZENDESK_CLIENT_ID",
    description: "Identifier of a confidential Zendesk OAuth client, created by an admin.",
  }),
  clientSecret: Manifest.secret({
    runtimeKey: "ZENDESK_CLIENT_SECRET",
    description: "Secret of the Zendesk OAuth client.",
  }),
});

export type ZendeskConfig = Manifest.ConfigValuesOf<typeof ZendeskConfigDef>;

const capabilities = ["backfill", "changes"] as const;

export const manifest = Manifest.define({
  name: "producer-zendesk",
  title: "Zendesk",
  config: ZendeskConfigDef.spec,
  resources: [
    { name: "tickets", capabilities },
    { name: "ticket_comments", capabilities },
    { name: "users", capabilities },
    { name: "organizations", capabilities },
    { name: "groups", capabilities },
    { name: "brands", capabilities },
    { name: "ticket_fields", capabilities },
    { name: "ticket_forms", capabilities },
    { name: "custom_statuses", capabilities },
    { name: "survey_responses", capabilities },
    { name: "csat_surveys", capabilities },
    { name: "ticket_field_history", capabilities },
    { name: "ticket_metric_events", capabilities },
    { name: "ticket_audits", capabilities },
    { name: "satisfaction_ratings", capabilities },
    { name: "group_memberships", capabilities: ["changes"] },
    { name: "organization_memberships", capabilities: ["changes"] },
    { name: "user_fields", capabilities },
    { name: "organization_fields", capabilities },
    { name: "custom_roles", capabilities },
    { name: "sla_policies", capabilities },
    { name: "schedules", capabilities },
    { name: "macros", capabilities },
    { name: "articles", capabilities },
    { name: "article_translations", capabilities },
    { name: "sections", capabilities },
    { name: "categories", capabilities },
    { name: "community_posts", capabilities },
    { name: "community_comments", capabilities },
    { name: "community_topics", capabilities },
    { name: "talk_lines", capabilities },
    { name: "talk_calls", capabilities },
    { name: "talk_legs", capabilities },
    { name: "custom_objects", capabilities },
    { name: "custom_object_fields", capabilities },
    { name: "custom_object_records", capabilities },
  ],
});

import * as Iceberg from "@useairfoil/connector-kit/iceberg";
import * as Manifest from "@useairfoil/connector-kit/manifest";

import { tableSchemas } from "./tables";

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
    {
      name: "tickets",
      description: Iceberg.resolveDescription(tableSchemas.tickets),
      capabilities,
    },
    {
      name: "ticket_comments",
      description: Iceberg.resolveDescription(tableSchemas.ticket_comments),
      capabilities,
    },
    {
      name: "users",
      description: Iceberg.resolveDescription(tableSchemas.users),
      capabilities,
    },
    {
      name: "organizations",
      description: Iceberg.resolveDescription(tableSchemas.organizations),
      capabilities,
    },
    {
      name: "groups",
      description: Iceberg.resolveDescription(tableSchemas.groups),
      capabilities,
    },
    {
      name: "brands",
      description: Iceberg.resolveDescription(tableSchemas.brands),
      capabilities,
    },
    {
      name: "ticket_fields",
      description: Iceberg.resolveDescription(tableSchemas.ticket_fields),
      capabilities,
    },
    {
      name: "ticket_forms",
      description: Iceberg.resolveDescription(tableSchemas.ticket_forms),
      capabilities,
    },
    {
      name: "custom_statuses",
      description: Iceberg.resolveDescription(tableSchemas.custom_statuses),
      capabilities,
    },
    {
      name: "survey_responses",
      description: Iceberg.resolveDescription(tableSchemas.survey_responses),
      capabilities,
    },
    {
      name: "csat_surveys",
      description: Iceberg.resolveDescription(tableSchemas.csat_surveys),
      capabilities,
    },
    {
      name: "ticket_field_history",
      description: Iceberg.resolveDescription(tableSchemas.ticket_field_history),
      capabilities,
    },
    {
      name: "ticket_metric_events",
      description: Iceberg.resolveDescription(tableSchemas.ticket_metric_events),
      capabilities,
    },
    {
      name: "ticket_audits",
      description: Iceberg.resolveDescription(tableSchemas.ticket_audits),
      capabilities,
    },
    {
      name: "satisfaction_ratings",
      description: Iceberg.resolveDescription(tableSchemas.satisfaction_ratings),
      capabilities,
    },
    {
      name: "group_memberships",
      description: Iceberg.resolveDescription(tableSchemas.group_memberships),
      capabilities: ["changes"],
    },
    {
      name: "organization_memberships",
      description: Iceberg.resolveDescription(tableSchemas.organization_memberships),
      capabilities: ["changes"],
    },
    {
      name: "user_fields",
      description: Iceberg.resolveDescription(tableSchemas.user_fields),
      capabilities,
    },
    {
      name: "organization_fields",
      description: Iceberg.resolveDescription(tableSchemas.organization_fields),
      capabilities,
    },
    {
      name: "custom_roles",
      description: Iceberg.resolveDescription(tableSchemas.custom_roles),
      capabilities,
    },
    {
      name: "sla_policies",
      description: Iceberg.resolveDescription(tableSchemas.sla_policies),
      capabilities,
    },
    {
      name: "schedules",
      description: Iceberg.resolveDescription(tableSchemas.schedules),
      capabilities,
    },
    {
      name: "macros",
      description: Iceberg.resolveDescription(tableSchemas.macros),
      capabilities,
    },
    {
      name: "articles",
      description: Iceberg.resolveDescription(tableSchemas.articles),
      capabilities,
    },
    {
      name: "article_translations",
      description: Iceberg.resolveDescription(tableSchemas.article_translations),
      capabilities,
    },
    {
      name: "sections",
      description: Iceberg.resolveDescription(tableSchemas.sections),
      capabilities,
    },
    {
      name: "categories",
      description: Iceberg.resolveDescription(tableSchemas.categories),
      capabilities,
    },
    {
      name: "community_posts",
      description: Iceberg.resolveDescription(tableSchemas.community_posts),
      capabilities,
    },
    {
      name: "community_comments",
      description: Iceberg.resolveDescription(tableSchemas.community_comments),
      capabilities,
    },
    {
      name: "community_topics",
      description: Iceberg.resolveDescription(tableSchemas.community_topics),
      capabilities,
    },
    {
      name: "talk_lines",
      description: Iceberg.resolveDescription(tableSchemas.talk_lines),
      capabilities,
    },
    {
      name: "talk_calls",
      description: Iceberg.resolveDescription(tableSchemas.talk_calls),
      capabilities,
    },
    {
      name: "talk_legs",
      description: Iceberg.resolveDescription(tableSchemas.talk_legs),
      capabilities,
    },
    {
      name: "custom_objects",
      description: Iceberg.resolveDescription(tableSchemas.custom_objects),
      capabilities,
    },
    {
      name: "custom_object_fields",
      description: Iceberg.resolveDescription(tableSchemas.custom_object_fields),
      capabilities,
    },
    {
      name: "custom_object_records",
      description: Iceberg.resolveDescription(tableSchemas.custom_object_records),
      capabilities,
    },
  ],
});

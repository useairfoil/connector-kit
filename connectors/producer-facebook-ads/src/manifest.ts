import * as Iceberg from "@useairfoil/connector-kit/iceberg";
import * as Manifest from "@useairfoil/connector-kit/manifest";

import { tableSchemas } from "./tables";

export const FacebookAdsConfigDef = Manifest.defineConfig({
  accessToken: Manifest.secret({
    runtimeKey: "FACEBOOK_ADS_ACCESS_TOKEN",
    description: "System user access token with the `ads_read` permission.",
  }),
  adAccountIds: Manifest.string({
    runtimeKey: "FACEBOOK_ADS_ACCOUNT_IDS",
    label: "Ad account IDs",
    description: "Comma-separated ad account IDs, with or without `act_`.",
    placeholder: "act_123,act_456",
  }),
  startDate: Manifest.optional(
    Manifest.date({
      runtimeKey: "FACEBOOK_ADS_START_DATE",
      description: "First day of insights to backfill. Defaults to 2 years back.",
    }),
  ),
  lookbackDays: Manifest.number({
    runtimeKey: "FACEBOOK_ADS_LOOKBACK_DAYS",
    description: "Days of insights read again on each run, since Meta updates recent days.",
    integer: true,
    minimum: 1,
    default: 28,
  }),
});

export type FacebookAdsConfig = Manifest.ConfigValuesOf<typeof FacebookAdsConfigDef>;

const capabilities = ["backfill", "changes"] as const;

export const manifest = Manifest.define({
  name: "producer-facebook-ads",
  title: "Facebook Ads",
  config: FacebookAdsConfigDef.spec,
  resources: [
    {
      name: "ad_accounts",
      description: Iceberg.resolveDescription(tableSchemas.ad_accounts),
      capabilities,
    },
    {
      name: "campaigns",
      description: Iceberg.resolveDescription(tableSchemas.campaigns),
      capabilities,
    },
    {
      name: "ad_sets",
      description: Iceberg.resolveDescription(tableSchemas.ad_sets),
      capabilities,
    },
    {
      name: "ads",
      description: Iceberg.resolveDescription(tableSchemas.ads),
      capabilities,
    },
    {
      name: "ads_insights",
      description: Iceberg.resolveDescription(tableSchemas.ads_insights),
      capabilities,
    },
    {
      name: "ads_insights_age_gender",
      description: Iceberg.resolveDescription(tableSchemas.ads_insights_age_gender),
      capabilities,
    },
    {
      name: "ads_insights_country",
      description: Iceberg.resolveDescription(tableSchemas.ads_insights_country),
      capabilities,
    },
    {
      name: "ads_insights_platform",
      description: Iceberg.resolveDescription(tableSchemas.ads_insights_platform),
      capabilities,
    },
    {
      name: "account_insights_daily",
      description: Iceberg.resolveDescription(tableSchemas.account_insights_daily),
      capabilities,
    },
    {
      name: "account_insights_monthly",
      description: Iceberg.resolveDescription(tableSchemas.account_insights_monthly),
      capabilities,
    },
    {
      name: "campaign_insights_daily",
      description: Iceberg.resolveDescription(tableSchemas.campaign_insights_daily),
      capabilities,
    },
    {
      name: "campaign_insights_monthly",
      description: Iceberg.resolveDescription(tableSchemas.campaign_insights_monthly),
      capabilities,
    },
    {
      name: "ad_set_insights_daily",
      description: Iceberg.resolveDescription(tableSchemas.ad_set_insights_daily),
      capabilities,
    },
    {
      name: "ad_set_insights_monthly",
      description: Iceberg.resolveDescription(tableSchemas.ad_set_insights_monthly),
      capabilities,
    },
    {
      name: "ad_activities",
      description: Iceberg.resolveDescription(tableSchemas.ad_activities),
      capabilities,
    },
    {
      name: "ad_creatives",
      description: Iceberg.resolveDescription(tableSchemas.ad_creatives),
      capabilities,
    },
    {
      name: "custom_audiences",
      description: Iceberg.resolveDescription(tableSchemas.custom_audiences),
      capabilities,
    },
    {
      name: "custom_conversions",
      description: Iceberg.resolveDescription(tableSchemas.custom_conversions),
      capabilities,
    },
  ],
});

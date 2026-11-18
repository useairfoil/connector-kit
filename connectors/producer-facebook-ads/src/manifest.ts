import * as Manifest from "@useairfoil/connector-kit/manifest";

export const FacebookAdsConfigDef = Manifest.defineConfig({
  accessToken: Manifest.secret({
    runtimeKey: "FACEBOOK_ADS_ACCESS_TOKEN",
    description: "System user access token with the `ads_read` permission.",
  }),
  adAccountIds: Manifest.string({
    runtimeKey: "FACEBOOK_ADS_ACCOUNT_IDS",
    description: "Comma-separated ad account IDs, with or without `act_`.",
  }),
  startDate: Manifest.optional(
    Manifest.string({
      runtimeKey: "FACEBOOK_ADS_START_DATE",
      description: "First day of insights to backfill, as YYYY-MM-DD. Defaults to 2 years back.",
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
    { name: "ad_accounts", capabilities },
    { name: "campaigns", capabilities },
    { name: "ad_sets", capabilities },
    { name: "ads", capabilities },
    { name: "ads_insights", capabilities },
    { name: "ads_insights_age_gender", capabilities },
    { name: "ads_insights_country", capabilities },
    { name: "ads_insights_platform", capabilities },
    { name: "account_insights_daily", capabilities },
    { name: "account_insights_monthly", capabilities },
    { name: "campaign_insights_daily", capabilities },
    { name: "campaign_insights_monthly", capabilities },
    { name: "ad_set_insights_daily", capabilities },
    { name: "ad_set_insights_monthly", capabilities },
    { name: "ad_activities", capabilities },
    { name: "ad_creatives", capabilities },
    { name: "custom_audiences", capabilities },
    { name: "custom_conversions", capabilities },
  ],
});

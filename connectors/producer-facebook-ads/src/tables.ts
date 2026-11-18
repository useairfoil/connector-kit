import type { Schema } from "effect";

import {
  AdInsightsAgeGenderSchema,
  AdInsightsCountrySchema,
  AdInsightsPlatformSchema,
  AdInsightsSchema,
  NativeInsightsSchema,
} from "./schemas/insights";
import {
  AdAccountSchema,
  AdActivitySchema,
  AdCreativeSchema,
  AdSchema,
  AdSetSchema,
  CampaignSchema,
  CustomAudienceSchema,
  CustomConversionSchema,
} from "./schemas/objects";

export const tableSchemas: Readonly<Record<string, Schema.Top>> = {
  ad_accounts: AdAccountSchema,
  campaigns: CampaignSchema,
  ad_sets: AdSetSchema,
  ads: AdSchema,
  ads_insights: AdInsightsSchema,
  ads_insights_age_gender: AdInsightsAgeGenderSchema,
  ads_insights_country: AdInsightsCountrySchema,
  ads_insights_platform: AdInsightsPlatformSchema,
  account_insights_daily: NativeInsightsSchema,
  account_insights_monthly: NativeInsightsSchema,
  campaign_insights_daily: NativeInsightsSchema,
  campaign_insights_monthly: NativeInsightsSchema,
  ad_set_insights_daily: NativeInsightsSchema,
  ad_set_insights_monthly: NativeInsightsSchema,
  ad_activities: AdActivitySchema,
  ad_creatives: AdCreativeSchema,
  custom_audiences: CustomAudienceSchema,
  custom_conversions: CustomConversionSchema,
};

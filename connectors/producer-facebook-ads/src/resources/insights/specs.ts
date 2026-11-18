import type { InsightsItem, InsightsSpec } from "./spec";

import {
  AccountInsightsApiSchema,
  AdSetInsightsApiSchema,
  CampaignInsightsApiSchema,
  type NativeInsights,
  NativeInsightsSchema,
  type AdInsights,
  type AdInsightsAgeGender,
  AdInsightsAgeGenderApiSchema,
  AdInsightsAgeGenderSchema,
  AdInsightsApiSchema,
  type AdInsightsCountry,
  AdInsightsCountryApiSchema,
  AdInsightsCountrySchema,
  type AdInsightsPlatform,
  AdInsightsPlatformApiSchema,
  AdInsightsPlatformSchema,
  AdInsightsSchema,
} from "../../schemas/insights";

export const adInsights: InsightsSpec<typeof AdInsightsApiSchema.Type, AdInsights> = {
  name: "ads_insights",
  breakdowns: [],
  item: AdInsightsApiSchema,
  rowSchema: AdInsightsSchema,
  toRow: ({ date_start, ...item }, id, version) => ({ ...item, id, version, date: date_start }),
};

export const adInsightsAgeGender: InsightsSpec<
  typeof AdInsightsAgeGenderApiSchema.Type,
  AdInsightsAgeGender
> = {
  name: "ads_insights_age_gender",
  breakdowns: ["age", "gender"],
  item: AdInsightsAgeGenderApiSchema,
  rowSchema: AdInsightsAgeGenderSchema,
  toRow: ({ date_start, ...item }, id, version) => ({ ...item, id, version, date: date_start }),
};

export const adInsightsCountry: InsightsSpec<
  typeof AdInsightsCountryApiSchema.Type,
  AdInsightsCountry
> = {
  name: "ads_insights_country",
  breakdowns: ["country"],
  item: AdInsightsCountryApiSchema,
  rowSchema: AdInsightsCountrySchema,
  toRow: ({ date_start, ...item }, id, version) => ({ ...item, id, version, date: date_start }),
};

// `impression_device` needs an opt-in per account since Aug 2026, so it's left out.
export const adInsightsPlatform: InsightsSpec<
  typeof AdInsightsPlatformApiSchema.Type,
  AdInsightsPlatform
> = {
  name: "ads_insights_platform",
  breakdowns: ["publisher_platform", "platform_position"],
  item: AdInsightsPlatformApiSchema,
  rowSchema: AdInsightsPlatformSchema,
  toRow: ({ date_start, ...item }, id, version) => ({ ...item, id, version, date: date_start }),
};

const nativeInsights = <Item extends InsightsItem & typeof AccountInsightsApiSchema.Type>(
  name: string,
  level: "account" | "campaign" | "adset",
  item: InsightsSpec<Item, NativeInsights>["item"],
  monthly: boolean,
): InsightsSpec<Item, NativeInsights> => ({
  name,
  level,
  item,
  monthly,
  attributionWindows: ["1d_click", "7d_click", "1d_view"],
  breakdowns: [],
  rowSchema: NativeInsightsSchema,
  toRow: (entry, id, version) => ({ ...entry, id, version }),
});

export const accountDaily = nativeInsights(
  "account_insights_daily",
  "account",
  AccountInsightsApiSchema,
  false,
);
export const accountMonthly = nativeInsights(
  "account_insights_monthly",
  "account",
  AccountInsightsApiSchema,
  true,
);
export const campaignDaily = nativeInsights(
  "campaign_insights_daily",
  "campaign",
  CampaignInsightsApiSchema,
  false,
);
export const campaignMonthly = nativeInsights(
  "campaign_insights_monthly",
  "campaign",
  CampaignInsightsApiSchema,
  true,
);
export const adSetDaily = nativeInsights(
  "ad_set_insights_daily",
  "adset",
  AdSetInsightsApiSchema,
  false,
);
export const adSetMonthly = nativeInsights(
  "ad_set_insights_monthly",
  "adset",
  AdSetInsightsApiSchema,
  true,
);

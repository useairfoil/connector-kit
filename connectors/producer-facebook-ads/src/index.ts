declare const __COMMIT_SHA__: string | undefined;

export const commitSha = typeof __COMMIT_SHA__ === "undefined" ? undefined : __COMMIT_SHA__;

export * as FacebookAdsClient from "./client/client";
export * as FacebookAdsConnector from "./connector";
export { manifest } from "./manifest";
export type { Ad, AdAccount, AdSet, Campaign } from "./schemas/objects";
export { AdAccountSchema, AdSchema, AdSetSchema, CampaignSchema } from "./schemas/objects";
export type {
  AdInsights,
  AdInsightsAgeGender,
  AdInsightsCountry,
  AdInsightsPlatform,
} from "./schemas/insights";
export {
  AdInsightsAgeGenderSchema,
  AdInsightsCountrySchema,
  AdInsightsPlatformSchema,
  AdInsightsSchema,
} from "./schemas/insights";

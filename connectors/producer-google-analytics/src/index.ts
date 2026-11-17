declare const __COMMIT_SHA__: string | undefined;

export const commitSha = typeof __COMMIT_SHA__ === "undefined" ? undefined : __COMMIT_SHA__;

export * as GoogleAnalyticsAuth from "./client/auth";
export * as GoogleAnalyticsClient from "./client/client";
export * as GoogleAnalyticsConnector from "./connector";
export { manifest } from "./manifest";
export type {
  CohortRetention,
  DailyOverview,
  Device,
  EcommerceItem,
  Event,
  LandingPage,
  Location,
  Page,
  PaidCampaign,
  StreamScreen,
  TrafficSource,
  Transaction,
  UserAcquisition,
} from "./schemas/reports";
export {
  CohortRetentionSchema,
  DailyOverviewSchema,
  DeviceSchema,
  EcommerceItemSchema,
  EventSchema,
  LandingPageSchema,
  LocationSchema,
  PageSchema,
  PaidCampaignSchema,
  StreamScreenSchema,
  TrafficSourceSchema,
  TransactionSchema,
  UserAcquisitionSchema,
} from "./schemas/reports";

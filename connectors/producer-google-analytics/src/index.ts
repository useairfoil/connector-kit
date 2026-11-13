declare const __COMMIT_SHA__: string | undefined;

export const commitSha = typeof __COMMIT_SHA__ === "undefined" ? undefined : __COMMIT_SHA__;

export * as GoogleAnalyticsAuth from "./client/auth";
export * as GoogleAnalyticsClient from "./client/client";
export * as GoogleAnalyticsConnector from "./connector";
export { manifest } from "./manifest";
export type {
  DailyOverview,
  Device,
  EcommerceItem,
  Event,
  LandingPage,
  Location,
  Page,
  TrafficSource,
  UserAcquisition,
} from "./schemas/reports";
export {
  DailyOverviewSchema,
  DeviceSchema,
  EcommerceItemSchema,
  EventSchema,
  LandingPageSchema,
  LocationSchema,
  PageSchema,
  TrafficSourceSchema,
  UserAcquisitionSchema,
} from "./schemas/reports";

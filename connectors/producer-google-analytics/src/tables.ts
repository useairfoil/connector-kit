import type { Schema } from "effect";

import {
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

export const tableSchemas: Readonly<Record<string, Schema.Top>> = {
  daily_overview: DailyOverviewSchema,
  traffic_sources: TrafficSourceSchema,
  user_acquisition: UserAcquisitionSchema,
  pages: PageSchema,
  landing_pages: LandingPageSchema,
  events: EventSchema,
  locations: LocationSchema,
  devices: DeviceSchema,
  ecommerce_items: EcommerceItemSchema,
  transactions: TransactionSchema,
  paid_campaigns: PaidCampaignSchema,
  stream_screens: StreamScreenSchema,
  cohort_retention: CohortRetentionSchema,
};

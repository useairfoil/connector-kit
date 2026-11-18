import type { ReportSpec } from "./spec";

import {
  type CohortRetention,
  CohortRetentionSchema,
  type DailyOverview,
  DailyOverviewSchema,
  type Device,
  DeviceSchema,
  type EcommerceItem,
  EcommerceItemSchema,
  type Event,
  EventSchema,
  type LandingPage,
  LandingPageSchema,
  type Location,
  LocationSchema,
  type Page,
  PageSchema,
  type PaidCampaign,
  PaidCampaignSchema,
  type StreamScreen,
  StreamScreenSchema,
  type TrafficSource,
  TrafficSourceSchema,
  type Transaction,
  TransactionSchema,
  type UserAcquisition,
  UserAcquisitionSchema,
} from "../../schemas/reports";

// Every pair here is one Google shows together in its own reports. Check new
// ones with `checkCompatibility` first.

export const dailyOverview: ReportSpec<DailyOverview> = {
  name: "daily_overview",
  dimensions: {},
  metrics: {
    active_users: "activeUsers",
    new_users: "newUsers",
    total_users: "totalUsers",
    sessions: "sessions",
    engaged_sessions: "engagedSessions",
    screen_page_views: "screenPageViews",
    event_count: "eventCount",
    key_events: "keyEvents",
    total_revenue: "totalRevenue",
    user_engagement_duration: "userEngagementDuration",
  },
  rowSchema: DailyOverviewSchema,
};

export const trafficSources: ReportSpec<TrafficSource> = {
  name: "traffic_sources",
  dimensions: {
    session_source: "sessionSource",
    session_medium: "sessionMedium",
    session_campaign_id: "sessionCampaignId",
    session_campaign_name: "sessionCampaignName",
    session_default_channel_group: "sessionDefaultChannelGroup",
  },
  metrics: {
    sessions: "sessions",
    engaged_sessions: "engagedSessions",
    active_users: "activeUsers",
    new_users: "newUsers",
    screen_page_views: "screenPageViews",
    event_count: "eventCount",
    key_events: "keyEvents",
    total_revenue: "totalRevenue",
    user_engagement_duration: "userEngagementDuration",
  },
  rowSchema: TrafficSourceSchema,
};

export const userAcquisition: ReportSpec<UserAcquisition> = {
  name: "user_acquisition",
  dimensions: {
    first_user_source: "firstUserSource",
    first_user_medium: "firstUserMedium",
    first_user_campaign_id: "firstUserCampaignId",
    first_user_campaign_name: "firstUserCampaignName",
    first_user_default_channel_group: "firstUserDefaultChannelGroup",
  },
  metrics: {
    new_users: "newUsers",
    active_users: "activeUsers",
    sessions: "sessions",
    engaged_sessions: "engagedSessions",
    key_events: "keyEvents",
    total_revenue: "totalRevenue",
  },
  rowSchema: UserAcquisitionSchema,
};

export const pages: ReportSpec<Page> = {
  name: "pages",
  dimensions: { host_name: "hostName", page_path: "pagePath", page_title: "pageTitle" },
  metrics: {
    screen_page_views: "screenPageViews",
    active_users: "activeUsers",
    event_count: "eventCount",
    key_events: "keyEvents",
    user_engagement_duration: "userEngagementDuration",
  },
  rowSchema: PageSchema,
};

export const landingPages: ReportSpec<LandingPage> = {
  name: "landing_pages",
  dimensions: { landing_page: "landingPage" },
  metrics: {
    sessions: "sessions",
    engaged_sessions: "engagedSessions",
    active_users: "activeUsers",
    new_users: "newUsers",
    key_events: "keyEvents",
    total_revenue: "totalRevenue",
  },
  rowSchema: LandingPageSchema,
};

export const events: ReportSpec<Event> = {
  name: "events",
  dimensions: { event_name: "eventName" },
  metrics: {
    event_count: "eventCount",
    total_users: "totalUsers",
    event_value: "eventValue",
    key_events: "keyEvents",
  },
  rowSchema: EventSchema,
};

export const locations: ReportSpec<Location> = {
  name: "locations",
  dimensions: { country: "country", region: "region", city: "city" },
  metrics: {
    active_users: "activeUsers",
    new_users: "newUsers",
    sessions: "sessions",
    engaged_sessions: "engagedSessions",
    key_events: "keyEvents",
    total_revenue: "totalRevenue",
  },
  rowSchema: LocationSchema,
};

export const devices: ReportSpec<Device> = {
  name: "devices",
  dimensions: {
    device_category: "deviceCategory",
    platform: "platform",
    operating_system: "operatingSystem",
    browser: "browser",
  },
  metrics: {
    active_users: "activeUsers",
    new_users: "newUsers",
    sessions: "sessions",
    engaged_sessions: "engagedSessions",
    screen_page_views: "screenPageViews",
    key_events: "keyEvents",
  },
  rowSchema: DeviceSchema,
};

export const ecommerceItems: ReportSpec<EcommerceItem> = {
  name: "ecommerce_items",
  dimensions: {
    item_id: "itemId",
    item_name: "itemName",
    item_brand: "itemBrand",
    item_category: "itemCategory",
  },
  metrics: {
    items_viewed: "itemsViewed",
    items_added_to_cart: "itemsAddedToCart",
    items_purchased: "itemsPurchased",
    items_checked_out: "itemsCheckedOut",
    item_refund_amount: "itemRefundAmount",
    item_revenue: "itemRevenue",
  },
  rowSchema: EcommerceItemSchema,
};

export const transactions: ReportSpec<Transaction> = {
  name: "transactions",
  dimensions: {
    transaction_id: "transactionId",
  },
  metrics: {
    ecommerce_purchases: "ecommercePurchases",
    purchase_revenue: "purchaseRevenue",
    refund_amount: "refundAmount",
  },
  rowSchema: TransactionSchema,
};

export const paidCampaigns: ReportSpec<PaidCampaign> = {
  name: "paid_campaigns",
  dimensions: {
    customer_id: "sessionGoogleAdsCustomerId",
    campaign_id: "sessionGoogleAdsCampaignId",
    ad_group_id: "sessionGoogleAdsAdGroupId",
  },
  metrics: {
    sessions: "sessions",
    advertiser_ad_cost: "advertiserAdCost",
    advertiser_ad_clicks: "advertiserAdClicks",
    advertiser_ad_impressions: "advertiserAdImpressions",
  },
  rowSchema: PaidCampaignSchema,
};

export const streamScreens: ReportSpec<StreamScreen> = {
  name: "stream_screens",
  dimensions: {
    stream_id: "streamId",
    stream_name: "streamName",
    platform: "platform",
    screen_class: "unifiedScreenClass",
  },
  metrics: {
    screen_page_views: "screenPageViews",
    active_users: "activeUsers",
  },
  rowSchema: StreamScreenSchema,
};

export const cohortRetention: ReportSpec<CohortRetention> = {
  name: "cohort_retention",
  cohortEndOffset: 7,
  dimensions: { day_offset: "cohortNthDay" },
  metrics: { active_users: "cohortActiveUsers", total_users: "cohortTotalUsers" },
  rowSchema: CohortRetentionSchema,
};

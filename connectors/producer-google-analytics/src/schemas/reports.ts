import * as Iceberg from "@useairfoil/connector-kit/iceberg";
import { Schema } from "effect";

import { amount, common, count, currencyCode, dimension } from "./shared";

// User counts are distinct users, so they don't add up across rows or days.

export const DailyOverviewSchema = Schema.Struct({
  ...common,
  active_users: count("Users who engaged on the day."),
  new_users: count("Users who came for the first time."),
  total_users: count("Users who logged any event."),
  sessions: count("Sessions that started."),
  engaged_sessions: count(
    "Sessions that lasted 10 seconds or more, or had a key event or 2 page views.",
  ),
  screen_page_views: count("Page and screen views."),
  event_count: count("Events."),
  key_events: amount("Key events. Can be fractional after attribution."),
  total_revenue: amount("Revenue from purchases, subscriptions, and ads."),
  user_engagement_duration: amount("Seconds the site or app was in the foreground."),
  currency_code: currencyCode,
})
  .annotate({ description: "Google Analytics totals per day." })
  .pipe(Iceberg.identifier("id"));

export type DailyOverview = Schema.Schema.Type<typeof DailyOverviewSchema>;

export const TrafficSourceSchema = Schema.Struct({
  ...common,
  session_source: dimension("Source of the session, such as google."),
  session_medium: dimension("Medium of the session, such as organic."),
  session_campaign_id: dimension("ID of the marketing campaign for the session."),
  session_campaign_name: dimension("Campaign of the session."),
  session_default_channel_group: dimension("Default channel group of the session."),
  sessions: count("Sessions that started."),
  engaged_sessions: count("Engaged sessions."),
  active_users: count("Users who engaged."),
  new_users: count("Users who came for the first time."),
  screen_page_views: count("Page and screen views."),
  event_count: count("Events."),
  key_events: amount("Key events."),
  total_revenue: amount("Revenue from purchases, subscriptions, and ads."),
  user_engagement_duration: amount("Seconds the site or app was in the foreground."),
  currency_code: currencyCode,
})
  .annotate({ description: "Google Analytics sessions per day and traffic source." })
  .pipe(Iceberg.identifier("id"));

export type TrafficSource = Schema.Schema.Type<typeof TrafficSourceSchema>;

export const UserAcquisitionSchema = Schema.Struct({
  ...common,
  first_user_source: dimension("Source that first brought the user."),
  first_user_medium: dimension("Medium that first brought the user."),
  first_user_campaign_id: dimension("ID of the marketing campaign that first acquired the user."),
  first_user_campaign_name: dimension("Campaign that first brought the user."),
  first_user_default_channel_group: dimension("Default channel group that first brought the user."),
  new_users: count("Users who came for the first time."),
  active_users: count("Users who engaged."),
  sessions: count("Sessions that started."),
  engaged_sessions: count("Engaged sessions."),
  key_events: amount("Key events."),
  total_revenue: amount("Revenue from purchases, subscriptions, and ads."),
  currency_code: currencyCode,
})
  .annotate({ description: "Google Analytics users per day and first traffic source." })
  .pipe(Iceberg.identifier("id"));

export type UserAcquisition = Schema.Schema.Type<typeof UserAcquisitionSchema>;

export const PageSchema = Schema.Struct({
  ...common,
  host_name: dimension("Host name, such as www.example.com."),
  page_path: dimension("Page path, without the query string."),
  page_title: dimension("Page title."),
  screen_page_views: count("Page and screen views."),
  active_users: count("Users who engaged."),
  event_count: count("Events."),
  key_events: amount("Key events."),
  user_engagement_duration: amount("Seconds the page was in the foreground."),
})
  .annotate({ description: "Google Analytics page views per day and page." })
  .pipe(Iceberg.identifier("id"));

export type Page = Schema.Schema.Type<typeof PageSchema>;

export const LandingPageSchema = Schema.Struct({
  ...common,
  landing_page: dimension("First page path of the session, without the query string."),
  sessions: count("Sessions that started."),
  engaged_sessions: count("Engaged sessions."),
  active_users: count("Users who engaged."),
  new_users: count("Users who came for the first time."),
  key_events: amount("Key events."),
  total_revenue: amount("Revenue from purchases, subscriptions, and ads."),
  currency_code: currencyCode,
})
  .annotate({ description: "Google Analytics sessions per day and landing page." })
  .pipe(Iceberg.identifier("id"));

export type LandingPage = Schema.Schema.Type<typeof LandingPageSchema>;

export const EventSchema = Schema.Struct({
  ...common,
  event_name: dimension("Event name, such as page_view."),
  event_count: count("Events."),
  total_users: count("Users who logged the event."),
  event_value: amount("Sum of the event's value parameter."),
  key_events: amount("Key events."),
})
  .annotate({ description: "Google Analytics events per day and event name." })
  .pipe(Iceberg.identifier("id"));

export type Event = Schema.Schema.Type<typeof EventSchema>;

export const LocationSchema = Schema.Struct({
  ...common,
  country: dimension("Country of the user."),
  region: dimension("Region of the user."),
  city: dimension("City of the user."),
  active_users: count("Users who engaged."),
  new_users: count("Users who came for the first time."),
  sessions: count("Sessions that started."),
  engaged_sessions: count("Engaged sessions."),
  key_events: amount("Key events."),
  total_revenue: amount("Revenue from purchases, subscriptions, and ads."),
  currency_code: currencyCode,
})
  .annotate({ description: "Google Analytics users per day and location." })
  .pipe(Iceberg.identifier("id"));

export type Location = Schema.Schema.Type<typeof LocationSchema>;

export const DeviceSchema = Schema.Struct({
  ...common,
  device_category: dimension("Device category: desktop, mobile, or tablet."),
  platform: dimension("Platform: web, iOS, or Android."),
  operating_system: dimension("Operating system."),
  browser: dimension("Browser."),
  active_users: count("Users who engaged."),
  new_users: count("Users who came for the first time."),
  sessions: count("Sessions that started."),
  engaged_sessions: count("Engaged sessions."),
  screen_page_views: count("Page and screen views."),
  key_events: amount("Key events."),
})
  .annotate({ description: "Google Analytics users per day and device." })
  .pipe(Iceberg.identifier("id"));

export type Device = Schema.Schema.Type<typeof DeviceSchema>;

export const EcommerceItemSchema = Schema.Struct({
  ...common,
  item_id: dimension("Item ID."),
  item_name: dimension("Item name."),
  item_brand: dimension("Item brand."),
  item_category: dimension("First item category."),
  items_viewed: count("Units viewed."),
  items_added_to_cart: count("Units added to carts."),
  items_purchased: count("Units purchased."),
  items_checked_out: count("Units included in checkout events."),
  item_refund_amount: amount("Refunded item revenue, without tax and shipping."),
  item_revenue: amount("Revenue from the item, without tax and shipping."),
  currency_code: currencyCode,
})
  .annotate({
    description: "Google Analytics ecommerce items per day. Empty without ecommerce events.",
  })
  .pipe(Iceberg.identifier("id"));

export type EcommerceItem = Schema.Schema.Type<typeof EcommerceItemSchema>;

export const TransactionSchema = Schema.Struct({
  ...common,
  transaction_id: dimension("Transaction ID sent with a purchase or refund."),
  ecommerce_purchases: count("Purchase events."),
  purchase_revenue: amount("Purchase revenue less refunds."),
  refund_amount: amount("Refund amount."),
  currency_code: currencyCode,
})
  .annotate({ description: "Google Analytics purchases and refunds per day and transaction ID." })
  .pipe(Iceberg.identifier("id"));

export type Transaction = Schema.Schema.Type<typeof TransactionSchema>;

export const PaidCampaignSchema = Schema.Struct({
  ...common,
  customer_id: dimension("Linked Google Ads customer ID."),
  campaign_id: dimension("Google Ads campaign ID."),
  ad_group_id: dimension("Google Ads ad group ID."),
  sessions: count("Sessions."),
  advertiser_ad_cost: amount("Reported ad cost."),
  advertiser_ad_clicks: count("Reported ad clicks."),
  advertiser_ad_impressions: count("Reported ad impressions."),
  currency_code: currencyCode,
})
  .annotate({
    description: "Google Analytics performance by day and linked Google Ads campaign and ad group.",
  })
  .pipe(Iceberg.identifier("id"));

export type PaidCampaign = Schema.Schema.Type<typeof PaidCampaignSchema>;

export const StreamScreenSchema = Schema.Struct({
  ...common,
  stream_id: dimension("Analytics data stream ID."),
  stream_name: dimension("Analytics data stream name."),
  platform: dimension("Web, iOS, or Android."),
  screen_class: dimension("Screen class or page path."),
  screen_page_views: count("Screen and page views."),
  active_users: count("Active users."),
})
  .annotate({ description: "Google Analytics views per day, stream, and screen class." })
  .pipe(Iceberg.identifier("id"));

export type StreamScreen = Schema.Schema.Type<typeof StreamScreenSchema>;

export const CohortRetentionSchema = Schema.Struct({
  ...common,
  day_offset: dimension("Days after the first session, such as 0007."),
  active_users: count("Users in the cohort who were active that day."),
  total_users: count("Users whose first session was on `date`."),
})
  .annotate({
    description: "Google Analytics users by first-session day, active on each of the next 7 days.",
  })
  .pipe(Iceberg.identifier("id"));

export type CohortRetention = Schema.Schema.Type<typeof CohortRetentionSchema>;

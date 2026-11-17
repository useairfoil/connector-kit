import type { Demo } from "@useairfoil/connector-kit";

import { DateTime } from "effect";

import {
  currency,
  day,
  devices,
  host,
  items,
  locations,
  money,
  pages,
  propertyId,
  type Rows,
  sources,
  split,
} from "./shared";

/** One group is one day of reports, counting back from yesterday. */
export const dayRows = (index: number, { faker, now }: Demo.DemoContext): Rows => {
  const date = DateTime.formatIsoDateUtc(
    DateTime.fromDateUnsafe(new Date(now.getTime() - (index + 1) * day)),
  );

  const id = (...dimensions: ReadonlyArray<string>) =>
    JSON.stringify([propertyId, date, ...dimensions]);

  const base = { version: now, property_id: propertyId, date };

  // Traffic grows over time and dips at the weekend.
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const weekend = weekday === 0 || weekday === 6 ? 0.75 : 1;
  const growth = Math.max(0.4, 1 - index / 900);

  const sessions = Math.round(
    4200 * weekend * growth * faker.number.float({ min: 0.85, max: 1.15 }),
  );

  const engaged = Math.round(sessions * faker.number.float({ min: 0.55, max: 0.68 }));
  const activeUsers = Math.round(sessions * 0.78);
  const newUsers = Math.round(activeUsers * faker.number.float({ min: 0.42, max: 0.55 }));
  const views = Math.round(sessions * faker.number.float({ min: 3.2, max: 4.4 }));
  const purchases = Math.round(sessions * faker.number.float({ min: 0.018, max: 0.028 }));
  const revenue = money(purchases * faker.number.float({ min: 58, max: 74 }));
  const engagement = money(engaged * faker.number.float({ min: 95, max: 140 }));

  const bySource = split(
    sessions,
    sources.map((source) => source[4]),
  );

  const byNewSource = split(
    newUsers,
    sources.map((source) => source[4]),
  );

  const purchasesBySource = split(
    purchases,
    sources.map((source) => source[4]),
  );

  const share = (part: number, whole: number) => (whole === 0 ? 0 : part / whole);

  const eventCounts: ReadonlyArray<readonly [string, number, number]> = [
    ["page_view", views, activeUsers],
    ["session_start", sessions, activeUsers],
    ["first_visit", newUsers, newUsers],
    ["user_engagement", engaged * 3, Math.round(activeUsers * 0.7)],
    ["scroll", Math.round(views * 0.45), Math.round(activeUsers * 0.5)],
    ["view_item", Math.round(views * 0.3), Math.round(activeUsers * 0.4)],
    ["add_to_cart", Math.round(sessions * 0.08), Math.round(activeUsers * 0.07)],
    ["begin_checkout", Math.round(sessions * 0.04), Math.round(activeUsers * 0.035)],
    ["purchase", purchases, purchases],
  ];

  // Cheaper items sell more units.
  const itemUnits = split(
    purchases + Math.round(purchases * 0.4),
    items.map((item) => 10 - item[3] / 10),
  );

  const viewsByPage = split(
    views,
    pages.map((page) => page[2]),
  );

  const sessionsByLanding = split(sessions, [42, 16, 14, 10, 10, 8]);

  const sessionsByLocation = split(
    sessions,
    locations.map((location) => location[3]),
  );

  const sessionsByDevice = split(
    sessions,
    devices.map((device) => device[4]),
  );

  return {
    daily_overview: [
      {
        id: id(),
        ...base,
        active_users: BigInt(activeUsers),
        new_users: BigInt(newUsers),
        total_users: BigInt(Math.round(activeUsers * 1.08)),
        sessions: BigInt(sessions),
        engaged_sessions: BigInt(engaged),
        screen_page_views: BigInt(views),
        event_count: BigInt(eventCounts.reduce((sum, [, count]) => sum + count, 0)),
        key_events: purchases,
        total_revenue: revenue,
        user_engagement_duration: engagement,
        currency_code: currency,
      },
    ],
    traffic_sources: sources.map(([source, medium, campaign, channel], s) => {
      const part = bySource[s] ?? 0;

      return {
        id: id(source, medium, String(s), campaign, channel),
        session_campaign_id: String(s),
        ...base,
        session_source: source,
        session_medium: medium,
        session_campaign_name: campaign,
        session_default_channel_group: channel,
        sessions: BigInt(part),
        engaged_sessions: BigInt(Math.round(part * share(engaged, sessions))),
        active_users: BigInt(Math.round(part * share(activeUsers, sessions))),
        new_users: BigInt(Math.round(part * share(newUsers, sessions))),
        screen_page_views: BigInt(Math.round(part * share(views, sessions))),
        event_count: BigInt(Math.round(part * share(views, sessions) * 2.6)),
        key_events: purchasesBySource[s] ?? 0,
        total_revenue: money(revenue * share(purchasesBySource[s] ?? 0, purchases)),
        user_engagement_duration: money(engagement * share(part, sessions)),
        currency_code: currency,
      };
    }),
    user_acquisition: sources.map(([source, medium, campaign, channel], s) => ({
      id: id(source, medium, String(s), campaign, channel),
      first_user_campaign_id: String(s),
      ...base,
      first_user_source: source,
      first_user_medium: medium,
      first_user_campaign_name: campaign,
      first_user_default_channel_group: channel,
      new_users: BigInt(byNewSource[s] ?? 0),
      active_users: BigInt(Math.round((byNewSource[s] ?? 0) * 1.6)),
      sessions: BigInt(Math.round((byNewSource[s] ?? 0) * 1.9)),
      engaged_sessions: BigInt(Math.round((byNewSource[s] ?? 0) * 1.1)),
      key_events: Math.round((purchasesBySource[s] ?? 0) * 0.4),
      total_revenue: money(revenue * 0.4 * share(purchasesBySource[s] ?? 0, purchases)),
      currency_code: currency,
    })),
    pages: pages.map(([path, title, weight], p) => {
      const part = viewsByPage[p] ?? 0;

      return {
        id: id(host, path, title),
        ...base,
        host_name: host,
        page_path: path,
        page_title: title,
        screen_page_views: BigInt(part),
        active_users: BigInt(Math.round(part * 0.62)),
        event_count: BigInt(Math.round(part * 2.4)),
        key_events: path === "/checkout" ? purchases : 0,
        user_engagement_duration: money(engagement * (weight / 100)),
      };
    }),
    landing_pages: pages.slice(0, 6).map(([path], l) => {
      const part = sessionsByLanding[l] ?? 0;

      return {
        id: id(path),
        ...base,
        landing_page: path,
        sessions: BigInt(part),
        engaged_sessions: BigInt(Math.round(part * share(engaged, sessions))),
        active_users: BigInt(Math.round(part * 0.8)),
        new_users: BigInt(Math.round(part * share(newUsers, sessions))),
        key_events: Math.round(purchases * share(part, sessions)),
        total_revenue: money(revenue * share(part, sessions)),
        currency_code: currency,
      };
    }),
    events: eventCounts.map(([name, count, users]) => ({
      id: id(name),
      ...base,
      event_name: name,
      event_count: BigInt(count),
      total_users: BigInt(users),
      event_value: name === "purchase" ? revenue : 0,
      key_events: name === "purchase" ? purchases : 0,
    })),
    locations: locations.map(([country, region, city], l) => {
      const part = sessionsByLocation[l] ?? 0;

      return {
        id: id(country, region, city),
        ...base,
        country,
        region,
        city,
        active_users: BigInt(Math.round(part * 0.78)),
        new_users: BigInt(Math.round(part * share(newUsers, sessions))),
        sessions: BigInt(part),
        engaged_sessions: BigInt(Math.round(part * share(engaged, sessions))),
        key_events: Math.round(purchases * share(part, sessions)),
        total_revenue: money(revenue * share(part, sessions)),
        currency_code: currency,
      };
    }),
    devices: devices.map(([category, platform, os, browser], d) => {
      const part = sessionsByDevice[d] ?? 0;

      return {
        id: id(category, platform, os, browser),
        ...base,
        device_category: category,
        platform,
        operating_system: os,
        browser,
        active_users: BigInt(Math.round(part * 0.78)),
        new_users: BigInt(Math.round(part * share(newUsers, sessions))),
        sessions: BigInt(part),
        engaged_sessions: BigInt(Math.round(part * share(engaged, sessions))),
        screen_page_views: BigInt(Math.round(part * share(views, sessions))),
        key_events: Math.round(purchases * share(part, sessions)),
      };
    }),
    transactions: Array.from({ length: purchases }, (_, index) => {
      const transaction_id = `order-${date}-${index + 1}`;
      return {
        ...base,
        id: id(transaction_id),
        transaction_id,
        ecommerce_purchases: 1n,
        purchase_revenue: money(revenue / purchases),
        refund_amount: 0,
        currency_code: currency,
      };
    }),
    paid_campaigns: [
      {
        ...base,
        id: id("83880125", "53201", "5320101"),
        customer_id: "83880125",
        campaign_id: "53201",
        ad_group_id: "5320101",
        sessions: BigInt(Math.floor(sessions / 5)),
        advertiser_ad_cost: money(sessions * 0.12),
        advertiser_ad_clicks: BigInt(Math.floor(sessions / 4)),
        advertiser_ad_impressions: BigInt(sessions * 3),
        currency_code: currency,
      },
    ],
    stream_screens: [
      {
        ...base,
        id: id("1717501", "Store", "web", "/"),
        stream_id: "1717501",
        stream_name: "Store",
        platform: "web",
        screen_class: "/",
        screen_page_views: BigInt(Math.floor(views / 3)),
        active_users: BigInt(Math.floor(sessions / 4)),
      },
    ],
    cohort_retention: (
      [
        ["0000", 1],
        ["0001", 0.28],
        ["0007", 0.12],
      ] as const
    ).map(([day_offset, kept]) => ({
      ...base,
      id: id(day_offset),
      day_offset,
      active_users: BigInt(Math.round(newUsers * kept)),
      total_users: BigInt(newUsers),
    })),
    ecommerce_items: items.map(([itemId, name, category, price], i) => {
      const bought = itemUnits[i] ?? 0;
      const added = Math.round(bought * faker.number.float({ min: 3, max: 5 }));

      return {
        id: id(itemId, name, "Acme", category),
        ...base,
        item_id: itemId,
        item_name: name,
        item_brand: "Acme",
        item_category: category,
        items_viewed: BigInt(Math.round(added * faker.number.float({ min: 6, max: 9 }))),
        items_added_to_cart: BigInt(added),
        items_purchased: BigInt(bought),
        items_checked_out: BigInt(Math.max(bought, Math.round(added * 0.6))),
        item_refund_amount: 0,
        item_revenue: money(bought * price),
        currency_code: currency,
      };
    }),
  };
};

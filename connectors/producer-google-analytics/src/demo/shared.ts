import { Duration } from "effect";

import type {
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
} from "../schemas/reports";

export const day = Duration.toMillis(Duration.days(1));
export const propertyId = "123456789";
export const host = "shop.acme.example.com";
export const currency = "USD";

// [source, medium, campaign, channel group, share of sessions]
export const sources = [
  ["google", "organic", "(organic)", "Organic Search", 34],
  ["(direct)", "(none)", "(direct)", "Direct", 22],
  ["google", "cpc", "brand_search", "Paid Search", 14],
  ["facebook", "paid_social", "fall_sale", "Paid Social", 9],
  ["newsletter", "email", "weekly_digest", "Email", 8],
  ["bing", "organic", "(organic)", "Organic Search", 5],
  ["instagram.com", "referral", "(referral)", "Organic Social", 5],
  ["partner.example.com", "referral", "(referral)", "Referral", 3],
] as const;

export const pages = [
  ["/", "Acme - Everyday goods", 30],
  ["/collections/new", "New arrivals - Acme", 14],
  ["/collections/sale", "Sale - Acme", 12],
  ["/products/classic-tee", "Classic Tee - Acme", 9],
  ["/products/everyday-hoodie", "Everyday Hoodie - Acme", 8],
  ["/products/water-bottle", "Insulated Water Bottle - Acme", 6],
  ["/cart", "Your cart - Acme", 8],
  ["/checkout", "Checkout - Acme", 5],
  ["/blog/how-we-source-cotton", "How we source our cotton - Acme", 4],
  ["/pages/shipping", "Shipping - Acme", 4],
] as const;

export const locations = [
  ["United States", "California", "Los Angeles", 14],
  ["United States", "New York", "New York", 12],
  ["United States", "Texas", "Austin", 7],
  ["United States", "Illinois", "Chicago", 6],
  ["United Kingdom", "England", "London", 9],
  ["Canada", "Ontario", "Toronto", 6],
  ["Germany", "Berlin", "Berlin", 5],
  ["Australia", "New South Wales", "Sydney", 4],
  ["United States", "(not set)", "(not set)", 3],
] as const;

export const devices = [
  ["mobile", "web", "iOS", "Safari", 30],
  ["mobile", "web", "Android", "Chrome", 22],
  ["desktop", "web", "Windows", "Chrome", 18],
  ["desktop", "web", "Macintosh", "Chrome", 12],
  ["desktop", "web", "Macintosh", "Safari", 10],
  ["tablet", "web", "iOS", "Safari", 5],
  ["desktop", "web", "Windows", "Edge", 3],
] as const;

export const items = [
  ["SKU-TEE", "Classic Cotton Tee", "Apparel", 28],
  ["SKU-HOODIE", "Everyday Hoodie", "Apparel", 64],
  ["SKU-SHIRT", "Linen Button Shirt", "Apparel", 72],
  ["SKU-BEANIE", "Wool Beanie", "Accessories", 26],
  ["SKU-TOTE", "Canvas Tote Bag", "Accessories", 22],
  ["SKU-MUG", "Stoneware Mug", "Home", 18],
  ["SKU-BOTTLE", "Insulated Water Bottle", "Home", 32],
] as const;

/** Splits a total by weights into whole numbers that add up to it. */
export const split = (total: number, weights: ReadonlyArray<number>) => {
  const sum = weights.reduce((a, b) => a + b, 0);
  const parts = weights.map((weight) => Math.floor((total * weight) / sum));
  parts[0] = (parts[0] ?? 0) + total - parts.reduce((a, b) => a + b, 0);

  return parts;
};

export const money = (value: number) => Math.round(value * 100) / 100;

export type Rows = {
  readonly daily_overview: Array<DailyOverview>;
  readonly traffic_sources: Array<TrafficSource>;
  readonly user_acquisition: Array<UserAcquisition>;
  readonly pages: Array<Page>;
  readonly landing_pages: Array<LandingPage>;
  readonly events: Array<Event>;
  readonly locations: Array<Location>;
  readonly devices: Array<Device>;
  readonly ecommerce_items: Array<EcommerceItem>;
  readonly transactions: Array<Transaction>;
  readonly paid_campaigns: Array<PaidCampaign>;
  readonly stream_screens: Array<StreamScreen>;
  readonly cohort_retention: Array<CohortRetention>;
};

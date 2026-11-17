import { Duration } from "effect";

import type { NativeInsights } from "../schemas/insights";
import type {
  AdInsights,
  AdInsightsAgeGender,
  AdInsightsCountry,
  AdInsightsPlatform,
} from "../schemas/insights";

export const day = Duration.toMillis(Duration.days(1));

// Meta keeps 37 months of insights, so the demo stops there.
export const historyDays = 1127;

export const accounts = [
  {
    id: "1033000000000001",
    name: "Acme US",
    currency: "USD",
    timezone: "America/Los_Angeles",
    offset: -7,
    countries: ["US", "CA"],
  },
  {
    id: "1033000000000002",
    name: "Acme EU",
    currency: "EUR",
    timezone: "Europe/Berlin",
    offset: 2,
    countries: ["DE", "FR", "NL", "GB"],
  },
] as const;

// [name, objective, daily budget in minor units, days since it started,
// days since it stopped (0 = running)]
export const campaigns = [
  ["Prospecting - Broad", "OUTCOME_SALES", 15_000, historyDays, 0],
  ["Retargeting - Site visitors", "OUTCOME_SALES", 6_000, 1000, 0],
  ["Brand awareness - Video", "OUTCOME_AWARENESS", 8_000, 700, 0],
  ["Spring sale", "OUTCOME_SALES", 20_000, 220, 120],
] as const;

export const audiences = ["Lookalike 1%", "Interests - Outdoors", "Website visitors 30d"] as const;

export const formats = [
  { name: "Carousel", type: "SHARE", video: false, cta: "SHOP_NOW" },
  { name: "Video 15s", type: "VIDEO", video: true, cta: "LEARN_MORE" },
] as const;

export const campaignId = (a: number, c: number) => `1202100000${a}${String(c).padStart(7, "0")}`;

export const adSetId = (a: number, c: number, s: number) =>
  `1202200000${a}${String(c * 10 + s).padStart(7, "0")}`;

export const adId = (a: number, c: number, s: number, f: number) =>
  `1202300000${a}${String(c * 100 + s * 10 + f).padStart(7, "0")}`;

export const ageRanges = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"] as const;
export const ageWeights = [14, 32, 24, 15, 9, 6] as const;

export const placements = [
  ["facebook", "feed", 38],
  ["instagram", "feed", 26],
  ["instagram", "instagram_stories", 18],
  ["instagram", "instagram_reels", 12],
  ["audience_network", "classic", 6],
] as const;

/** Splits a total by weights into whole numbers that add up to it. */
export const split = (total: number, weights: ReadonlyArray<number>) => {
  const sum = weights.reduce((a, b) => a + b, 0);
  const parts = weights.map((weight) => Math.floor((total * weight) / sum));
  parts[0] = (parts[0] ?? 0) + total - parts.reduce((a, b) => a + b, 0);

  return parts;
};

type Campaigns = ReadonlyArray<{
  readonly account: number;
  readonly campaign: number;
  readonly started: Date;
  readonly stopped: Date | null;
}>;

export const runs = (now: Date): Campaigns =>
  accounts.flatMap((_, a) =>
    campaigns.map(([, , , startedDaysAgo, stoppedDaysAgo], c) => ({
      account: a,
      campaign: c,
      started: new Date(now.getTime() - startedDaysAgo * day),
      stopped: stoppedDaysAgo > 0 ? new Date(now.getTime() - stoppedDaysAgo * day) : null,
    })),
  );

export type Rows = {
  readonly account_insights_daily: Array<NativeInsights>;
  readonly account_insights_monthly: Array<NativeInsights>;
  readonly campaign_insights_daily: Array<NativeInsights>;
  readonly campaign_insights_monthly: Array<NativeInsights>;
  readonly ad_set_insights_daily: Array<NativeInsights>;
  readonly ad_set_insights_monthly: Array<NativeInsights>;
  readonly ads_insights: Array<AdInsights>;
  readonly ads_insights_age_gender: Array<AdInsightsAgeGender>;
  readonly ads_insights_country: Array<AdInsightsCountry>;
  readonly ads_insights_platform: Array<AdInsightsPlatform>;
};

import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, SchemaTransformation } from "effect";

import { amount, count, text, version } from "./shared";

// Each table shares its fields with the API shape, which also gives the
// requested `fields`. Breakdown fields come back without being asked for.

const ActionListSchema = Schema.Array(
  Schema.Struct({ action_type: Schema.String, value: Schema.FiniteFromString }),
);

/** `[{ action_type, value }]` as a map from action type to value. */
const actions = (description: string) =>
  Schema.optional(
    ActionListSchema.pipe(
      Schema.decodeTo(
        Schema.ReadonlyMap(Schema.String, Schema.Finite),
        SchemaTransformation.transform({
          decode: (list): ReadonlyMap<string, number> =>
            new Map(list.map((action) => [action.action_type, action.value])),
          encode: (map) => [...map].map(([action_type, value]) => ({ action_type, value })),
        }),
      ),
    ),
  ).pipe(Schema.annotateKey({ description }));

const ids = {
  account_id: Schema.String,
  campaign_id: Schema.optional(Schema.String),
  adset_id: Schema.optional(Schema.String),
  ad_id: Schema.String,
  date_start: Schema.String,
  account_currency: Schema.optional(Schema.String),
};

const metrics = {
  impressions: count("Times the ads were on screen."),
  // People, so it doesn't add up across rows or days.
  reach: count("People who saw the ads at least once."),
  clicks: count("Clicks of any kind."),
  inline_link_clicks: count("Clicks on links in the ad."),
  spend: amount("Amount spent, in the account currency."),
  actions: actions("Actions by action type, such as purchase."),
  action_values: actions("Value of actions by action type, in the account currency."),
};

const videoMetrics = {
  conversions: actions("Conversions by action type."),
  conversion_values: actions("Value of conversions by action type."),
  video_play_actions: actions("Video plays."),
  video_p25_watched_actions: actions("Video plays to 25%."),
  video_p50_watched_actions: actions("Video plays to 50%."),
  video_p75_watched_actions: actions("Video plays to 75%."),
  video_p100_watched_actions: actions("Video plays to the end."),
};

const common = {
  id: Schema.String.pipe(
    Schema.annotateKey({
      description: "JSON array of the account ID, ad ID, day, and breakdowns.",
    }),
  ),
  version,
  account_id: Schema.String.pipe(Schema.annotateKey({ description: "Ad account ID." })),
  campaign_id: text("Campaign ID."),
  adset_id: text("Ad set ID."),
  ad_id: Schema.String.pipe(Schema.annotateKey({ description: "Ad ID." })),
  date: Schema.String.pipe(
    Schema.annotateKey({ description: "Day in the ad account's time zone, as YYYY-MM-DD." }),
  ),
  account_currency: text("Currency of spend and values, the account's currency."),
};

const breakdown = (description: string) => Schema.String.pipe(Schema.annotateKey({ description }));

const ageGender = {
  age: breakdown("Age range, such as 25-34."),
  gender: breakdown("male, female, or unknown."),
};

const country = { country: breakdown("Two-letter country code.") };

const platform = {
  publisher_platform: breakdown("facebook, instagram, messenger, or audience_network."),
  platform_position: breakdown("Placement, such as feed or instagram_stories."),
};

export const AdInsightsApiSchema = Schema.Struct({ ...ids, ...metrics, ...videoMetrics });

export const AdInsightsSchema = Schema.Struct({ ...common, ...metrics, ...videoMetrics })
  .annotate({ description: "Facebook ad performance per ad and day." })
  .pipe(Iceberg.identifier("id"));

export type AdInsights = Schema.Schema.Type<typeof AdInsightsSchema>;

export const AdInsightsAgeGenderApiSchema = Schema.Struct({ ...ids, ...ageGender, ...metrics });

export const AdInsightsAgeGenderSchema = Schema.Struct({ ...common, ...ageGender, ...metrics })
  .annotate({ description: "Facebook ad performance per ad, day, age, and gender." })
  .pipe(Iceberg.identifier("id"));

export type AdInsightsAgeGender = Schema.Schema.Type<typeof AdInsightsAgeGenderSchema>;

export const AdInsightsCountryApiSchema = Schema.Struct({ ...ids, ...country, ...metrics });

export const AdInsightsCountrySchema = Schema.Struct({ ...common, ...country, ...metrics })
  .annotate({ description: "Facebook ad performance per ad, day, and country." })
  .pipe(Iceberg.identifier("id"));

export type AdInsightsCountry = Schema.Schema.Type<typeof AdInsightsCountrySchema>;

export const AdInsightsPlatformApiSchema = Schema.Struct({ ...ids, ...platform, ...metrics });

export const AdInsightsPlatformSchema = Schema.Struct({ ...common, ...platform, ...metrics })
  .annotate({ description: "Facebook ad performance per ad, day, platform, and placement." })
  .pipe(Iceberg.identifier("id"));

export type AdInsightsPlatform = Schema.Schema.Type<typeof AdInsightsPlatformSchema>;

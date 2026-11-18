import * as Iceberg from "@useairfoil/connector-kit/iceberg";
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

const nativeMetrics = {
  impressions: count("Times the ads were on screen."),
  reach: count("People reached in this reporting period."),
  frequency: amount("Average impressions per person reached."),
  unique_clicks: count("People who clicked at least once in this period."),
  spend: amount("Amount spent in the account currency."),
};

const AttributionActions = Schema.optional(
  Schema.Array(
    Schema.Struct({
      action_type: Schema.String.pipe(Schema.annotateKey({ description: "Meta action type." })),
      value: Schema.optional(Schema.FiniteFromString).pipe(
        Schema.annotateKey({ description: "Action count or value." }),
      ),
      "1d_click": Schema.optional(Schema.FiniteFromString).pipe(
        Schema.annotateKey({ description: "Value attributed within one day of a click." }),
      ),
      "7d_click": Schema.optional(Schema.FiniteFromString).pipe(
        Schema.annotateKey({ description: "Value attributed within seven days of a click." }),
      ),
      "1d_view": Schema.optional(Schema.FiniteFromString).pipe(
        Schema.annotateKey({ description: "Value attributed within one day of a view." }),
      ),
    }),
  ),
);

const nativeActivity = {
  outbound_clicks: actions("Clicks that took people away from Meta."),
  unique_outbound_clicks: actions("People who clicked an external link."),
  video_p95_watched_actions: actions("Video plays to 95%."),
  video_thruplay_watched_actions: actions("Video plays that reached the ThruPlay threshold."),
  video_avg_time_watched_actions: actions("Average time watched in seconds."),
  actions: AttributionActions.pipe(
    Schema.annotateKey({ description: "Action counts by attribution window." }),
  ),
  action_values: AttributionActions.pipe(
    Schema.annotateKey({ description: "Action values by attribution window." }),
  ),
};

const nativeIds = {
  account_id: Schema.String.pipe(Schema.annotateKey({ description: "Meta ad account ID." })),
  account_currency: text("Currency of the spend amount."),
};

export const AccountInsightsApiSchema = Schema.Struct({
  ...nativeIds,
  ...nativeMetrics,
  ...nativeActivity,
  date_start: Schema.String,
  date_stop: Schema.String,
});
export const CampaignInsightsApiSchema = AccountInsightsApiSchema.mapFields((fields) => ({
  ...fields,
  campaign_id: Schema.String,
}));
export const AdSetInsightsApiSchema = CampaignInsightsApiSchema.mapFields((fields) => ({
  ...fields,
  adset_id: Schema.String,
}));

export const NativeInsightsSchema = Schema.Struct({
  id: Schema.String.pipe(
    Schema.annotateKey({ description: "Account, reporting entity, and period start." }),
  ),
  version,
  ...nativeIds,
  campaign_id: text("Campaign ID when the report is scoped to a campaign or ad set."),
  adset_id: text("Ad set ID when the report is scoped to an ad set."),
  date_start: Schema.String.pipe(
    Schema.annotateKey({ description: "First calendar day of the reporting period." }),
  ),
  date_stop: Schema.String.pipe(
    Schema.annotateKey({ description: "Last calendar day of the reporting period." }),
  ),
  ...nativeMetrics,
  ...nativeActivity,
})
  .annotate({
    description:
      "Reach, frequency, unique clicks, and spend at the requested Meta reporting level.",
  })
  .pipe(Iceberg.identifier("id"));
export type NativeInsights = typeof NativeInsightsSchema.Type;

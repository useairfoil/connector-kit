import { Iceberg } from "@useairfoil/connector-kit";
import { Schema } from "effect";

import { count, long, text, textList, time, version } from "./shared";

// Each table shares its fields with the API shape, which also gives the
// requested `fields`. Meta leaves out empty fields, so they are optional.

const objectId = (object: string) =>
  Schema.String.pipe(Schema.annotateKey({ description: `${object} ID.` }));

const adAccountFields = {
  name: text("Account name."),
  currency: text("Account currency, such as USD."),
  timezone_name: text("Account time zone. Insights days use it."),
  timezone_offset_hours_utc: Schema.optional(Schema.Finite).pipe(
    Schema.annotateKey({ description: "Hours from UTC, as a decimal." }),
  ),
  account_status: long("1 active, 2 disabled, 3 unsettled, 101 closed, and others."),
  disable_reason: long("Why the account is disabled. 0 when it isn't."),
  amount_spent: count("Total spent, in the currency's minor unit, such as cents."),
  spend_cap: count("Spending cap in minor units. 0 means none."),
  created_time: time("Time the account was created."),
};

/** `id` is `act_<account_id>`, so the row uses `account_id`. */
export const AdAccountApiSchema = Schema.Struct({
  account_id: Schema.String,
  ...adAccountFields,
});

export const AdAccountSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Ad account ID, without `act_`." })),
  version,
  ...adAccountFields,
})
  .annotate({ description: "Facebook ad accounts." })
  .pipe(Iceberg.identifier("id"));

export type AdAccount = Schema.Schema.Type<typeof AdAccountSchema>;

const campaignFields = {
  account_id: text("Ad account ID."),
  name: text("Campaign name."),
  objective: text("Campaign objective, such as OUTCOME_SALES."),
  status: text("Status set by the advertiser: ACTIVE, PAUSED, ARCHIVED, or DELETED."),
  effective_status: text("Status after parents and review, such as IN_PROCESS."),
  buying_type: text("AUCTION or RESERVED."),
  bid_strategy: text("Bid strategy, when the campaign holds the budget."),
  daily_budget: count("Daily budget in minor units, when the campaign holds it."),
  lifetime_budget: count("Lifetime budget in minor units, when the campaign holds it."),
  spend_cap: count("Spending cap in minor units."),
  special_ad_categories: textList("Special ad categories, such as HOUSING."),
  start_time: time("Start time."),
  stop_time: time("Stop time."),
  created_time: time("Time the campaign was created."),
  updated_time: time("Time the campaign was last updated."),
};

export const CampaignApiSchema = Schema.Struct({
  id: Schema.String,
  ...campaignFields,
});

export const CampaignSchema = Schema.Struct({
  id: objectId("Campaign"),
  version,
  ...campaignFields,
})
  .annotate({ description: "Facebook ad campaigns." })
  .pipe(Iceberg.identifier("id"));

export type Campaign = Schema.Schema.Type<typeof CampaignSchema>;

const adSetFields = {
  account_id: text("Ad account ID."),
  campaign_id: text("Campaign ID."),
  name: text("Ad set name."),
  status: text("Status set by the advertiser: ACTIVE, PAUSED, ARCHIVED, or DELETED."),
  effective_status: text("Status after parents and review, such as CAMPAIGN_PAUSED."),
  optimization_goal: text("What delivery optimizes for, such as LINK_CLICKS."),
  billing_event: text("What the advertiser pays for, such as IMPRESSIONS."),
  bid_strategy: text("Bid strategy."),
  bid_amount: long("Bid cap or target in minor units."),
  // Meta sends "0" for the budget kind the ad set doesn't use.
  daily_budget: count("Daily budget in minor units, when the ad set holds it."),
  lifetime_budget: count("Lifetime budget in minor units, when the ad set holds it."),
  budget_remaining: count("Budget left in minor units."),
  destination_type: text("Where the ads send people, such as WEBSITE."),
  start_time: time("Start time."),
  end_time: time("End time."),
  created_time: time("Time the ad set was created."),
  updated_time: time("Time the ad set was last updated."),
};

export const AdSetApiSchema = Schema.Struct({
  id: Schema.String,
  ...adSetFields,
});

export const AdSetSchema = Schema.Struct({
  id: objectId("Ad set"),
  version,
  ...adSetFields,
})
  .annotate({ description: "Facebook ad sets." })
  .pipe(Iceberg.identifier("id"));

export type AdSet = Schema.Schema.Type<typeof AdSetSchema>;

export const CreativeSchema = Schema.Struct({
  id: text("Creative ID."),
  name: text("Creative name."),
  title: text("Headline. Empty for some formats, such as catalog ads."),
  body: text("Main text."),
  call_to_action_type: text("Button, such as SHOP_NOW."),
  thumbnail_url: text("Thumbnail URL. Meta's URLs expire after a while."),
  image_url: text("Image URL."),
  object_type: text("Kind of creative, such as SHARE or VIDEO."),
  object_story_id: text("ID of the page post the ad uses."),
  link_url: text("Link the ad points to."),
  url_tags: text("Query string added to the link."),
});

const adFields = {
  account_id: text("Ad account ID."),
  campaign_id: text("Campaign ID."),
  adset_id: text("Ad set ID."),
  name: text("Ad name."),
  status: text("Status set by the advertiser: ACTIVE, PAUSED, ARCHIVED, or DELETED."),
  effective_status: text("Status after parents and review, such as DISAPPROVED."),
  created_time: time("Time the ad was created."),
  updated_time: time("Time the ad was last updated."),
  creative: Schema.optional(CreativeSchema).pipe(
    Schema.annotateKey({ description: "The ad's creative." }),
  ),
};

export const AdApiSchema = Schema.Struct({ id: Schema.String, ...adFields });

export const AdSchema = Schema.Struct({
  id: objectId("Ad"),
  version,
  ...adFields,
})
  .annotate({ description: "Facebook ads, with their creative." })
  .pipe(Iceberg.identifier("id"));

export type Ad = Schema.Schema.Type<typeof AdSchema>;

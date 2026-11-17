import type { Demo } from "@useairfoil/connector-kit";

import type { Ad, AdAccount, AdSet, Campaign } from "../schemas/objects";

import {
  accounts,
  adId,
  adSetId,
  audiences,
  campaignId,
  campaigns,
  day,
  formats,
  historyDays,
  runs,
} from "./shared";

/** The ad accounts with their campaigns, ad sets, and ads, written once. */
export const setupRows = ({ faker, now }: Demo.DemoContext) => {
  const setup = new Date(now.getTime() - (historyDays + 30) * day);

  const adAccounts: Array<AdAccount> = accounts.map((account) => ({
    id: account.id,
    version: now,
    name: account.name,
    currency: account.currency,
    timezone_name: account.timezone,
    timezone_offset_hours_utc: account.offset,
    account_status: 1n,
    disable_reason: 0n,
    amount_spent: BigInt(faker.number.int({ min: 5_000_000, max: 20_000_000 })),
    spend_cap: 0n,
    created_time: setup,
  }));

  const campaignRows: Array<Campaign> = [];
  const adSets: Array<AdSet> = [];
  const ads: Array<Ad> = [];

  for (const run of runs(now)) {
    const account = accounts[run.account] ?? accounts[0];
    const [name, objective, budget] = campaigns[run.campaign] ?? campaigns[0];
    const status = run.stopped ? "PAUSED" : "ACTIVE";

    campaignRows.push({
      id: campaignId(run.account, run.campaign),
      version: now,
      account_id: account.id,
      name: `${account.name} - ${name}`,
      objective,
      status,
      effective_status: status,
      buying_type: "AUCTION",
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      daily_budget: BigInt(budget),
      special_ad_categories: [],
      start_time: run.started,
      ...(run.stopped ? { stop_time: run.stopped } : {}),
      created_time: run.started,
      updated_time: run.stopped ?? run.started,
    });

    audiences.forEach((audience, s) => {
      adSets.push({
        id: adSetId(run.account, run.campaign, s),
        version: now,
        account_id: account.id,
        campaign_id: campaignId(run.account, run.campaign),
        name: audience,
        status,
        effective_status: run.stopped ? "CAMPAIGN_PAUSED" : "ACTIVE",
        optimization_goal: objective === "OUTCOME_AWARENESS" ? "REACH" : "OFFSITE_CONVERSIONS",
        billing_event: "IMPRESSIONS",
        bid_strategy: "LOWEST_COST_WITHOUT_CAP",
        destination_type: "WEBSITE",
        start_time: run.started,
        created_time: run.started,
        updated_time: run.stopped ?? run.started,
      });

      formats.forEach((format, f) => {
        const url = `https://shop.acme.example.com/?utm_source=facebook&utm_campaign=${run.campaign}`;

        ads.push({
          id: adId(run.account, run.campaign, s, f),
          version: now,
          account_id: account.id,
          campaign_id: campaignId(run.account, run.campaign),
          adset_id: adSetId(run.account, run.campaign, s),
          name: `${audience} - ${format.name}`,
          status,
          effective_status: run.stopped ? "CAMPAIGN_PAUSED" : "ACTIVE",
          created_time: run.started,
          updated_time: run.started,
          creative: {
            id: `1202400000${run.account}${String(run.campaign * 100 + s * 10 + f).padStart(7, "0")}`,
            name: `${name} ${format.name}`,
            title: faker.helpers.arrayElement([
              "New season, new gear",
              "Made to last",
              "Free shipping over $75",
            ]),
            body: "Everyday goods, made well. Shop the new collection.",
            call_to_action_type: format.cta,
            object_type: format.type,
            link_url: url,
            url_tags: `utm_source=facebook&utm_medium=paid_social&utm_campaign=${run.campaign}`,
          },
        });
      });
    });
  }

  return {
    ad_accounts: adAccounts,
    campaigns: campaignRows,
    ad_sets: adSets,
    ads,
    ad_activities: campaignRows.flatMap(({ id, account_id, name, created_time }) =>
      account_id && created_time
        ? [
            {
              id: `activity_${id}`,
              account_id,
              object_id: id,
              object_type: "campaign",
              object_name: name,
              event_type: "create_campaign_group",
              event_time: created_time,
              version: now,
            },
          ]
        : [],
    ),
    ad_creatives: ads.flatMap(({ creative, account_id }) =>
      creative?.id ? [{ ...creative, id: creative.id, account_id, version: now }] : [],
    ),
    custom_audiences: adAccounts.map(({ id }) => ({
      id: `audience_${id}`,
      account_id: id,
      name: "Recent purchasers",
      subtype: "CUSTOM",
      retention_days: 30n,
      approximate_count_lower_bound: 500n,
      approximate_count_upper_bound: 1000n,
      version: now,
    })),
    custom_conversions: adAccounts.map(({ id }) => ({
      id: `conversion_${id}`,
      account_id: id,
      name: "Store purchase",
      custom_event_type: "PURCHASE",
      event_source_type: "website",
      is_archived: false,
      version: now,
    })),
  };
};

import { Connector, Resource } from "@useairfoil/connector-kit";
import { Config, Context, Effect, Layer } from "effect";

import type { FacebookAdsConfig } from "./manifest";

import * as FacebookAdsClient from "./client/client";
import { makeTimeZones, parseAccounts } from "./resources/accounts";
import { insightsEntity } from "./resources/insights/resource";
import {
  adInsights,
  accountDaily,
  accountMonthly,
  campaignDaily,
  campaignMonthly,
  adSetDaily,
  adSetMonthly,
  adInsightsAgeGender,
  adInsightsCountry,
  adInsightsPlatform,
} from "./resources/insights/specs";
import {
  adAccountsResource,
  adActivities,
  adCreatives,
  ads,
  adSets,
  campaigns,
  customAudiences,
  customConversions,
  listSources,
} from "./resources/objects";
import {
  AdActivitySchema,
  AdCreativeSchema,
  AdSchema,
  AdSetSchema,
  CampaignSchema,
  CustomAudienceSchema,
  CustomConversionSchema,
} from "./schemas/objects";
export { FacebookAdsConfigDef, manifest } from "./manifest";
export type { FacebookAdsConfig } from "./manifest";

export const make = Effect.fnUntraced(function* (config: FacebookAdsConfig) {
  const client = yield* FacebookAdsClient.FacebookAdsClient;
  const accounts = yield* parseAccounts(config.adAccountIds);
  const insights = { client, config, accounts, timeZoneOf: yield* makeTimeZones(client, accounts) };

  return Connector.define({
    name: "producer-facebook-ads",
    title: "Facebook Ads",
    resources: [
      Resource.entity(adAccountsResource(client, accounts)),
      Resource.entity({
        name: campaigns.name,
        rowSchema: CampaignSchema,
        version: "version",
        ...listSources(client, accounts, campaigns),
      }),
      Resource.entity({
        name: adSets.name,
        rowSchema: AdSetSchema,
        version: "version",
        ...listSources(client, accounts, adSets),
      }),
      Resource.entity({
        name: ads.name,
        rowSchema: AdSchema,
        version: "version",
        ...listSources(client, accounts, ads),
      }),
      Resource.entity(insightsEntity(insights, adInsights)),
      Resource.entity(insightsEntity(insights, adInsightsAgeGender)),
      Resource.entity(insightsEntity(insights, adInsightsCountry)),
      Resource.entity(insightsEntity(insights, adInsightsPlatform)),
      Resource.entity(insightsEntity(insights, accountDaily)),
      Resource.entity(insightsEntity(insights, accountMonthly)),
      Resource.entity(insightsEntity(insights, campaignDaily)),
      Resource.entity(insightsEntity(insights, campaignMonthly)),
      Resource.entity(insightsEntity(insights, adSetDaily)),
      Resource.entity(insightsEntity(insights, adSetMonthly)),
      Resource.entity({
        name: adActivities.name,
        rowSchema: AdActivitySchema,
        version: "version",
        ...listSources(client, accounts, adActivities),
      }),
      Resource.entity({
        name: adCreatives.name,
        rowSchema: AdCreativeSchema,
        version: "version",
        ...listSources(client, accounts, adCreatives),
      }),
      Resource.entity({
        name: customAudiences.name,
        rowSchema: CustomAudienceSchema,
        version: "version",
        ...listSources(client, accounts, customAudiences),
      }),
      Resource.entity({
        name: customConversions.name,
        rowSchema: CustomConversionSchema,
        version: "version",
        ...listSources(client, accounts, customConversions),
      }),
    ],
  });
});

export type FacebookAdsConnectorRuntime = Effect.Success<ReturnType<typeof make>>;

export class FacebookAdsConnector extends Context.Service<
  FacebookAdsConnector,
  FacebookAdsConnectorRuntime
>()("@useairfoil/producer-facebook-ads/FacebookAdsConnector") {}

export const layer = (config: FacebookAdsConfig) =>
  Layer.effect(FacebookAdsConnector)(
    make(config).pipe(Effect.annotateLogs({ component: "facebook-ads" })),
  ).pipe(Layer.provide(FacebookAdsClient.layer(config)));

export const layerConfig = (config: Config.Wrap<FacebookAdsConfig>) =>
  Layer.unwrap(Config.unwrap(config).pipe(Effect.map(layer)));

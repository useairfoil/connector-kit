import { Connector, Resource } from "@useairfoil/connector-kit";
import { Config, Context, Effect, Layer } from "effect";

import type { GoogleAnalyticsConfig } from "./manifest";

import * as GoogleAnalyticsClient from "./client/client";
import { reportEntity } from "./resources/reports/resource";
import {
  cohortRetention,
  dailyOverview,
  devices,
  ecommerceItems,
  events,
  landingPages,
  locations,
  pages,
  paidCampaigns,
  streamScreens,
  trafficSources,
  transactions,
  userAcquisition,
} from "./resources/reports/specs";
export { GoogleAnalyticsConfigDef, manifest } from "./manifest";
export type { GoogleAnalyticsConfig } from "./manifest";

export const make = Effect.fnUntraced(function* (config: GoogleAnalyticsConfig) {
  const client = yield* GoogleAnalyticsClient.GoogleAnalyticsClient;

  return Connector.define({
    name: "producer-google-analytics",
    title: "Google Analytics",
    resources: [
      Resource.entity(reportEntity(client, config, dailyOverview)),
      Resource.entity(reportEntity(client, config, trafficSources)),
      Resource.entity(reportEntity(client, config, userAcquisition)),
      Resource.entity(reportEntity(client, config, pages)),
      Resource.entity(reportEntity(client, config, landingPages)),
      Resource.entity(reportEntity(client, config, events)),
      Resource.entity(reportEntity(client, config, locations)),
      Resource.entity(reportEntity(client, config, devices)),
      Resource.entity(reportEntity(client, config, ecommerceItems)),
      Resource.entity(reportEntity(client, config, transactions)),
      Resource.entity(reportEntity(client, config, paidCampaigns)),
      Resource.entity(reportEntity(client, config, streamScreens)),
      Resource.entity(reportEntity(client, config, cohortRetention)),
    ],
  });
});

export type GoogleAnalyticsConnectorRuntime = Effect.Success<ReturnType<typeof make>>;

export class GoogleAnalyticsConnector extends Context.Service<
  GoogleAnalyticsConnector,
  GoogleAnalyticsConnectorRuntime
>()("@useairfoil/producer-google-analytics/GoogleAnalyticsConnector") {}

export const layer = (config: GoogleAnalyticsConfig) =>
  Layer.effect(GoogleAnalyticsConnector)(
    make(config).pipe(Effect.annotateLogs({ component: "google-analytics" })),
  ).pipe(Layer.provide(GoogleAnalyticsClient.layer(config)));

export const layerConfig = (config: Config.Wrap<GoogleAnalyticsConfig>) =>
  Layer.unwrap(Config.unwrap(config).pipe(Effect.map(layer)));

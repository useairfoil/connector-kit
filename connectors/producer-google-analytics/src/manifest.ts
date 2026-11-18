import * as Iceberg from "@useairfoil/connector-kit/iceberg";
import * as Manifest from "@useairfoil/connector-kit/manifest";

import { tableSchemas } from "./tables";

export const GoogleAnalyticsConfigDef = Manifest.defineConfig({
  propertyId: Manifest.string({
    runtimeKey: "GA_PROPERTY_ID",
    description: "Numeric ID of the GA4 property, from Admin > Property details.",
  }),
  clientEmail: Manifest.string({
    runtimeKey: "GA_CLIENT_EMAIL",
    description: "`client_email` from the service account's JSON key.",
  }),
  privateKey: Manifest.secret({
    runtimeKey: "GA_PRIVATE_KEY",
    description: "`private_key` from the service account's JSON key.",
  }),
  startDate: Manifest.optional(
    Manifest.string({
      runtimeKey: "GA_START_DATE",
      description: "First day to backfill, as YYYY-MM-DD. Defaults to 2 years back.",
    }),
  ),
  lookbackDays: Manifest.number({
    runtimeKey: "GA_LOOKBACK_DAYS",
    description: "Days read again on each run, since Google keeps updating recent data.",
    integer: true,
    minimum: 1,
    default: 14,
  }),
});

export type GoogleAnalyticsConfig = Manifest.ConfigValuesOf<typeof GoogleAnalyticsConfigDef>;

const capabilities = ["backfill", "changes"] as const;

export const manifest = Manifest.define({
  name: "producer-google-analytics",
  title: "Google Analytics",
  config: GoogleAnalyticsConfigDef.spec,
  resources: [
    {
      name: "daily_overview",
      description: Iceberg.resolveDescription(tableSchemas.daily_overview),
      capabilities,
    },
    {
      name: "traffic_sources",
      description: Iceberg.resolveDescription(tableSchemas.traffic_sources),
      capabilities,
    },
    {
      name: "user_acquisition",
      description: Iceberg.resolveDescription(tableSchemas.user_acquisition),
      capabilities,
    },
    {
      name: "pages",
      description: Iceberg.resolveDescription(tableSchemas.pages),
      capabilities,
    },
    {
      name: "landing_pages",
      description: Iceberg.resolveDescription(tableSchemas.landing_pages),
      capabilities,
    },
    {
      name: "events",
      description: Iceberg.resolveDescription(tableSchemas.events),
      capabilities,
    },
    {
      name: "locations",
      description: Iceberg.resolveDescription(tableSchemas.locations),
      capabilities,
    },
    {
      name: "devices",
      description: Iceberg.resolveDescription(tableSchemas.devices),
      capabilities,
    },
    {
      name: "ecommerce_items",
      description: Iceberg.resolveDescription(tableSchemas.ecommerce_items),
      capabilities,
    },
    {
      name: "transactions",
      description: Iceberg.resolveDescription(tableSchemas.transactions),
      capabilities,
    },
    {
      name: "paid_campaigns",
      description: Iceberg.resolveDescription(tableSchemas.paid_campaigns),
      capabilities,
    },
    {
      name: "stream_screens",
      description: Iceberg.resolveDescription(tableSchemas.stream_screens),
      capabilities,
    },
    {
      name: "cohort_retention",
      description: Iceberg.resolveDescription(tableSchemas.cohort_retention),
      capabilities,
    },
  ],
});

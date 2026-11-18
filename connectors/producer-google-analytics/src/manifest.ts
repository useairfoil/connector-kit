import * as Manifest from "@useairfoil/connector-kit/manifest";

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
    { name: "daily_overview", capabilities },
    { name: "traffic_sources", capabilities },
    { name: "user_acquisition", capabilities },
    { name: "pages", capabilities },
    { name: "landing_pages", capabilities },
    { name: "events", capabilities },
    { name: "locations", capabilities },
    { name: "devices", capabilities },
    { name: "ecommerce_items", capabilities },
    { name: "transactions", capabilities },
    { name: "paid_campaigns", capabilities },
    { name: "stream_screens", capabilities },
    { name: "cohort_retention", capabilities },
  ],
});

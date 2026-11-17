import { ConnectorApp, Demo, RuntimeConfig } from "@useairfoil/connector-kit";
import { Command } from "effect/cli";

import {
  CohortRetentionSchema,
  DailyOverviewSchema,
  DeviceSchema,
  EcommerceItemSchema,
  EventSchema,
  LandingPageSchema,
  LocationSchema,
  PageSchema,
  PaidCampaignSchema,
  StreamScreenSchema,
  TrafficSourceSchema,
  TransactionSchema,
  UserAcquisitionSchema,
} from "../schemas/reports";
import { dayRows } from "./reports";

export const demo = Demo.define({
  name: "producer-google-analytics",
  setup: { tables: [], rows: () => ({}) },
  group: {
    tables: [
      Demo.table({ name: "daily_overview", rowSchema: DailyOverviewSchema, version: "version" }),
      Demo.table({ name: "traffic_sources", rowSchema: TrafficSourceSchema, version: "version" }),
      Demo.table({
        name: "user_acquisition",
        rowSchema: UserAcquisitionSchema,
        version: "version",
      }),
      Demo.table({ name: "pages", rowSchema: PageSchema, version: "version" }),
      Demo.table({ name: "landing_pages", rowSchema: LandingPageSchema, version: "version" }),
      Demo.table({ name: "events", rowSchema: EventSchema, version: "version" }),
      Demo.table({ name: "locations", rowSchema: LocationSchema, version: "version" }),
      Demo.table({ name: "devices", rowSchema: DeviceSchema, version: "version" }),
      Demo.table({ name: "ecommerce_items", rowSchema: EcommerceItemSchema, version: "version" }),
      Demo.table({ name: "transactions", rowSchema: TransactionSchema, version: "version" }),
      Demo.table({ name: "paid_campaigns", rowSchema: PaidCampaignSchema, version: "version" }),
      Demo.table({
        name: "cohort_retention",
        rowSchema: CohortRetentionSchema,
        version: "version",
      }),
      Demo.table({ name: "stream_screens", rowSchema: StreamScreenSchema, version: "version" }),
    ],
    rows: dayRows,
    // Two years of days, the same as the default GA_START_DATE.
    count: 730,
  },
});

export const demoCommand = ConnectorApp.makeDemoCommand(demo).pipe(
  Command.provide(RuntimeConfig.layerHosted()),
);

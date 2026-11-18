import * as Iceberg from "@useairfoil/connector-kit/iceberg";
import { Schema, Struct } from "effect";

import { UnixTime, version } from "./shared";

export const BillingMeterSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Billing meter ID." })),
  version,
  created: UnixTime.pipe(Schema.annotateKey({ description: "Time when the meter was created." })),
  display_name: Schema.String.pipe(Schema.annotateKey({ description: "Meter name." })),
  event_name: Schema.String.pipe(
    Schema.annotateKey({ description: "Event name used for metering." }),
  ),
  status: Schema.String.pipe(Schema.annotateKey({ description: "Status: active or inactive." })),
  updated: UnixTime.pipe(Schema.annotateKey({ description: "Time when the meter was updated." })),
  default_aggregation: Schema.Struct({
    formula: Schema.String.pipe(
      Schema.annotateKey({ description: "Aggregation formula: sum, count, or last." }),
    ),
  }).pipe(Schema.annotateKey({ description: "How Stripe aggregates the meter events." })),
})
  .annotate({ description: "Meter definitions for usage billing." })
  .pipe(Iceberg.identifier("id"));

export type BillingMeter = Schema.Schema.Type<typeof BillingMeterSchema>;

export const BillingMeterObjectSchema = BillingMeterSchema.mapFields(Struct.omit(["version"]));

export type BillingMeterObject = Schema.Schema.Type<typeof BillingMeterObjectSchema>;

import { Resource } from "@useairfoil/connector-kit";
import { Effect } from "effect";

import type { StripeClientService } from "../client/client";

import {
  type BillingMeterObject,
  BillingMeterObjectSchema,
  BillingMeterSchema,
} from "../schemas/billing-meters";
import { webhookEvents } from "../webhook/events";
import { type StripeResourceSpec, backfillPages, checkResource, eventWebhook } from "./shared";

export const billingMeterSpec: StripeResourceSpec<BillingMeterObject, BillingMeterObject> = {
  path: "billing/meters",
  objectSchema: BillingMeterObjectSchema,
  toRow: Effect.succeed,
  eventTypes: webhookEvents.billing_meters,
  deleteEventTypes: [],
  // The meters list has no `created` filter and rejects unknown params.
  createdFilter: false,
};

export const makeBillingMeters = (client: StripeClientService) =>
  Resource.entity({
    name: "billing_meters",
    rowSchema: BillingMeterSchema,
    version: "version",

    check: checkResource(client, billingMeterSpec),
    backfill: backfillPages(client, billingMeterSpec),
    webhook: eventWebhook(client, billingMeterSpec),
  });

import { Resource } from "@useairfoil/connector-kit";
import { Effect } from "effect";

import type { StripeClientService } from "../client/client";

import { type CustomerObject, CustomerObjectSchema, CustomerSchema } from "../schemas/customers";
import { webhookEvents } from "../webhook/events";
import { type StripeResourceSpec, backfillPages, checkResource, eventWebhook } from "./shared";

export const customerSpec: StripeResourceSpec<CustomerObject, CustomerObject> = {
  path: "customers",
  objectSchema: CustomerObjectSchema,
  toRow: Effect.succeed,
  eventTypes: webhookEvents.customers,
  deleteEventTypes: ["customer.deleted"],
};

export const makeCustomers = (client: StripeClientService) =>
  Resource.entity({
    name: "customers",
    rowSchema: CustomerSchema,
    version: "version",

    check: checkResource(client, customerSpec),
    backfill: backfillPages(client, customerSpec),
    webhook: eventWebhook(client, customerSpec),
  });

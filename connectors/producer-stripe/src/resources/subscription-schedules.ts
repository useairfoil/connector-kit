import { Resource } from "@useairfoil/connector-kit";
import { Effect } from "effect";

import type { StripeClientService } from "../client/client";

import {
  type SubscriptionScheduleObject,
  SubscriptionScheduleObjectSchema,
  SubscriptionScheduleSchema,
} from "../schemas/subscription-schedules";
import { webhookEvents } from "../webhook/events";
import { type StripeResourceSpec, backfillPages, checkResource, eventWebhook } from "./shared";

export const subscriptionScheduleSpec: StripeResourceSpec<
  SubscriptionScheduleObject,
  SubscriptionScheduleObject
> = {
  path: "subscription_schedules",
  objectSchema: SubscriptionScheduleObjectSchema,
  toRow: Effect.succeed,
  eventTypes: webhookEvents.subscription_schedules,
  deleteEventTypes: [],
};

export const makeSubscriptionSchedules = (client: StripeClientService) =>
  Resource.entity({
    name: "subscription_schedules",
    rowSchema: SubscriptionScheduleSchema,
    version: "version",

    check: checkResource(client, subscriptionScheduleSpec),
    backfill: backfillPages(client, subscriptionScheduleSpec),
    webhook: eventWebhook(client, subscriptionScheduleSpec),
  });

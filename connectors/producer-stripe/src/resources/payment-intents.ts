import { Resource } from "@useairfoil/connector-kit";
import { Effect } from "effect";

import type { StripeClientService } from "../client/client";

import {
  type PaymentIntentObject,
  PaymentIntentObjectSchema,
  PaymentIntentSchema,
} from "../schemas/payment-intents";
import { webhookEvents } from "../webhook/events";
import { type StripeResourceSpec, backfillPages, checkResource, eventWebhook } from "./shared";

export const paymentIntentSpec: StripeResourceSpec<PaymentIntentObject, PaymentIntentObject> = {
  path: "payment_intents",
  objectSchema: PaymentIntentObjectSchema,
  toRow: Effect.succeed,
  eventTypes: webhookEvents.payment_intents,
  deleteEventTypes: [],
};

export const makePaymentIntents = (client: StripeClientService) =>
  Resource.entity({
    name: "payment_intents",
    rowSchema: PaymentIntentSchema,
    version: "version",

    check: checkResource(client, paymentIntentSpec),
    backfill: backfillPages(client, paymentIntentSpec),
    webhook: eventWebhook(client, paymentIntentSpec),
  });

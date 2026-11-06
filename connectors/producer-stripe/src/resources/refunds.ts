import { Resource } from "@useairfoil/connector-kit";
import { Effect } from "effect";

import type { StripeClientService } from "../client/client";

import { type RefundObject, RefundObjectSchema, RefundSchema } from "../schemas/refunds";
import { webhookEvents } from "../webhook/events";
import { type StripeResourceSpec, backfillPages, checkResource, eventWebhook } from "./shared";

export const refundSpec: StripeResourceSpec<RefundObject, RefundObject> = {
  path: "refunds",
  objectSchema: RefundObjectSchema,
  toRow: Effect.succeed,
  eventTypes: webhookEvents.refunds,
  deleteEventTypes: [],
};

export const makeRefunds = (client: StripeClientService) =>
  Resource.entity({
    name: "refunds",
    rowSchema: RefundSchema,
    version: "version",

    check: checkResource(client, refundSpec),
    backfill: backfillPages(client, refundSpec),
    webhook: eventWebhook(client, refundSpec),
  });

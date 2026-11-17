import { Resource } from "@useairfoil/connector-kit";
import { Effect } from "effect";

import type { StripeClientService } from "../client/client";

import {
  type PromotionCodeObject,
  PromotionCodeObjectSchema,
  PromotionCodeSchema,
} from "../schemas/promotion-codes";
import { webhookEvents } from "../webhook/events";
import { type StripeResourceSpec, backfillPages, checkResource, eventWebhook } from "./shared";

export const promotionCodeSpec: StripeResourceSpec<PromotionCodeObject, PromotionCodeObject> = {
  path: "promotion_codes",
  objectSchema: PromotionCodeObjectSchema,
  toRow: Effect.succeed,
  eventTypes: webhookEvents.promotion_codes,
  deleteEventTypes: [],
};

export const makePromotionCodes = (client: StripeClientService) =>
  Resource.entity({
    name: "promotion_codes",
    rowSchema: PromotionCodeSchema,
    version: "version",

    check: checkResource(client, promotionCodeSpec),
    backfill: backfillPages(client, promotionCodeSpec),
    webhook: eventWebhook(client, promotionCodeSpec),
  });

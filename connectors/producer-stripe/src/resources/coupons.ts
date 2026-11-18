import { Resource } from "@useairfoil/connector-kit";
import { Effect } from "effect";

import type { StripeClientService } from "../client/client";

import { type CouponObject, CouponObjectSchema, CouponSchema } from "../schemas/coupons";
import { webhookEvents } from "../webhook/events";
import { type StripeResourceSpec, backfillPages, checkResource, eventWebhook } from "./shared";

export const couponSpec: StripeResourceSpec<CouponObject, CouponObject> = {
  path: "coupons",
  objectSchema: CouponObjectSchema,
  toRow: Effect.succeed,
  eventTypes: webhookEvents.coupons,
  deleteEventTypes: ["coupon.deleted"],
};

export const makeCoupons = (client: StripeClientService) =>
  Resource.entity({
    name: "coupons",
    rowSchema: CouponSchema,
    version: "version",

    check: checkResource(client, couponSpec),
    backfill: backfillPages(client, couponSpec),
    webhook: eventWebhook(client, couponSpec),
  });

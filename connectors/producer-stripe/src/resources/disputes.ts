import { Resource } from "@useairfoil/connector-kit";
import { Effect } from "effect";

import type { StripeClientService } from "../client/client";

import { type DisputeObject, DisputeObjectSchema, DisputeSchema } from "../schemas/disputes";
import { webhookEvents } from "../webhook/events";
import { type StripeResourceSpec, backfillPages, checkResource, eventWebhook } from "./shared";

export const disputeSpec: StripeResourceSpec<DisputeObject, DisputeObject> = {
  path: "disputes",
  objectSchema: DisputeObjectSchema,
  toRow: Effect.succeed,
  eventTypes: webhookEvents.disputes,
  deleteEventTypes: [],
};

export const makeDisputes = (client: StripeClientService) =>
  Resource.entity({
    name: "disputes",
    rowSchema: DisputeSchema,
    version: "version",

    check: checkResource(client, disputeSpec),
    backfill: backfillPages(client, disputeSpec),
    webhook: eventWebhook(client, disputeSpec),
  });

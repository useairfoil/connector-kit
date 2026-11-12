import { Resource } from "@useairfoil/connector-kit";
import { Effect } from "effect";

import type { StripeClientService } from "../client/client";

import { type ProductObject, ProductObjectSchema, ProductSchema } from "../schemas/products";
import { webhookEvents } from "../webhook/events";
import { type StripeResourceSpec, backfillPages, checkResource, eventWebhook } from "./shared";

export const productSpec: StripeResourceSpec<ProductObject, ProductObject> = {
  path: "products",
  objectSchema: ProductObjectSchema,
  toRow: Effect.succeed,
  eventTypes: webhookEvents.products,
  deleteEventTypes: ["product.deleted"],
};

export const makeProducts = (client: StripeClientService) =>
  Resource.entity({
    name: "products",
    rowSchema: ProductSchema,
    version: "version",

    check: checkResource(client, productSpec),
    backfill: backfillPages(client, productSpec),
    webhook: eventWebhook(client, productSpec),
  });

import { Resource } from "@useairfoil/connector-kit";
import { Effect } from "effect";

import type { StripeClientService } from "../client/client";

import {
  CheckoutLineItemSchema,
  type CheckoutSessionObject,
  CheckoutSessionObjectSchema,
  type CheckoutSessionRow,
  CheckoutSessionSchema,
} from "../schemas/checkout-sessions";
import { webhookEvents } from "../webhook/events";
import {
  type StripeResourceSpec,
  backfillPages,
  checkResource,
  eventWebhook,
  listAll,
} from "./shared";

export const makeCheckoutSessionSpec = (
  client: StripeClientService,
): StripeResourceSpec<CheckoutSessionObject, CheckoutSessionRow> => ({
  path: "checkout/sessions",
  objectSchema: CheckoutSessionObjectSchema,
  // Sessions don't embed their line items.
  toRow: (session) =>
    listAll(client, CheckoutLineItemSchema, `checkout/sessions/${session.id}/line_items`, []).pipe(
      Effect.map((line_items) => ({ ...session, line_items })),
    ),
  eventTypes: webhookEvents.checkout_sessions,
  deleteEventTypes: [],
});

export const makeCheckoutSessions = (
  client: StripeClientService,
  spec: StripeResourceSpec<CheckoutSessionObject, CheckoutSessionRow>,
) =>
  Resource.entity({
    name: "checkout_sessions",
    rowSchema: CheckoutSessionSchema,
    version: "version",

    check: checkResource(client, spec),
    backfill: backfillPages(client, spec),
    webhook: eventWebhook(client, spec),
  });

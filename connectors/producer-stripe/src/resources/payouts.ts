import { Resource } from "@useairfoil/connector-kit";
import { Effect } from "effect";

import type { StripeClientService } from "../client/client";

import { BalanceTransactionObjectSchema } from "../schemas/balance-transactions";
import {
  type PayoutObject,
  PayoutObjectSchema,
  type PayoutRow,
  PayoutSchema,
} from "../schemas/payouts";
import { webhookEvents } from "../webhook/events";
import {
  type StripeResourceSpec,
  backfillPages,
  checkResource,
  eventWebhook,
  listAll,
} from "./shared";

export const makePayoutSpec = (
  client: StripeClientService,
): StripeResourceSpec<PayoutObject, PayoutRow> => ({
  path: "payouts",
  objectSchema: PayoutObjectSchema,
  // Balance transactions don't name their payout. Stripe lists them by payout
  // only for completed automatic payouts.
  toRow: (payout) =>
    payout.automatic && payout.reconciliation_status === "completed"
      ? listAll(client, BalanceTransactionObjectSchema, "balance_transactions", [
          ["payout", payout.id],
        ]).pipe(
          Effect.map((items) => ({
            ...payout,
            balance_transaction_ids: items.map(({ id }) => id),
          })),
        )
      : Effect.succeed(payout),
  eventTypes: webhookEvents.payouts,
  deleteEventTypes: [],
});

export const makePayouts = (
  client: StripeClientService,
  spec: StripeResourceSpec<PayoutObject, PayoutRow>,
) =>
  Resource.entity({
    name: "payouts",
    rowSchema: PayoutSchema,
    version: "version",

    // Payouts also read balance transactions, which need Balance access.
    check: checkResource(client, spec).pipe(
      Effect.andThen(
        client.list(BalanceTransactionObjectSchema, "balance_transactions", [["limit", "1"]]),
      ),
      Effect.asVoid,
    ),
    backfill: backfillPages(client, spec),
    webhook: eventWebhook(client, spec),
  });

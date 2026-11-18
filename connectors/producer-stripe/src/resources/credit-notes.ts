import { Resource } from "@useairfoil/connector-kit";
import { Effect } from "effect";

import type { StripeClientService } from "../client/client";

import {
  type CreditNoteObject,
  CreditNoteLineSchema,
  CreditNoteObjectSchema,
  type CreditNoteRow,
  CreditNoteSchema,
} from "../schemas/credit-notes";
import { webhookEvents } from "../webhook/events";
import {
  type StripeResourceSpec,
  backfillPages,
  checkResource,
  eventWebhook,
  listAll,
} from "./shared";

export const makeCreditNoteSpec = (
  client: StripeClientService,
): StripeResourceSpec<CreditNoteObject, CreditNoteRow> => ({
  path: "credit_notes",
  objectSchema: CreditNoteObjectSchema,
  // Stripe embeds only the first page of lines.
  toRow: (creditNote) =>
    (creditNote.lines.has_more
      ? listAll(client, CreditNoteLineSchema, `credit_notes/${creditNote.id}/lines`, [])
      : Effect.succeed(creditNote.lines.data)
    ).pipe(Effect.map((lines) => ({ ...creditNote, lines }))),
  eventTypes: webhookEvents.credit_notes,
  deleteEventTypes: [],
});

export const makeCreditNotes = (
  client: StripeClientService,
  spec: StripeResourceSpec<CreditNoteObject, CreditNoteRow>,
) =>
  Resource.entity({
    name: "credit_notes",
    rowSchema: CreditNoteSchema,
    version: "version",

    check: checkResource(client, spec),
    backfill: backfillPages(client, spec),
    webhook: eventWebhook(client, spec),
  });

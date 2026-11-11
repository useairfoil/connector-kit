import { Resource } from "@useairfoil/connector-kit";
import { Effect } from "effect";

import type { StripeClientService } from "../client/client";

import {
  type Invoice,
  InvoiceLineSchema,
  type InvoiceObject,
  InvoiceObjectSchema,
  InvoiceSchema,
} from "../schemas/invoices";
import { webhookEvents } from "../webhook/events";
import {
  type StripeResourceSpec,
  backfillPages,
  checkResource,
  eventWebhook,
  listAll,
} from "./shared";

export const makeInvoiceSpec = (
  client: StripeClientService,
): StripeResourceSpec<InvoiceObject, Omit<Invoice, "version" | "_deleted">> => ({
  path: "invoices",
  objectSchema: InvoiceObjectSchema,
  toRow: ({ lines, ...invoice }) =>
    (lines.has_more
      ? listAll(client, InvoiceLineSchema, `invoices/${invoice.id}/lines`, [])
      : Effect.succeed(lines.data)
    ).pipe(Effect.map((completeLines) => ({ ...invoice, lines: completeLines }))),
  eventTypes: webhookEvents.invoices,
  deleteEventTypes: ["invoice.deleted"],
});

export const makeInvoices = (
  client: StripeClientService,
  invoiceSpec: ReturnType<typeof makeInvoiceSpec>,
) =>
  Resource.entity({
    name: "invoices",
    rowSchema: InvoiceSchema,
    version: "version",

    check: checkResource(client, invoiceSpec),
    backfill: backfillPages(client, invoiceSpec),
    webhook: eventWebhook(client, invoiceSpec),
  });

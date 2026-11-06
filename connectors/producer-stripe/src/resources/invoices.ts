import { Resource } from "@useairfoil/connector-kit";
import { Effect } from "effect";

import type { StripeClientService } from "../client/client";

import { type InvoiceObject, InvoiceObjectSchema, InvoiceSchema } from "../schemas/invoices";
import { webhookEvents } from "../webhook/events";
import { type StripeResourceSpec, backfillPages, checkResource, eventWebhook } from "./shared";

export const invoiceSpec: StripeResourceSpec<InvoiceObject, InvoiceObject> = {
  path: "invoices",
  objectSchema: InvoiceObjectSchema,
  toRow: Effect.succeed,
  eventTypes: webhookEvents.invoices,
  deleteEventTypes: ["invoice.deleted"],
};

export const makeInvoices = (client: StripeClientService) =>
  Resource.entity({
    name: "invoices",
    rowSchema: InvoiceSchema,
    version: "version",

    check: checkResource(client, invoiceSpec),
    backfill: backfillPages(client, invoiceSpec),
    webhook: eventWebhook(client, invoiceSpec),
  });

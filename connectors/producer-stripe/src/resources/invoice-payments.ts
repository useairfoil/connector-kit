import { Resource } from "@useairfoil/connector-kit";
import { Effect } from "effect";

import type { StripeClientService } from "../client/client";

import {
  type InvoicePaymentObject,
  InvoicePaymentObjectSchema,
  InvoicePaymentSchema,
} from "../schemas/invoice-payments";
import { webhookEvents } from "../webhook/events";
import { type StripeResourceSpec, backfillPages, checkResource, eventWebhook } from "./shared";

export const invoicePaymentSpec: StripeResourceSpec<InvoicePaymentObject, InvoicePaymentObject> = {
  path: "invoice_payments",
  listParams: [["status", "paid"]],
  objectSchema: InvoicePaymentObjectSchema,
  toRow: Effect.succeed,
  eventTypes: webhookEvents.invoice_payments,
  deleteEventTypes: [],
};

export const makeInvoicePayments = (client: StripeClientService) =>
  Resource.entity({
    name: "invoice_payments",
    rowSchema: InvoicePaymentSchema,
    version: "version",

    check: checkResource(client, invoicePaymentSpec),
    backfill: backfillPages(client, invoicePaymentSpec),
    webhook: eventWebhook(client, invoicePaymentSpec),
  });

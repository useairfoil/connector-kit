import { Connector, Cursor, Fetch, type ResourceDefinition } from "@useairfoil/connector-kit";
import { Config, Context, Effect, Layer, Redacted } from "effect";

import type { StripeConfig, StripeWebhookConfig } from "./manifest";

import * as StripeClient from "./client/client";
import { chargeSpec, makeCharges } from "./resources/charges";
import { customerSpec, makeCustomers } from "./resources/customers";
import { invoicePaymentSpec, makeInvoicePayments } from "./resources/invoice-payments";
import { makeInvoiceSpec, makeInvoices } from "./resources/invoices";
import { makePrices, priceSpec } from "./resources/prices";
import { makeProducts, productSpec } from "./resources/products";
import { makeRefunds, refundSpec } from "./resources/refunds";
import { changesInterval, readEventWindow, rowsForWindow } from "./resources/shared";
import { makeSubscriptionSpec, makeSubscriptions } from "./resources/subscriptions";
import { makeWebhookRoute } from "./webhook/route";
export { manifest, StripeConfigDef } from "./manifest";
export type { StripeConfig, StripeWebhookConfig } from "./manifest";

const build = Effect.gen(function* () {
  const client = yield* StripeClient.StripeClient;

  const Customers = makeCustomers(client);
  const Products = makeProducts(client);
  const Prices = makePrices(client);
  const subscriptionSpec = makeSubscriptionSpec(client);
  const Subscriptions = makeSubscriptions(client, subscriptionSpec);
  const invoiceSpec = makeInvoiceSpec(client);
  const Invoices = makeInvoices(client, invoiceSpec);
  const Charges = makeCharges(client);
  const InvoicePayments = makeInvoicePayments(client);
  const Refunds = makeRefunds(client);

  const stripeResources = [
    Customers,
    Products,
    Prices,
    Subscriptions,
    Invoices,
    Charges,
    InvoicePayments,
    Refunds,
  ] as const;

  const connector = Connector.define({
    name: "producer-stripe",
    title: "Stripe",
    resources: stripeResources,
    changes: Fetch.feed({
      resources: stripeResources,
      cursor: Cursor.string(),
      interval: changesInterval,
      fetch: ({ cursor, selected }) =>
        Effect.gen(function* () {
          const window = yield* readEventWindow(client, String(cursor));
          const when = <A, E>(
            resource: ResourceDefinition,
            rows: Effect.Effect<ReadonlyArray<A>, E>,
          ) => (selected.has(resource.name) ? rows : Effect.succeed([]));
          const rows = yield* Effect.all(
            {
              customers: when(Customers, rowsForWindow(client, customerSpec, window.events)),
              products: when(Products, rowsForWindow(client, productSpec, window.events)),
              prices: when(Prices, rowsForWindow(client, priceSpec, window.events)),
              subscriptions: when(
                Subscriptions,
                rowsForWindow(client, subscriptionSpec, window.events),
              ),
              invoices: when(Invoices, rowsForWindow(client, invoiceSpec, window.events)),
              charges: when(Charges, rowsForWindow(client, chargeSpec, window.events)),
              invoice_payments: when(
                InvoicePayments,
                rowsForWindow(client, invoicePaymentSpec, window.events),
              ),
              refunds: when(Refunds, rowsForWindow(client, refundSpec, window.events)),
            },
            { concurrency: "unbounded" },
          );
          return { rows, cursor: window.cursor, hasMore: window.hasMore };
        }),
    }),
  });

  return {
    connector,
    webhooks: (config: StripeWebhookConfig) =>
      Effect.succeed([
        makeWebhookRoute({
          secret: Redacted.value(config.webhookSecret),
          targets: [
            { resource: Customers, eventTypes: customerSpec.eventTypes },
            { resource: Products, eventTypes: productSpec.eventTypes },
            { resource: Prices, eventTypes: priceSpec.eventTypes },
            { resource: Subscriptions, eventTypes: subscriptionSpec.eventTypes },
            { resource: Invoices, eventTypes: invoiceSpec.eventTypes },
            { resource: Charges, eventTypes: chargeSpec.eventTypes },
            { resource: InvoicePayments, eventTypes: invoicePaymentSpec.eventTypes },
            { resource: Refunds, eventTypes: refundSpec.eventTypes },
          ],
        }),
      ]),
  };
});

export const resources = build.pipe(Effect.map(({ connector }) => connector.resources));

export const webhooks = (config: StripeWebhookConfig) =>
  build.pipe(Effect.flatMap((built) => built.webhooks(config)));

export const make = Effect.fnUntraced(function* (config: StripeConfig) {
  const built = yield* build;
  const webhooks = yield* built.webhooks(config);

  return Connector.define({ ...built.connector, webhooks });
});

export type StripeConnectorRuntime = Effect.Success<ReturnType<typeof make>>;

export class StripeConnector extends Context.Service<StripeConnector, StripeConnectorRuntime>()(
  "@useairfoil/producer-stripe/StripeConnector",
) {}

export const layer = (config: StripeConfig) =>
  Layer.effect(StripeConnector)(
    make(config).pipe(Effect.annotateLogs({ component: "stripe" })),
  ).pipe(Layer.provide(StripeClient.layer(config)));

export const layerConfig = (config: Config.Wrap<StripeConfig>) =>
  Layer.unwrap(Config.unwrap(config).pipe(Effect.map(layer)));

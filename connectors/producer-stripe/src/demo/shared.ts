import type { Demo } from "@useairfoil/connector-kit";

import { Duration } from "effect";

import type { Charge } from "../schemas/charges";
import type { Customer } from "../schemas/customers";
import type { InvoicePayment } from "../schemas/invoice-payments";
import type { Invoice } from "../schemas/invoices";
import type { Refund } from "../schemas/refunds";
import type { Subscription } from "../schemas/subscriptions";

export const hour = Duration.toMillis(Duration.hours(1));
export const day = Duration.toMillis(Duration.days(1));

// A small SaaS catalog. Amounts are monthly, in cents. Yearly prices are ten months.
export const catalog = [
  { slug: "starter", name: "Starter", amount: 2900, seats: false, plan: true },
  { slug: "team", name: "Team", amount: 1500, seats: true, plan: true },
  { slug: "business", name: "Business", amount: 3900, seats: true, plan: true },
  { slug: "enterprise", name: "Enterprise", amount: 99900, seats: false, plan: true },
  { slug: "storage", name: "Extra storage", amount: 1000, seats: false, plan: false },
  { slug: "support", name: "Priority support", amount: 19900, seats: false, plan: false },
  { slug: "analytics", name: "Analytics", amount: 4900, seats: false, plan: false },
  { slug: "sso", name: "Single sign-on", amount: 9900, seats: false, plan: false },
] as const;

type CatalogItem = (typeof catalog)[number];
export type Currency = "usd" | "eur";
export type Interval = "month" | "year";

// EUR customers only get monthly prices.
export const priceOptions: ReadonlyArray<readonly [Currency, Interval]> = [
  ["usd", "month"],
  ["usd", "year"],
  ["eur", "month"],
];

export const productId = (item: CatalogItem) => `prod_demo_${item.slug}`;

export const priceId = (item: CatalogItem, currency: Currency, interval: Interval) =>
  `price_demo_${item.slug}_${currency}_${interval}`;

export const unitAmount = (item: CatalogItem, currency: Currency, interval: Interval) => {
  const monthly = currency === "usd" ? item.amount : Math.round((item.amount * 0.92) / 100) * 100;
  return BigInt(interval === "year" ? monthly * 10 : monthly);
};

// Stripe stores whole seconds.
export const seconds = (time: number) => new Date(Math.floor(time / 1000) * 1000);

export const addIntervals = (start: Date, interval: Interval, count: number) => {
  const next = new Date(start);

  if (interval === "month") next.setUTCMonth(next.getUTCMonth() + count);
  else next.setUTCFullYear(next.getUTCFullYear() + count);

  return next;
};

/** Billing period starts from `start`, up to and including the one that holds `until`. */
export const periodStarts = (start: Date, interval: Interval, until: Date) => {
  const starts: Array<Date> = [];

  for (let next = start; next <= until; next = addIntervals(start, interval, starts.length)) {
    starts.push(next);
  }

  return starts;
};

/** Date helpers for one run. `at` keeps a time from going past now. */
export const clock = ({ now }: Demo.DemoContext) => {
  const at = (time: number) => seconds(Math.min(time, now.getTime()));
  return { at };
};

export type Rows = {
  readonly customers: Array<Customer>;
  readonly subscriptions: Array<Subscription>;
  readonly invoices: Array<Invoice>;
  readonly charges: Array<Charge>;
  readonly invoice_payments: Array<InvoicePayment>;
  readonly refunds: Array<Refund>;
};

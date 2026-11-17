import type { Demo } from "@useairfoil/connector-kit";

import { Duration } from "effect";

import type { BenefitGrant } from "../resources/benefit-grants";
import type { Checkout } from "../resources/checkouts";
import type { CustomerMember } from "../resources/customer-members";
import type { CustomerMeter } from "../resources/customer-meters";
import type { CustomerSeat } from "../resources/customer-seats";
import type { Customer } from "../resources/customers";
import type { Dispute } from "../resources/disputes";
import type { LicenseActivation } from "../resources/license-activations";
import type { LicenseKey } from "../resources/license-keys";
import type { Order } from "../resources/orders";
import type { Payment } from "../resources/payments";
import type { Refund } from "../resources/refunds";
import type { Subscription } from "../resources/subscriptions";
import type { UsageEvent } from "../resources/usage-events";

export const hour = Duration.toMillis(Duration.hours(1));
export const day = Duration.toMillis(Duration.days(1));
export const organizationId = "00000000-0000-4000-8000-00000000a1f0";

// Polar IDs are UUIDs. Each table gets its own first block, and the row index ends the ID.
export const uuid = (table: number, index: number, part = 0) =>
  `${table.toString(16).padStart(8, "0")}-${part.toString(16).padStart(4, "0")}-4000-8000-${index.toString(16).padStart(12, "0")}`;

// Amounts are in cents. `months` is the billing interval; one-time products have none.
export const catalog = [
  { name: "Indie", amount: 900, months: 1, trialDays: 14 },
  { name: "Pro", amount: 2900, months: 1, trialDays: 14 },
  { name: "Team", amount: 7900, months: 1, trialDays: 0 },
  { name: "Pro yearly", amount: 29000, months: 12, trialDays: 0 },
  { name: "Lifetime license", amount: 19900, months: 0, trialDays: 0 },
  { name: "Starter template pack", amount: 4900, months: 0, trialDays: 0 },
] as const;

export type CatalogItem = (typeof catalog)[number];

// "Team" is sold per seat, and "Lifetime license" grants a license key.
export const teamSeats = 5;
export const licenseProduct = 4;
export const benefitId = uuid(11, 0);
export const meterId = uuid(12, 0);
export const meterEvent = "api_request";

export const productId = (index: number) => uuid(1, index);
export const priceId = (index: number) => uuid(1, index, 1);

export const discounts = [
  { name: "Launch week", code: "LAUNCH20", type: "percentage", basisPoints: 2000 },
  { name: "Welcome", code: "WELCOME10", type: "fixed", amount: 1000 },
  { name: "Annual promo", code: "ANNUAL15", type: "percentage", basisPoints: 1500 },
] as const;

export const discountId = (index: number) => uuid(2, index);

export const discountFor = (index: number, subtotal: number) => {
  const discount = discounts[index];
  if (!discount) return 0;

  return discount.type === "fixed"
    ? Math.min(discount.amount, subtotal)
    : Math.round((subtotal * discount.basisPoints) / 10_000);
};

export const addMonths = (start: Date, months: number) => {
  const next = new Date(start);
  next.setUTCMonth(next.getUTCMonth() + months);

  return next;
};

/** Date helpers for one run. `at` keeps a time from going past now. */
export const clock = ({ now }: Demo.DemoContext) => {
  const at = (time: number) => new Date(Math.min(time, now.getTime()));
  return { at };
};

export type Rows = {
  readonly customers: Array<Customer>;
  readonly checkouts: Array<Checkout>;
  readonly orders: Array<Order>;
  readonly subscriptions: Array<Subscription>;
  readonly refunds: Array<Refund>;
  readonly payments: Array<Payment>;
  readonly disputes: Array<Dispute>;
  readonly usage_events: Array<UsageEvent>;
  readonly customer_meters: Array<CustomerMeter>;
  readonly customer_members: Array<CustomerMember>;
  readonly customer_seats: Array<CustomerSeat>;
  readonly benefit_grants: Array<BenefitGrant>;
  readonly license_keys: Array<LicenseKey>;
  readonly license_activations: Array<LicenseActivation>;
};

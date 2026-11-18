import type { Demo } from "@useairfoil/connector-kit";

import type { BillingMeter } from "../schemas/billing-meters";
import type { Coupon } from "../schemas/coupons";
import type { Price } from "../schemas/prices";
import type { Product } from "../schemas/products";
import type { PromotionCode } from "../schemas/promotion-codes";

import { catalog, day, priceId, priceOptions, productId, seconds, unitAmount } from "./shared";

/** The catalog of products and prices, written once before any customer. */
export const setupRows = ({ now }: Demo.DemoContext) => {
  const created = seconds(now.getTime() - 800 * day);

  const productRows: Array<Product> = catalog.map((item) => ({
    id: productId(item),
    version: now,
    created,
    updated: created,
    livemode: false,
    active: true,
    name: item.name,
    description: item.plan ? `${item.name} plan` : `${item.name} add-on`,
    default_price: priceId(item, "usd", "month"),
    tax_code: "txcd_10103001",
    unit_label: item.seats ? "seat" : null,
    url: null,
    shippable: null,
    statement_descriptor: null,
    metadata: new Map(),
  }));

  const priceRows: Array<Price> = catalog.flatMap((item) =>
    priceOptions.map(([currency, interval]) => ({
      id: priceId(item, currency, interval),
      version: now,
      created,
      livemode: false,
      active: true,
      product: productId(item),
      currency,
      type: "recurring",
      billing_scheme: "per_unit",
      unit_amount: unitAmount(item, currency, interval),
      unit_amount_decimal: String(unitAmount(item, currency, interval)),
      tiers_mode: null,
      lookup_key: `${item.slug}_${interval}ly_${currency}`,
      nickname: `${item.name} ${interval}ly`,
      tax_behavior: "exclusive",
      recurring: {
        interval,
        interval_count: 1n,
        usage_type: "licensed",
        meter: null,
        trial_period_days: null,
      },
      metadata: new Map(),
    })),
  );

  const coupon: Coupon = {
    id: "coupon_demo_welcome",
    version: now,
    created,
    name: "Welcome discount",
    duration: "once",
    percent_off: 15,
    times_redeemed: 0n,
    valid: true,
  };
  const promotion: PromotionCode = {
    id: "promo_demo_welcome",
    version: now,
    created,
    code: "WELCOME15",
    active: true,
    times_redeemed: 0n,
    promotion: { type: "coupon", coupon: coupon.id },
  };
  const meter: BillingMeter = {
    id: "mtr_demo_api_calls",
    version: now,
    created,
    updated: created,
    display_name: "API calls",
    event_name: "api_call",
    status: "active",
    default_aggregation: { formula: "sum" },
  };
  return {
    products: productRows,
    prices: priceRows,
    coupons: [coupon],
    promotion_codes: [promotion],
    billing_meters: [meter],
  };
};

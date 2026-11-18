import type { Demo } from "@useairfoil/connector-kit";

import type { Benefit } from "../resources/benefits";
import type { CheckoutLink } from "../resources/checkout-links";
import type { CustomField } from "../resources/custom-fields";
import type { Discount } from "../resources/discounts";
import type { Meter } from "../resources/meters";
import type { Product } from "../resources/products";

import {
  benefitId,
  catalog,
  day,
  discountId,
  discounts,
  meterEvent,
  meterId,
  organizationId,
  priceId,
  productId,
  uuid,
} from "./shared";

/** The catalog of products and discounts, written once before any customer. */
export const setupRows = ({ now }: Demo.DemoContext) => {
  const created = new Date(now.getTime() - 800 * day);

  const products: Array<Product> = catalog.map((item, index) => ({
    id: productId(index),
    version: created,
    created_at: created,
    modified_at: null,
    name: item.name,
    description:
      item.months > 0 ? `${item.name} subscription` : `One-time ${item.name.toLowerCase()}`,
    visibility: "public",
    is_recurring: item.months > 0,
    is_archived: false,
    recurring_interval: item.months === 0 ? null : item.months === 12 ? "year" : "month",
    recurring_interval_count: item.months === 0 ? null : 1,
    trial_interval: item.trialDays > 0 ? "day" : null,
    trial_interval_count: item.trialDays > 0 ? item.trialDays : null,
    meter_interval: null,
    meter_interval_count: null,
    organization_id: organizationId,
    metadata: "{}",
    prices: [
      {
        id: priceId(index),
        created_at: created,
        modified_at: null,
        amount_type: "fixed",
        price_currency: "usd",
        is_archived: false,
        tax_behavior: "exclusive",
        source: "catalog",
        price_amount: item.amount,
        minimum_amount: null,
        maximum_amount: null,
        preset_amount: null,
        unit_amount: null,
        cap_amount: null,
        meter_id: null,
        minimum_units: null,
        maximum_units: null,
      },
    ],
  }));

  const discountRows: Array<Discount> = discounts.map((discount, index) => ({
    id: discountId(index),
    version: created,
    created_at: created,
    modified_at: null,
    name: discount.name,
    code: discount.code,
    type: discount.type,
    duration: "once",
    duration_in_months: null,
    amount: discount.type === "fixed" ? discount.amount : null,
    currency: discount.type === "fixed" ? "usd" : null,
    basis_points: discount.type === "percentage" ? discount.basisPoints : null,
    starts_at: created,
    ends_at: null,
    max_redemptions: null,
    max_redemptions_per_customer: 1,
    // The catalog is written before any order, so redemptions aren't counted.
    redemptions_count: 0,
    organization_id: organizationId,
    metadata: "{}",
    products: [],
  }));

  const stamp = { version: created, created_at: created, modified_at: null };

  const meters: Array<Meter> = [
    {
      ...stamp,
      id: meterId,
      name: "API requests",
      unit: "scalar",
      custom_label: null,
      custom_multiplier: null,
      filter: JSON.stringify({
        conjunction: "and",
        clauses: [{ property: "name", operator: "eq", value: meterEvent }],
      }),
      aggregation: JSON.stringify({ func: "count" }),
      organization_id: organizationId,
      archived_at: null,
      metadata: "{}",
    },
  ];

  const benefits: Array<Benefit> = [
    {
      ...stamp,
      id: benefitId,
      type: "license_keys",
      description: "Lifetime license key",
      selectable: true,
      deletable: true,
      is_deleted: false,
      visibility: "public",
      organization_id: organizationId,
      properties: JSON.stringify({ prefix: "LIFE", limit_activations: 3, limit_usage: null }),
      metadata: "{}",
    },
  ];

  const customFields: Array<CustomField> = [
    {
      ...stamp,
      id: uuid(13, 0),
      organization_id: organizationId,
      type: "text",
      slug: "company",
      name: "Company",
      properties: JSON.stringify({ form_label: "Company name" }),
      metadata: "{}",
    },
  ];

  const checkoutLinks: Array<CheckoutLink> = catalog.map((item, index) => ({
    ...stamp,
    id: uuid(14, index),
    organization_id: organizationId,
    label: item.name,
    payment_processor: "stripe",
    success_url: "https://example.com/thanks",
    return_url: null,
    trial_interval: item.trialDays > 0 ? "day" : null,
    trial_interval_count: item.trialDays > 0 ? item.trialDays : null,
    allow_discount_codes: true,
    require_billing_address: false,
    discount_id: null,
    seats: null,
    units: null,
    products: [{ id: productId(index) }],
    metadata: "{}",
  }));

  return {
    products,
    discounts: discountRows,
    meters,
    benefits,
    custom_fields: customFields,
    checkout_links: checkoutLinks,
  };
};

import type { Demo } from "@useairfoil/connector-kit";

import type { Order } from "../resources/orders";
import type { Address } from "../resources/shared";

import {
  addMonths,
  catalog,
  type CatalogItem,
  clock,
  day,
  discountFor,
  discountId,
  discounts,
  hour,
  organizationId,
  priceId,
  productId,
  type Rows,
  uuid,
} from "./shared";

/** One group is one customer with their checkouts, subscriptions, orders, and refunds. */
export const customerRows = (index: number, context: Demo.DemoContext): Rows => {
  const { faker, now } = context;
  const { at } = clock(context);

  const rows: Rows = { customers: [], checkouts: [], orders: [], subscriptions: [], refunds: [] };

  const customerId = uuid(3, index);
  const team = faker.datatype.boolean({ probability: 0.2 });
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const name = team ? faker.company.name() : `${firstName} ${lastName}`;
  const email = faker.internet.exampleEmail({ firstName, lastName }).toLowerCase();

  const country = faker.helpers.weightedArrayElement([
    { weight: 5, value: "US" },
    { weight: 1, value: "GB" },
    { weight: 1, value: "DE" },
    { weight: 1, value: "FR" },
    { weight: 1, value: "CA" },
  ]);

  const address: Address = {
    country,
    line1: faker.location.streetAddress(),
    line2: null,
    postal_code: faker.location.zipCode(),
    city: faker.location.city(),
    state: country === "US" ? faker.location.state({ abbreviated: true }) : null,
  };

  // Polar adds VAT outside the US.
  const taxRate = country === "US" ? 0 : 0.2;
  const created = at(now.getTime() - faker.number.int({ min: 20 * day, max: 700 * day }));
  const invoicePrefix = faker.string.alphanumeric({ length: 8, casing: "upper" });
  let orderCount = 0;
  let lastChange = created;

  const order = (input: {
    readonly item: CatalogItem;
    readonly itemIndex: number;
    readonly created: Date;
    readonly reason: Order["billing_reason"];
    readonly subscriptionId: string | null;
    readonly checkoutId: string | null;
    readonly discountIndex: number | null;
  }) => {
    const n = orderCount++;
    const orderId = uuid(4, index, n);
    const subtotal = input.item.amount;
    const discount = input.discountIndex === null ? 0 : discountFor(input.discountIndex, subtotal);
    const net = subtotal - discount;
    const tax = Math.round(net * taxRate);
    const total = net + tax;

    const refundShare =
      total > 0 && faker.datatype.boolean({ probability: 0.04 })
        ? faker.helpers.arrayElement([1, 0.5])
        : 0;

    const refunded = Math.round(net * refundShare);
    const refundedTax = Math.round(tax * refundShare);
    const number = `${invoicePrefix}-${String(n + 1).padStart(4, "0")}`;

    const modified =
      refunded > 0
        ? at(input.created.getTime() + faker.number.int({ min: day, max: 10 * day }))
        : null;

    lastChange = new Date(Math.max(lastChange.getTime(), (modified ?? input.created).getTime()));

    rows.orders.push({
      id: orderId,
      version: modified ?? input.created,
      created_at: input.created,
      modified_at: modified,
      status: refundShare === 1 ? "refunded" : refundShare > 0 ? "partially_refunded" : "paid",
      paid: true,
      subtotal_amount: subtotal,
      discount_amount: discount,
      net_amount: net,
      tax_amount: tax,
      total_amount: total,
      applied_balance_amount: 0,
      due_amount: 0,
      refunded_amount: refunded,
      refunded_tax_amount: refundedTax,
      refundable_amount: net - refunded,
      refundable_tax_amount: tax - refundedTax,
      currency: "usd",
      billing_reason: input.reason,
      billing_name: name,
      billing_address: address,
      invoice_number: number,
      receipt_number: number,
      is_invoice_generated: true,
      customer_id: customerId,
      product_id: productId(input.itemIndex),
      discount_id: input.discountIndex === null ? null : discountId(input.discountIndex),
      subscription_id: input.subscriptionId,
      checkout_id: input.checkoutId,
      description: input.item.name,
      seats: null,
      units: null,
      next_payment_attempt_at: null,
      // Polar's fee is 4% plus 40 cents.
      platform_fee_amount: Math.round(total * 0.04) + 40,
      platform_fee_currency: "usd",
      metadata: "{}",
      items: [
        {
          id: uuid(5, index, n),
          created_at: input.created,
          modified_at: null,
          label: input.item.name,
          amount: subtotal,
          tax_amount: tax,
          proration: false,
          product_price_id: priceId(input.itemIndex),
        },
      ],
      custom_field_data: "{}",
    });

    if (refunded > 0 && modified) {
      rows.refunds.push({
        id: uuid(6, index, n),
        version: modified,
        created_at: modified,
        modified_at: null,
        status: "succeeded",
        reason: faker.helpers.arrayElement([
          "customer_request",
          "satisfaction_guarantee",
          "duplicate",
        ]),
        amount: refunded,
        tax_amount: refundedTax,
        currency: "usd",
        organization_id: organizationId,
        order_id: orderId,
        subscription_id: input.subscriptionId,
        customer_id: customerId,
        revoke_benefits: refundShare === 1,
        metadata: "{}",
      });
    }

    return total;
  };

  const purchases = faker.helpers.weightedArrayElement([
    { weight: 10, value: 0 },
    { weight: 75, value: 1 },
    { weight: 15, value: 2 },
  ]);

  for (let p = 0; p < purchases; p++) {
    const itemIndex = faker.number.int({ max: catalog.length - 1 });
    const item = catalog[itemIndex] ?? catalog[0];
    const checkoutId = uuid(7, index, p);
    const checkoutCreated = at(created.getTime() + faker.number.int({ min: 0, max: 15 * day }));

    const discountIndex =
      faker.helpers.maybe(() => faker.number.int({ max: discounts.length - 1 }), {
        probability: 0.2,
      }) ?? null;

    const subtotal = item.amount;
    const discount = discountIndex === null ? 0 : discountFor(discountIndex, subtotal);
    const tax = Math.round((subtotal - discount) * taxRate);
    const subscriptionId = item.months > 0 ? uuid(8, index, p) : null;

    rows.checkouts.push({
      id: checkoutId,
      version: checkoutCreated,
      created_at: checkoutCreated,
      modified_at: null,
      payment_processor: "stripe",
      status: "succeeded",
      expires_at: new Date(checkoutCreated.getTime() + hour),
      amount: subtotal,
      discount_amount: discount,
      net_amount: subtotal - discount,
      tax_amount: tax,
      tax_behavior: "exclusive",
      total_amount: subtotal - discount + tax,
      currency: "usd",
      organization_id: organizationId,
      product_id: productId(itemIndex),
      product_price_id: priceId(itemIndex),
      discount_id: discountIndex === null ? null : discountId(discountIndex),
      subscription_id: subscriptionId,
      customer_id: customerId,
      external_customer_id: null,
      allow_discount_codes: true,
      require_billing_address: false,
      is_discount_applicable: true,
      is_free_product_price: false,
      is_payment_required: item.trialDays === 0,
      is_payment_setup_required: item.months > 0,
      is_payment_form_required: true,
      is_business_customer: team,
      customer_name: name,
      customer_email: email,
      customer_billing_name: name,
      customer_billing_address: address,
      allow_trial: item.trialDays > 0,
      active_trial_interval: item.trialDays > 0 ? "day" : null,
      active_trial_interval_count: item.trialDays > 0 ? item.trialDays : null,
      trial_end:
        item.trialDays > 0 ? new Date(checkoutCreated.getTime() + item.trialDays * day) : null,
      trial_interval: item.trialDays > 0 ? "day" : null,
      trial_interval_count: item.trialDays > 0 ? item.trialDays : null,
      seats: null,
      min_seats: null,
      max_seats: null,
      units: null,
      min_units: null,
      max_units: null,
      metadata: "{}",
      custom_field_data: "{}",
    });

    if (subscriptionId === null) {
      order({
        item,
        itemIndex,
        created: checkoutCreated,
        reason: "purchase",
        subscriptionId,
        checkoutId,
        discountIndex,
      });

      continue;
    }

    // Billing starts when the trial ends. Each period start before now gets an order.
    const trialEnd =
      item.trialDays > 0 ? new Date(checkoutCreated.getTime() + item.trialDays * day) : null;

    const anchor = trialEnd ?? checkoutCreated;
    const starts: Array<Date> = [];

    for (let next = anchor; next <= now; next = addMonths(anchor, item.months * starts.length)) {
      starts.push(next);
    }

    const status =
      starts.length === 0
        ? "trialing"
        : faker.helpers.weightedArrayElement([
            { weight: 80, value: "active" },
            { weight: 5, value: "past_due" },
            { weight: 15, value: "canceled" },
          ] as const);

    const billed =
      status === "canceled" && starts.length > 1
        ? starts.slice(0, faker.number.int({ min: 1, max: starts.length - 1 }))
        : starts;

    const canceled = status === "canceled" && starts.length > 1;
    const periodStart = billed.at(-1) ?? checkoutCreated;

    const periodEnd =
      trialEnd && billed.length === 0 ? trialEnd : addMonths(periodStart, item.months);

    const endedAt = canceled ? periodEnd : null;

    const canceledAt = endedAt
      ? at(endedAt.getTime() - faker.number.int({ min: day, max: 20 * day }))
      : null;

    billed.forEach((start, n) => {
      // A past-due subscription failed its latest payment, so that order isn't written yet.
      if (status === "past_due" && n === billed.length - 1) return;

      order({
        item,
        itemIndex,
        created: start,
        reason: n === 0 ? "subscription_create" : "subscription_cycle",
        subscriptionId,
        checkoutId: n === 0 ? checkoutId : null,
        discountIndex: n === 0 ? discountIndex : null,
      });
    });

    const modified = canceledAt ?? billed.at(-1) ?? null;
    if (modified) lastChange = new Date(Math.max(lastChange.getTime(), modified.getTime()));

    rows.subscriptions.push({
      prices: [{ id: priceId(itemIndex) }],
      id: subscriptionId,
      version: modified ?? checkoutCreated,
      created_at: checkoutCreated,
      modified_at: modified,
      amount: item.amount,
      currency: "usd",
      recurring_interval: item.months === 12 ? "year" : "month",
      recurring_interval_count: 1,
      status: status === "canceled" && !canceled ? "active" : status,
      current_period_start: billed.length === 0 ? checkoutCreated : periodStart,
      current_period_end: periodEnd,
      current_meter_period_start: null,
      current_meter_period_end: null,
      trial_start: trialEnd ? checkoutCreated : null,
      trial_end: trialEnd,
      cancel_at_period_end: false,
      canceled_at: canceledAt,
      started_at: checkoutCreated,
      ends_at: endedAt,
      ended_at: endedAt,
      pause_at_period_end: false,
      paused_at: null,
      resumes_at: null,
      past_due_at: status === "past_due" ? periodStart : null,
      customer_id: customerId,
      product_id: productId(itemIndex),
      discount_id: discountIndex === null ? null : discountId(discountIndex),
      checkout_id: checkoutId,
      customer_cancellation_reason: canceled
        ? faker.helpers.arrayElement([
            "too_expensive",
            "unused",
            "missing_features",
            "switched_service",
          ])
        : null,
      customer_cancellation_comment: null,
      seats: null,
      units: null,
      metadata: "{}",
      custom_field_data: "{}",
    });
  }

  const modified = lastChange > created ? lastChange : null;

  rows.customers.push({
    id: customerId,
    version: modified ?? created,
    created_at: created,
    modified_at: modified,
    type: team ? "team" : "individual",
    deleted_at: null,
    _deleted: false,
    external_id: null,
    email,
    email_verified: true,
    name,
    billing_name: name,
    billing_address: address,
    organization_id: organizationId,
    avatar_url: null,
    locale: null,
    default_payment_method_id: null,
    metadata: "{}",
  });

  return rows;
};

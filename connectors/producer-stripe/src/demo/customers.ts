import type { Demo } from "@useairfoil/connector-kit";

import type { SubscriptionItem } from "../schemas/subscriptions";

import {
  addIntervals,
  catalog,
  clock,
  type Currency,
  day,
  hour,
  type Interval,
  periodStarts,
  priceId,
  productId,
  type Rows,
  seconds,
  unitAmount,
} from "./shared";

/** One group is one customer with their subscriptions, invoices, charges, and refunds. */
export const customerRows = (index: number, context: Demo.DemoContext): Rows => {
  const { faker, now } = context;
  const { at } = clock(context);

  const rows: Rows = {
    customers: [],
    subscriptions: [],
    invoices: [],
    charges: [],
    invoice_payments: [],
    refunds: [],
    payment_intents: [],
    payouts: [],
    disputes: [],
    credit_notes: [],
    checkout_sessions: [],
    subscription_schedules: [],
    balance_transactions: [],
    meter_summaries: [],
  };

  const id = `cus_demo_${index}`;

  const currency: Currency = faker.helpers.weightedArrayElement([
    { weight: 7, value: "usd" },
    { weight: 3, value: "eur" },
  ]);

  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const name = `${firstName} ${lastName}`;
  const email = faker.internet.exampleEmail({ firstName, lastName }).toLowerCase();
  const phone = faker.phone.number({ style: "international" });
  const invoicePrefix = faker.string.alphanumeric({ length: 8, casing: "upper" });

  const country =
    currency === "usd" ? "US" : faker.helpers.arrayElement(["DE", "FR", "NL", "ES", "IE"]);

  const address = {
    line1: faker.location.streetAddress(),
    line2:
      faker.helpers.maybe(() => faker.location.secondaryAddress(), { probability: 0.2 }) ?? null,
    city: faker.location.city(),
    state: country === "US" ? faker.location.state({ abbreviated: true }) : null,
    postal_code: faker.location.zipCode(),
    country,
  };

  const card = {
    brand: faker.helpers.arrayElement(["visa", "mastercard", "amex"]),
    country,
    funding: faker.helpers.arrayElement(["credit", "debit"]),
    last4: faker.string.numeric(4),
    exp_month: BigInt(faker.number.int({ min: 1, max: 12 })),
    exp_year: BigInt(now.getUTCFullYear() + faker.number.int({ min: 1, max: 5 })),
    fingerprint: null,
  };

  const customerCreated = at(now.getTime() - faker.number.int({ min: 30 * day, max: 730 * day }));

  const subscriptionCount = faker.helpers.weightedArrayElement([
    { weight: 15, value: 0 },
    { weight: 70, value: 1 },
    { weight: 15, value: 2 },
  ]);

  for (let s = 0; s < subscriptionCount; s++) {
    const subscriptionId = `sub_demo_${index}_${s}`;

    const status = faker.helpers.weightedArrayElement([
      { weight: 70, value: "active" },
      { weight: 8, value: "trialing" },
      { weight: 7, value: "past_due" },
      { weight: 15, value: "canceled" },
    ]);

    const interval: Interval =
      currency === "usd" && faker.datatype.boolean({ probability: 0.25 }) ? "year" : "month";

    const plan = faker.helpers.arrayElement(catalog.filter((item) => item.plan));

    const addOn = faker.helpers.maybe(
      () => faker.helpers.arrayElement(catalog.filter((item) => !item.plan)),
      { probability: 0.3 },
    );

    const lines = [plan, ...(addOn ? [addOn] : [])].map((item) => ({
      item,
      quantity: BigInt(item.seats ? faker.number.int({ min: 3, max: 40 }) : 1),
    }));

    const total = lines.reduce(
      (sum, { item, quantity }) => sum + unitAmount(item, currency, interval) * quantity,
      0n,
    );

    const created =
      status === "trialing"
        ? at(now.getTime() - faker.number.int({ min: day, max: 13 * day }))
        : at(customerCreated.getTime() + faker.number.int({ min: 0, max: 20 * day }));

    const trialEnd = status === "trialing" ? seconds(created.getTime() + 14 * day) : null;
    const anchor = trialEnd ?? created;

    // Trials bill nothing yet. Canceled ones stop after some periods.
    const starts = status === "trialing" ? [] : periodStarts(anchor, interval, now);

    const billed =
      status === "canceled" && starts.length > 1
        ? starts.slice(0, faker.number.int({ min: 1, max: starts.length - 1 }))
        : starts;

    const canceled = status === "canceled" && starts.length > 1;
    // During a trial, the current period is the trial itself.
    const currentStart = billed.at(-1) ?? created;
    const currentEnd = trialEnd ?? addIntervals(currentStart, interval, 1);
    const endedAt = canceled ? currentEnd : null;

    const items: Array<SubscriptionItem> = lines.map(({ item, quantity }, k) => ({
      id: `si_demo_${index}_${s}_${k}`,
      created,
      price: { id: priceId(item, currency, interval), product: productId(item) },
      quantity,
      current_period_start: currentStart,
      current_period_end: currentEnd,
    }));

    billed.forEach((periodStart, n) => {
      const invoiceId = `in_demo_${index}_${s}_${n}`;
      const unpaid = status === "past_due" && n === billed.length - 1;
      const finalized = at(periodStart.getTime() + hour);

      rows.invoices.push({
        id: invoiceId,
        version: now,
        created: periodStart,
        livemode: false,
        customer: id,
        customer_account: null,
        parent: {
          type: "subscription_details",
          subscription_details: { subscription: subscriptionId },
        },
        status: unpaid ? "open" : "paid",
        number: `${invoicePrefix}-${String(n + 1).padStart(4, "0")}`,
        currency,
        subtotal: total,
        total,
        total_excluding_tax: total,
        total_discount_amounts: [],
        total_taxes: [],
        lines: lines.map(({ item, quantity }, lineIndex) => {
          const unit = unitAmount(item, currency, interval);
          return {
            id: `il_demo_${index}_${s}_${n}_${lineIndex}`,
            amount: unit * quantity,
            subtotal: unit * quantity,
            currency,
            description: item.name,
            quantity,
            quantity_decimal: String(quantity),
            period: {
              start: periodStart,
              end: addIntervals(periodStart, interval, 1),
            },
            pricing: {
              type: "price_details",
              price_details: { price: priceId(item, currency, interval), product: productId(item) },
              unit_amount_decimal: String(unit),
            },
            discount_amounts: [],
            taxes: [],
          };
        }),
        amount_due: total,
        amount_paid: unpaid ? 0n : total,
        amount_remaining: unpaid ? total : 0n,
        amount_overpaid: 0n,
        attempt_count: unpaid ? 2n : 1n,
        billing_reason: n === 0 ? "subscription_create" : "subscription_cycle",
        collection_method: "charge_automatically",
        due_date: null,
        period_start: n === 0 ? periodStart : (billed[n - 1] ?? periodStart),
        period_end: periodStart,
        effective_at: finalized,
        status_transitions: {
          finalized_at: finalized,
          paid_at: unpaid ? null : finalized,
          voided_at: null,
          marked_uncollectible_at: null,
        },
        metadata: new Map(),
        test_clock: null,
        customer_email: email,
        customer_name: name,
        customer_phone: phone,
        customer_address: address,
        customer_shipping: null,
      });

      const chargeId = `ch_demo_${index}_${s}_${n}`;
      const paymentIntent = `pi_demo_${index}_${s}_${n}`;

      if (!unpaid) {
        rows.invoice_payments.push({
          id: `inpay_demo_${index}_${s}_${n}`,
          version: now,
          created: finalized,
          invoice: invoiceId,
          currency,
          amount_requested: total,
          amount_paid: total,
          is_default: true,
          livemode: false,
          payment: { type: "payment_intent", payment_intent: paymentIntent },
          status: "paid",
          status_transitions: { paid_at: finalized, canceled_at: null },
        });
      }

      const refund =
        unpaid || !faker.datatype.boolean({ probability: 0.05 })
          ? null
          : faker.datatype.boolean({ probability: 0.6 })
            ? total
            : total / 2n;

      rows.payment_intents.push({
        id: paymentIntent,
        created: finalized,
        version: now,
        livemode: false,
        status: unpaid ? "requires_payment_method" : "succeeded",
        amount: total,
        amount_received: unpaid ? 0n : total,
        currency,
        customer: id,
        latest_charge: chargeId,
      });

      if (n === 0) {
        rows.checkout_sessions.push({
          id: `cs_demo_${index}_${s}`,
          created: periodStart,
          version: now,
          mode: "subscription",
          status: "complete",
          payment_status: unpaid ? "unpaid" : "paid",
          expires_at: at(periodStart.getTime() + day),
          currency,
          amount_subtotal: total,
          amount_total: total,
          customer: id,
          subscription: subscriptionId,
          invoice: invoiceId,
          line_items: lines.map(({ item, quantity }, k) => {
            const amount = unitAmount(item, currency, interval) * quantity;
            return {
              id: `li_demo_${index}_${s}_${k}`,
              description: item.name,
              currency,
              quantity,
              amount_subtotal: amount,
              amount_total: amount,
              amount_discount: 0n,
              amount_tax: 0n,
              price: { id: priceId(item, currency, interval), product: productId(item) },
            };
          }),
        });
      }

      const balanceTransactionId = unpaid ? null : `txn_${chargeId}`;
      if (balanceTransactionId !== null) {
        const fee = (total * 29n) / 1000n + 30n;
        const availableOn = at(finalized.getTime() + 2 * day);
        if (availableOn < now && n === 0) {
          rows.payouts.push({
            id: `po_demo_${index}_${s}`,
            version: now,
            created: availableOn,
            arrival_date: at(availableOn.getTime() + day),
            amount: total - fee,
            currency,
            automatic: true,
            status: "paid",
            method: "standard",
            type: "bank_account",
            reconciliation_status: "completed",
            balance_transaction_ids: [balanceTransactionId],
          });
        }
        if (refund === null && n === 0 && index % 13 === 0) {
          rows.disputes.push({
            id: `dp_demo_${index}_${s}`,
            version: now,
            created: at(finalized.getTime() + day),
            amount: total,
            currency,
            charge: chargeId,
            payment_intent: paymentIntent,
            reason: "product_not_received",
            status: "needs_response",
            is_charge_refundable: false,
          });
        }
        rows.balance_transactions.push({
          id: balanceTransactionId,
          version: now,
          created: finalized,
          available_on: availableOn,
          status: availableOn <= now ? "available" : "pending",
          amount: total,
          currency,
          fee,
          fee_details: [
            {
              amount: fee,
              application: null,
              currency,
              description: "Stripe fee",
              type: "stripe_fee",
            },
          ],
          net: total - fee,
          source: chargeId,
          type: "charge",
          reporting_category: "charge",
          exchange_rate: null,
          description: null,
        });
      }
      rows.charges.push({
        id: chargeId,
        version: now,
        created: finalized,
        livemode: false,
        amount: total,
        amount_captured: unpaid ? 0n : total,
        amount_refunded: refund ?? 0n,
        currency,
        status: unpaid ? "failed" : "succeeded",
        paid: !unpaid,
        captured: !unpaid,
        refunded: refund === total,
        disputed: false,
        customer: id,
        payment_intent: paymentIntent,
        payment_method: null,
        balance_transaction: balanceTransactionId,
        description: n === 0 ? "Subscription creation" : "Subscription update",
        failure_code: unpaid ? "card_declined" : null,
        failure_message: unpaid ? "Your card was declined." : null,
        payment_method_details: { type: "card", card },
        outcome: unpaid
          ? {
              type: "issuer_declined",
              network_status: "declined_by_network",
              reason: "generic_decline",
              risk_level: "normal",
              seller_message: "The bank did not return any further details with this decline.",
            }
          : {
              type: "authorized",
              network_status: "approved_by_network",
              reason: null,
              risk_level: "normal",
              seller_message: "Payment complete.",
            },
        metadata: new Map(),
        billing_details: { name, email, phone, address },
        receipt_email: email,
      });

      if (refund !== null) {
        rows.credit_notes.push({
          id: `cn_demo_${index}_${s}_${n}`,
          version: now,
          created: at(finalized.getTime() + day),
          invoice: invoiceId,
          customer: id,
          number: `${invoicePrefix}-CN-${n + 1}`,
          status: "issued",
          type: "post_payment",
          currency,
          amount: refund,
          subtotal: refund,
          total: refund,
          pre_payment_amount: 0n,
          post_payment_amount: refund,
          lines: [
            {
              id: `cnli_demo_${index}_${s}_${n}`,
              type: "custom_line_item",
              amount: refund,
              discount_amount: 0n,
              description: "Subscription credit",
              quantity: 1n,
              unit_amount: refund,
            },
          ],
        });
        rows.refunds.push({
          id: `re_demo_${index}_${s}_${n}`,
          version: now,
          created: at(finalized.getTime() + faker.number.int({ min: day, max: 10 * day })),
          amount: refund,
          currency,
          status: "succeeded",
          pending_reason: null,
          reason: "requested_by_customer",
          failure_reason: null,
          charge: chargeId,
          payment_intent: paymentIntent,
          customer: id,
          customer_account: null,
          balance_transaction: null,
          metadata: new Map(),
        });
      }
    });

    const scheduleId = index % 7 === 0 && !canceled ? `sub_sched_demo_${index}_${s}` : null;
    if (scheduleId !== null) {
      rows.subscription_schedules.push({
        id: scheduleId,
        version: now,
        created,
        customer: id,
        subscription: subscriptionId,
        status: "active",
        end_behavior: "release",
        phases: [
          {
            start_date: currentStart,
            end_date: currentEnd,
            items: items.map(({ price, quantity }) => ({ price: price.id, quantity })),
          },
        ],
      });
    }
    rows.subscriptions.push({
      id: subscriptionId,
      version: now,
      created,
      livemode: false,
      customer: id,
      customer_account: null,
      // A canceled subscription without a full period is still active.
      status: status === "canceled" && !canceled ? "active" : status,
      currency,
      collection_method: "charge_automatically",
      start_date: created,
      billing_cycle_anchor: anchor,
      cancel_at: null,
      cancel_at_period_end: false,
      canceled_at: endedAt
        ? at(endedAt.getTime() - faker.number.int({ min: day, max: 20 * day }))
        : null,
      ended_at: endedAt,
      trial_start: trialEnd ? created : null,
      trial_end: trialEnd,
      days_until_due: null,
      default_payment_method: null,
      latest_invoice: billed.length > 0 ? `in_demo_${index}_${s}_${billed.length - 1}` : null,
      schedule: scheduleId,
      description: null,
      cancellation_details: endedAt
        ? {
            reason: "cancellation_requested",
            feedback: faker.helpers.arrayElement([
              "too_expensive",
              "unused",
              "switched_service",
              null,
            ]),
            comment: null,
          }
        : null,
      pause_collection: null,
      items,
      metadata: new Map(),
      test_clock: null,
    });
  }

  rows.customers.push({
    id,
    version: now,
    created: customerCreated,
    livemode: false,
    email,
    name,
    phone,
    description: null,
    currency: subscriptionCount > 0 ? currency : null,
    balance: 0n,
    delinquent: rows.subscriptions.some((subscription) => subscription.status === "past_due"),
    tax_exempt: "none",
    invoice_prefix: invoicePrefix,
    invoice_settings: { default_payment_method: null },
    address,
    metadata: new Map(),
    test_clock: null,
    shipping: null,
  });

  const today = Math.floor(now.getTime() / day) * day;
  rows.meter_summaries.push({
    key: `mtr_demo_api_calls:${id}:mtrusg_demo_${index}`,
    id: `mtrusg_demo_${index}`,
    version: now,
    meter: "mtr_demo_api_calls",
    customer: id,
    start_time: new Date(today - day),
    end_time: new Date(today),
    aggregated_value: faker.number.int({ min: 0, max: 5_000 }),
    livemode: false,
  });

  return rows;
};

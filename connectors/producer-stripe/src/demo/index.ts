import { ConnectorApp, Demo, RuntimeConfig } from "@useairfoil/connector-kit";
import { Command } from "effect/cli";

import { BalanceTransactionSchema } from "../schemas/balance-transactions";
import { BillingMeterSchema } from "../schemas/billing-meters";
import { ChargeSchema } from "../schemas/charges";
import { CheckoutSessionSchema } from "../schemas/checkout-sessions";
import { CouponSchema } from "../schemas/coupons";
import { CreditNoteSchema } from "../schemas/credit-notes";
import { CustomerSchema } from "../schemas/customers";
import { DisputeSchema } from "../schemas/disputes";
import { InvoicePaymentSchema } from "../schemas/invoice-payments";
import { InvoiceSchema } from "../schemas/invoices";
import { MeterSummarySchema } from "../schemas/meter-summaries";
import { PaymentIntentSchema } from "../schemas/payment-intents";
import { PayoutSchema } from "../schemas/payouts";
import { PriceSchema } from "../schemas/prices";
import { ProductSchema } from "../schemas/products";
import { PromotionCodeSchema } from "../schemas/promotion-codes";
import { RefundSchema } from "../schemas/refunds";
import { SubscriptionScheduleSchema } from "../schemas/subscription-schedules";
import { SubscriptionSchema } from "../schemas/subscriptions";
import { customerRows } from "./customers";
import { setupRows } from "./setup";

export const demo = Demo.define({
  name: "producer-stripe",
  setup: {
    tables: [
      Demo.table({ name: "products", rowSchema: ProductSchema, version: "version" }),
      Demo.table({ name: "prices", rowSchema: PriceSchema, version: "version" }),
      Demo.table({ name: "billing_meters", rowSchema: BillingMeterSchema, version: "version" }),
      Demo.table({ name: "promotion_codes", rowSchema: PromotionCodeSchema, version: "version" }),
      Demo.table({ name: "coupons", rowSchema: CouponSchema, version: "version" }),
    ],
    rows: setupRows,
  },
  group: {
    tables: [
      Demo.table({ name: "meter_summaries", rowSchema: MeterSummarySchema, version: "version" }),
      Demo.table({ name: "customers", rowSchema: CustomerSchema, version: "version" }),
      Demo.table({ name: "subscriptions", rowSchema: SubscriptionSchema, version: "version" }),
      Demo.table({ name: "invoices", rowSchema: InvoiceSchema, version: "version" }),
      Demo.table({ name: "charges", rowSchema: ChargeSchema, version: "version" }),
      Demo.table({ name: "invoice_payments", rowSchema: InvoicePaymentSchema, version: "version" }),
      Demo.table({ name: "refunds", rowSchema: RefundSchema, version: "version" }),
      Demo.table({ name: "payment_intents", rowSchema: PaymentIntentSchema, version: "version" }),
      Demo.table({ name: "payouts", rowSchema: PayoutSchema, version: "version" }),
      Demo.table({ name: "disputes", rowSchema: DisputeSchema, version: "version" }),
      Demo.table({ name: "credit_notes", rowSchema: CreditNoteSchema, version: "version" }),
      Demo.table({
        name: "checkout_sessions",
        rowSchema: CheckoutSessionSchema,
        version: "version",
      }),
      Demo.table({
        name: "subscription_schedules",
        rowSchema: SubscriptionScheduleSchema,
        version: "version",
      }),
      Demo.table({
        name: "balance_transactions",
        rowSchema: BalanceTransactionSchema,
        version: "version",
      }),
    ],
    rows: customerRows,
  },
});

export const demoCommand = ConnectorApp.makeDemoCommand(demo).pipe(
  Command.provide(RuntimeConfig.layerHosted()),
);

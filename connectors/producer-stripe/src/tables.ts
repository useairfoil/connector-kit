import type { Schema } from "effect";

import { BalanceTransactionSchema } from "./schemas/balance-transactions";
import { BillingMeterSchema } from "./schemas/billing-meters";
import { ChargeSchema } from "./schemas/charges";
import { CheckoutSessionSchema } from "./schemas/checkout-sessions";
import { CouponSchema } from "./schemas/coupons";
import { CreditNoteSchema } from "./schemas/credit-notes";
import { CustomerSchema } from "./schemas/customers";
import { DisputeSchema } from "./schemas/disputes";
import { InvoicePaymentSchema } from "./schemas/invoice-payments";
import { InvoiceSchema } from "./schemas/invoices";
import { MeterSummarySchema } from "./schemas/meter-summaries";
import { PaymentIntentSchema } from "./schemas/payment-intents";
import { PayoutSchema } from "./schemas/payouts";
import { PriceSchema } from "./schemas/prices";
import { ProductSchema } from "./schemas/products";
import { PromotionCodeSchema } from "./schemas/promotion-codes";
import { RefundSchema } from "./schemas/refunds";
import { SubscriptionScheduleSchema } from "./schemas/subscription-schedules";
import { SubscriptionSchema } from "./schemas/subscriptions";

export const tableSchemas: Readonly<Record<string, Schema.Top>> = {
  customers: CustomerSchema,
  products: ProductSchema,
  prices: PriceSchema,
  subscriptions: SubscriptionSchema,
  invoices: InvoiceSchema,
  charges: ChargeSchema,
  invoice_payments: InvoicePaymentSchema,
  refunds: RefundSchema,
  payment_intents: PaymentIntentSchema,
  payouts: PayoutSchema,
  disputes: DisputeSchema,
  credit_notes: CreditNoteSchema,
  checkout_sessions: CheckoutSessionSchema,
  subscription_schedules: SubscriptionScheduleSchema,
  coupons: CouponSchema,
  promotion_codes: PromotionCodeSchema,
  billing_meters: BillingMeterSchema,
  balance_transactions: BalanceTransactionSchema,
  meter_summaries: MeterSummarySchema,
};

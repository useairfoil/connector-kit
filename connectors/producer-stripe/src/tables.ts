import type { Schema } from "effect";

import { ChargeSchema } from "./schemas/charges";
import { CustomerSchema } from "./schemas/customers";
import { InvoicePaymentSchema } from "./schemas/invoice-payments";
import { InvoiceSchema } from "./schemas/invoices";
import { PriceSchema } from "./schemas/prices";
import { ProductSchema } from "./schemas/products";
import { RefundSchema } from "./schemas/refunds";
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
};

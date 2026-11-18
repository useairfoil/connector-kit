import { Schema } from "effect";

import { BenefitGrantSchema } from "./resources/benefit-grants";
import { BenefitSchema } from "./resources/benefits";
import { CheckoutLinkSchema } from "./resources/checkout-links";
import { CheckoutSchema } from "./resources/checkouts";
import { CustomFieldSchema } from "./resources/custom-fields";
import { CustomerMemberSchema } from "./resources/customer-members";
import { CustomerMeterSchema } from "./resources/customer-meters";
import { CustomerSeatSchema } from "./resources/customer-seats";
import { CustomerSchema } from "./resources/customers";
import { DiscountSchema } from "./resources/discounts";
import { DisputeSchema } from "./resources/disputes";
import { LicenseActivationSchema } from "./resources/license-activations";
import { LicenseKeySchema } from "./resources/license-keys";
import { MeterSchema } from "./resources/meters";
import { OrderSchema } from "./resources/orders";
import { PaymentSchema } from "./resources/payments";
import { ProductSchema } from "./resources/products";
import { RefundSchema } from "./resources/refunds";
import { SubscriptionSchema } from "./resources/subscriptions";
import { UsageEventSchema } from "./resources/usage-events";

export const tableSchemas: Readonly<Record<string, Schema.Top>> = {
  customers: CustomerSchema,
  checkouts: CheckoutSchema,
  orders: OrderSchema,
  subscriptions: SubscriptionSchema,
  refunds: RefundSchema,
  products: ProductSchema,
  discounts: DiscountSchema,
  payments: PaymentSchema,
  disputes: DisputeSchema,
  usage_events: UsageEventSchema,
  meters: MeterSchema,
  customer_meters: CustomerMeterSchema,
  benefits: BenefitSchema,
  checkout_links: CheckoutLinkSchema,
  custom_fields: CustomFieldSchema,
  license_keys: LicenseKeySchema,
  benefit_grants: BenefitGrantSchema,
  customer_members: CustomerMemberSchema,
  customer_seats: CustomerSeatSchema,
  license_activations: LicenseActivationSchema,
};

import { ConnectorApp, Demo, RuntimeConfig } from "@useairfoil/connector-kit";
import { Command } from "effect/cli";

import { BenefitGrantSchema } from "../resources/benefit-grants";
import { BenefitSchema } from "../resources/benefits";
import { CheckoutLinkSchema } from "../resources/checkout-links";
import { CheckoutSchema } from "../resources/checkouts";
import { CustomFieldSchema } from "../resources/custom-fields";
import { CustomerMemberSchema } from "../resources/customer-members";
import { CustomerMeterSchema } from "../resources/customer-meters";
import { CustomerSeatSchema } from "../resources/customer-seats";
import { CustomerSchema } from "../resources/customers";
import { DiscountSchema } from "../resources/discounts";
import { DisputeSchema } from "../resources/disputes";
import { LicenseActivationSchema } from "../resources/license-activations";
import { LicenseKeySchema } from "../resources/license-keys";
import { MeterSchema } from "../resources/meters";
import { OrderSchema } from "../resources/orders";
import { PaymentSchema } from "../resources/payments";
import { ProductSchema } from "../resources/products";
import { RefundSchema } from "../resources/refunds";
import { SubscriptionSchema } from "../resources/subscriptions";
import { UsageEventSchema } from "../resources/usage-events";
import { customerRows } from "./customers";
import { setupRows } from "./setup";

export const demo = Demo.define({
  name: "producer-polar",
  setup: {
    tables: [
      Demo.table({ name: "products", rowSchema: ProductSchema, version: "version" }),
      Demo.table({ name: "discounts", rowSchema: DiscountSchema, version: "version" }),
      Demo.table({ name: "meters", rowSchema: MeterSchema, version: "version" }),
      Demo.table({ name: "benefits", rowSchema: BenefitSchema, version: "version" }),
      Demo.table({ name: "custom_fields", rowSchema: CustomFieldSchema, version: "version" }),
      Demo.table({ name: "checkout_links", rowSchema: CheckoutLinkSchema, version: "version" }),
    ],
    rows: setupRows,
  },
  group: {
    tables: [
      Demo.table({ name: "customers", rowSchema: CustomerSchema, version: "version" }),
      Demo.table({ name: "checkouts", rowSchema: CheckoutSchema, version: "version" }),
      Demo.table({ name: "subscriptions", rowSchema: SubscriptionSchema, version: "version" }),
      Demo.table({ name: "orders", rowSchema: OrderSchema, version: "version" }),
      Demo.table({ name: "refunds", rowSchema: RefundSchema, version: "version" }),
      Demo.table({ name: "payments", rowSchema: PaymentSchema, version: "version" }),
      Demo.table({ name: "disputes", rowSchema: DisputeSchema, version: "version" }),
      Demo.table({ name: "usage_events", rowSchema: UsageEventSchema, version: "version" }),
      Demo.table({ name: "customer_meters", rowSchema: CustomerMeterSchema, version: "version" }),
      Demo.table({ name: "customer_members", rowSchema: CustomerMemberSchema, version: "version" }),
      Demo.table({ name: "customer_seats", rowSchema: CustomerSeatSchema, version: "version" }),
      Demo.table({ name: "benefit_grants", rowSchema: BenefitGrantSchema, version: "version" }),
      Demo.table({ name: "license_keys", rowSchema: LicenseKeySchema, version: "version" }),
      Demo.table({
        name: "license_activations",
        rowSchema: LicenseActivationSchema,
        version: "version",
      }),
    ],
    rows: customerRows,
  },
});

export const demoCommand = ConnectorApp.makeDemoCommand(demo).pipe(
  Command.provide(RuntimeConfig.layerHosted()),
);

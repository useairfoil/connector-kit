import { ConnectorApp, Demo, RuntimeConfig } from "@useairfoil/connector-kit";
import { Command } from "effect/cli";

import { ChargeSchema } from "../schemas/charges";
import { CustomerSchema } from "../schemas/customers";
import { InvoicePaymentSchema } from "../schemas/invoice-payments";
import { InvoiceSchema } from "../schemas/invoices";
import { PriceSchema } from "../schemas/prices";
import { ProductSchema } from "../schemas/products";
import { RefundSchema } from "../schemas/refunds";
import { SubscriptionSchema } from "../schemas/subscriptions";
import { customerRows } from "./customers";
import { setupRows } from "./setup";

export const demo = Demo.define({
  name: "producer-stripe",
  setup: {
    tables: [
      Demo.table({ name: "products", rowSchema: ProductSchema, version: "version" }),
      Demo.table({ name: "prices", rowSchema: PriceSchema, version: "version" }),
    ],
    rows: setupRows,
  },
  group: {
    tables: [
      Demo.table({ name: "customers", rowSchema: CustomerSchema, version: "version" }),
      Demo.table({ name: "subscriptions", rowSchema: SubscriptionSchema, version: "version" }),
      Demo.table({ name: "invoices", rowSchema: InvoiceSchema, version: "version" }),
      Demo.table({ name: "charges", rowSchema: ChargeSchema, version: "version" }),
      Demo.table({ name: "invoice_payments", rowSchema: InvoicePaymentSchema, version: "version" }),
      Demo.table({ name: "refunds", rowSchema: RefundSchema, version: "version" }),
    ],
    rows: customerRows,
  },
});

export const demoCommand = ConnectorApp.makeDemoCommand(demo).pipe(
  Command.provide(RuntimeConfig.layerHosted()),
);

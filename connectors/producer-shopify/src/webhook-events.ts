export const webhookTopics = {
  products_create: "products/create",
  products_update: "products/update",
  products_delete: "products/delete",
  carts_create: "carts/create",
  carts_update: "carts/update",
  customers_create: "customers/create",
  customers_disable: "customers/disable",
  customers_enable: "customers/enable",
  customers_update: "customers/update",
  customers_purchasing_summary: "customers/purchasing_summary",
  customers_email_marketing_consent_update: "customers_email_marketing_consent/update",
  customers_marketing_consent_update: "customers_marketing_consent/update",
  customer_tags_added: "customer.tags_added",
  customer_tags_removed: "customer.tags_removed",
  customers_delete: "customers/delete",
  orders_create: "orders/create",
  orders_updated: "orders/updated",
  orders_delete: "orders/delete",
  refunds_create: "refunds/create",
} as const;

export const webhookSubscriptions = [
  {
    resource: "products",
    types: [
      webhookTopics.products_create,
      webhookTopics.products_update,
      webhookTopics.products_delete,
    ],
  },
  { resource: "carts", types: [webhookTopics.carts_create, webhookTopics.carts_update] },
  {
    resource: "customers",
    types: [
      webhookTopics.customers_create,
      webhookTopics.customers_disable,
      webhookTopics.customers_enable,
      webhookTopics.customers_update,
      webhookTopics.customers_purchasing_summary,
      webhookTopics.customers_email_marketing_consent_update,
      webhookTopics.customers_marketing_consent_update,
      webhookTopics.customer_tags_added,
      webhookTopics.customer_tags_removed,
      webhookTopics.customers_delete,
    ],
  },
  {
    resource: "orders",
    types: [webhookTopics.orders_create, webhookTopics.orders_updated, webhookTopics.orders_delete],
  },
  { resource: "refunds", types: [webhookTopics.refunds_create] },
];

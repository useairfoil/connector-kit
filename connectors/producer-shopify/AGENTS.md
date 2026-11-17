# Shopify producer

- Webhooks: `POST /webhooks/shopify`, for products, customers, orders, refunds
  and carts (webhook only). The rest is polled.
- API version: in the GraphQL URL, `SHOPIFY_API_VERSION` in
  `src/api/graphql.ts`. [Changelog](https://shopify.dev/changelog).

## Rules

- Handle GraphQL errors even when HTTP is OK. Respect `Retry-After` and
  throttle data.
- Customer webhooks leave fields out, so every customer topic reads the
  customer again.
- Product webhook can leave out variants or inventory links. Then read the
  product again.
- `refunds/create` comes before settlement. So a refund transaction webhook
  reads the order's refunds again.
- Without `read_all_orders`, only the last 60 days of orders. A missing order
  gives no rows.
- Order child tables read only orders updated since the last run. A child
  change moves the order `updated_at`.
- Keep values the same between GraphQL and webhooks. Skip `shipping_refund`
  order adjustments, GraphQL shows them as refund shipping lines.
- `shopifyPaymentsAccount` is null when the store doesn't use Shopify Payments.

## Versions and deletes

- Use Shopify timestamps for versions where there is one.
- Refunds: `processedAt` in backfill, webhook time otherwise.
- Product, customer and order deletes send `_deleted: true`, versioned by
  `X-Shopify-Triggered-At`. Shopify deletes are permanent, so other rows leave
  `_deleted` out. An update sent with a delete can have a later time, it must
  not undo the delete.

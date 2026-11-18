import { type ConnectorError, Cursor, Fetch, Resource } from "@useairfoil/connector-kit";
import { DateTime, Duration, Effect, Option, Schema } from "effect";

import type { ShopifyApiClientService } from "../api/client";

import {
  OrderTransactionSchema,
  FulfillmentSchema,
  FulfillmentOrderSchema,
  Transaction,
  Fulfillment,
  FulfillmentOrder,
  id,
} from "./schemas/order-children";
import { connection, nextCursor, pollPages } from "./shared";

export {
  OrderTransactionSchema,
  FulfillmentSchema,
  FulfillmentOrderSchema,
} from "./schemas/order-children";

const OrdersCursor = Schema.fromJsonString(
  Schema.Struct({
    since: Schema.String,
    until: Schema.optional(Schema.String),
    after: Schema.optional(Schema.String),
  }),
);
// Orders can save with an older `updated_at`, so each window starts early.
const overlap = Duration.minutes(1);

/**
 * Reads records that hang off orders. Backfill reads every order once. A
 * child changes its order's `updated_at`, so changes read only orders updated
 * since the last run.
 */
export const orderPages = <Order, Row extends object>(options: {
  readonly api: Pick<ShopifyApiClientService, "fetchGraphQL">;
  readonly operationName: string;
  readonly fields: string;
  readonly order: Schema.Decoder<Order>;
  readonly pageSize: number;
  /** Extra order search terms, such as a status filter. */
  readonly filter?: string;
  readonly rows: (
    orders: ReadonlyArray<Order>,
    first: number,
  ) => Effect.Effect<ReadonlyArray<Row>, ConnectorError>;
}) => {
  const query = `#graphql
query ${options.operationName}($first: Int!, $after: String, $query: String) {
  orders(first: $first, after: $after, query: $query, sortKey: UPDATED_AT) {
    nodes { ${options.fields} }
    pageInfo { hasNextPage endCursor }
  }
}
`;
  const schema = Schema.Struct({ orders: connection(options.order) });
  const read = (first: number, after: string | undefined, updated?: string) =>
    options.api
      .fetchGraphQL({
        operationName: options.operationName,
        query,
        schema,
        variables: {
          first,
          after,
          query: [options.filter, updated].filter((term) => term !== undefined).join(" ") || null,
        },
      })
      .pipe(
        Effect.flatMap(({ orders }) =>
          options
            .rows(orders.nodes, first)
            .pipe(Effect.map((rows) => ({ rows, next: nextCursor(orders.pageInfo) }))),
        ),
      );
  return {
    check: read(1, undefined).pipe(Effect.asVoid),
    backfill: Fetch.page({
      pageCursor: Cursor.string(),
      cutoff: Cursor.isoDateTime(),
      fetch: ({ pageCursor }) =>
        read(options.pageSize, typeof pageCursor === "string" ? pageCursor : undefined).pipe(
          Effect.map(({ rows, next }) => ({
            rows,
            nextPageCursor: next,
            hasMore: next !== undefined,
          })),
        ),
    }),
    changes: Fetch.changes({
      cursor: Cursor.string(),
      interval: Duration.hours(1),
      fetch: ({ cursor }) =>
        Effect.gen(function* () {
          // The first cursor is the backfill cutoff.
          const state = Option.getOrElse(Schema.decodeUnknownOption(OrdersCursor)(cursor), () => ({
            since: String(cursor),
            until: undefined,
            after: undefined,
          }));
          const until = state.until ?? DateTime.formatIso(yield* DateTime.now);
          const since = DateTime.formatIso(
            DateTime.subtractDuration(DateTime.makeUnsafe(state.since), overlap),
          );
          const { rows, next } = yield* read(
            options.pageSize,
            state.after,
            `updated_at:>='${since}' updated_at:<='${until}'`,
          );
          return {
            rows,
            cursor: Schema.encodeSync(OrdersCursor)(
              next === undefined ? { since: until } : { since: state.since, until, after: next },
            ),
            hasMore: next !== undefined,
          };
        }),
    }),
  };
};

const orderChildren = <A extends { readonly id: string }>(
  api: Pick<ShopifyApiClientService, "fetchGraphQL">,
  operationName: string,
  fields: string,
  item: Schema.Decoder<A>,
) =>
  orderPages({
    api,
    operationName,
    fields: `id children: ${fields}`,
    order: Schema.Struct({ id, children: Schema.Array(item) }),
    pageSize: 25,
    rows: (orders) =>
      DateTime.nowAsDate.pipe(
        Effect.map((version) =>
          orders.flatMap((order) =>
            order.children.map((child) => ({ ...child, orderId: order.id, version })),
          ),
        ),
      ),
  });

export const makeOrderTransactions = (api: Pick<ShopifyApiClientService, "fetchGraphQL">) =>
  Resource.entity({
    name: "order_transactions",
    rowSchema: OrderTransactionSchema,
    version: "version",
    ...orderChildren(
      api,
      "AirfoilOrderTransactions",
      `transactions {
      id kind status createdAt gateway parentTransaction { id }
      amountSet { shopMoney { amount currencyCode } presentmentMoney { amount currencyCode } }
    }`,
      Transaction,
    ),
  });

export const makeFulfillments = (api: Pick<ShopifyApiClientService, "fetchGraphQL">) =>
  Resource.entity({
    name: "fulfillments",
    rowSchema: FulfillmentSchema,
    version: "version",
    ...orderChildren(
      api,
      "AirfoilFulfillments",
      `fulfillments {
      id status createdAt updatedAt trackingInfo { company number url }
    }`,
      Fulfillment,
    ),
  });

const FulfillmentOrdersQuery = `#graphql
query AirfoilFulfillmentOrders($first: Int!, $after: String) {
  fulfillmentOrders(first: $first, after: $after, includeClosed: true) {
    nodes { id orderId status requestStatus createdAt updatedAt }
    pageInfo { hasNextPage endCursor }
  }
}
`;
const FulfillmentOrdersData = Schema.Struct({ fulfillmentOrders: connection(FulfillmentOrder) });

export const makeFulfillmentOrders = (api: Pick<ShopifyApiClientService, "fetchGraphQL">) =>
  Resource.entity({
    name: "fulfillment_orders",
    rowSchema: FulfillmentOrderSchema,
    version: "updatedAt",
    ...pollPages(50, (first, after) =>
      api
        .fetchGraphQL({
          operationName: "AirfoilFulfillmentOrders",
          query: FulfillmentOrdersQuery,
          schema: FulfillmentOrdersData,
          variables: { first, after },
        })
        .pipe(
          Effect.map(({ fulfillmentOrders }) => ({
            rows: fulfillmentOrders.nodes,
            next: nextCursor(fulfillmentOrders.pageInfo),
          })),
        ),
    ),
  });

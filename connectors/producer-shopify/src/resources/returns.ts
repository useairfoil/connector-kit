import { type ConnectorError, Resource } from "@useairfoil/connector-kit";
import { DateTime, Effect, Option, Schema, Stream } from "effect";

import type { ShopifyApiClientService } from "../api/client";

import { orderPages } from "./order-children";
import {
  ReturnSchema,
  ReverseDeliverySchema,
  Return,
  ReverseDelivery,
  Id,
} from "./schemas/returns";
import { connection, nextCursor } from "./shared";

export { ReturnSchema, ReverseDeliverySchema } from "./schemas/returns";

type Api = Pick<ShopifyApiClientService, "fetchGraphQL">;

const readChildren = <Item>(
  api: Api,
  operationName: string,
  parent: string,
  edge: string,
  fields: string,
  item: Schema.Decoder<Item>,
) => {
  const schema = Schema.Struct({
    parent: Schema.NullOr(Schema.Struct({ children: connection(item) })),
  });
  const query = `#graphql
query ${operationName}($id: ID!, $first: Int!, $after: String) {
  parent: ${parent}(id: $id) {
    children: ${edge}(first: $first, after: $after) {
      nodes { ${fields} }
      pageInfo { hasNextPage endCursor }
    }
  }
}
`;
  return (id: string, first: number) =>
    Stream.paginate(Option.none<string>(), (cursor) =>
      Effect.gen(function* () {
        const after = Option.getOrUndefined(cursor);
        const { parent } = yield* api.fetchGraphQL({
          operationName,
          query,
          schema,
          variables: { id, first, after },
        });
        if (!parent) return [[], Option.none()] as const;
        const { nodes, pageInfo } = parent.children;
        const next = nextCursor(pageInfo);
        return [
          nodes,
          first === 1 ? Option.none() : Option.map(Option.fromNullishOr(next), Option.some),
        ] as const;
      }),
    ).pipe(Stream.runCollect);
};

// Only orders with a return have anything to read.
const returnedOrders = <Row extends object>(
  api: Api,
  operationName: string,
  read: (
    id: string,
    version: Date,
    first: number,
  ) => Effect.Effect<ReadonlyArray<Row>, ConnectorError>,
) =>
  orderPages({
    api,
    operationName,
    fields: "id",
    order: Id,
    pageSize: 15,
    filter: "-return_status:no_return",
    rows: (orders, first) =>
      Effect.gen(function* () {
        const version = yield* DateTime.nowAsDate;
        const rows = yield* Effect.forEach(
          orders,
          ({ id }) => read(id, version, first === 1 ? 1 : 50),
          { concurrency: 3 },
        );
        return rows.flat();
      }),
  });

export const makeReturns = (api: Api) => {
  const returns = readChildren(
    api,
    "AirfoilOrderReturns",
    "order",
    "returns",
    "id name status createdAt closedAt requestApprovedAt totalQuantity",
    Return,
  );
  const returnIds = readChildren(api, "AirfoilReturnIds", "order", "returns", "id", Id);
  const fulfillmentOrders = readChildren(
    api,
    "AirfoilReverseFulfillmentOrders",
    "return",
    "reverseFulfillmentOrders",
    "id",
    Id,
  );
  const deliveries = readChildren(
    api,
    "AirfoilReverseDeliveries",
    "reverseFulfillmentOrder",
    "reverseDeliveries",
    "id deliverable { __typename }",
    ReverseDelivery,
  );
  return [
    Resource.entity({
      name: "returns",
      rowSchema: ReturnSchema,
      version: "version",
      ...returnedOrders(api, "AirfoilReturnedOrderIds", (orderId, version, first) =>
        returns(orderId, first).pipe(
          Effect.map((items) => items.map((item) => ({ ...item, orderId, version }))),
        ),
      ),
    }),
    Resource.entity({
      name: "reverse_deliveries",
      rowSchema: ReverseDeliverySchema,
      version: "version",
      ...returnedOrders(api, "AirfoilReverseDeliveryOrderIds", (orderId, version, first) =>
        Effect.gen(function* () {
          const returns = yield* returnIds(orderId, first);
          const rows = yield* Effect.forEach(returns, ({ id: returnId }) =>
            Effect.gen(function* () {
              const fulfillment = yield* fulfillmentOrders(returnId, first);
              const rows = yield* Effect.forEach(fulfillment, ({ id: reverseFulfillmentOrderId }) =>
                deliveries(reverseFulfillmentOrderId, first).pipe(
                  Effect.map((items) =>
                    items.map((item) => ({
                      ...item,
                      orderId,
                      returnId,
                      reverseFulfillmentOrderId,
                      version,
                    })),
                  ),
                ),
              );
              return rows.flat();
            }),
          );
          return rows.flat();
        }),
      ),
    }),
  ];
};

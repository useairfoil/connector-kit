import { type ConnectorError, Iceberg, Resource } from "@useairfoil/connector-kit";
import { DateTime, Effect, Option, Schema, Stream } from "effect";

import type { ShopifyApiClientService } from "../api/client";

import { orderPages } from "./order-children";
import { connection, nextCursor, readVersion } from "./shared";

type Api = Pick<ShopifyApiClientService, "fetchGraphQL">;

const Id = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Shopify record ID." })),
});
const DateOrNull = Schema.NullOr(Schema.DateFromString);

const Return = Schema.Struct({
  ...Id.fields,
  name: Schema.String.pipe(Schema.annotateKey({ description: "Display name in Shopify." })),
  status: Schema.String.pipe(Schema.annotateKey({ description: "Current status in Shopify." })),
  createdAt: Schema.DateFromString.pipe(
    Schema.annotateKey({ description: "Time Shopify created the record." }),
  ),
  closedAt: DateOrNull.pipe(Schema.annotateKey({ description: "Time the return was closed." })),
  requestApprovedAt: DateOrNull.pipe(
    Schema.annotateKey({ description: "Time the return request was approved." }),
  ),
  totalQuantity: Schema.Int.pipe(Schema.annotateKey({ description: "Total number of units." })),
});

const ReverseDelivery = Schema.Struct({
  ...Id.fields,
  deliverable: Schema.NullOr(
    Schema.Struct({
      __typename: Schema.String.pipe(
        Schema.annotateKey({ description: "GraphQL type of the delivery method." }),
      ),
    }),
  ).pipe(Schema.annotateKey({ description: "Delivery method for the returned goods." })),
});

export const ReturnSchema = Return.mapFields((fields) => ({
  ...fields,
  orderId: Schema.String.pipe(
    Schema.annotateKey({ description: "Order that contains the return." }),
  ),
  version: readVersion,
}))
  .annotate({ description: "Returns requested for Shopify orders." })
  .pipe(Iceberg.identifier("id"));

export const ReverseDeliverySchema = ReverseDelivery.mapFields((fields) => ({
  ...fields,
  orderId: Schema.String.pipe(
    Schema.annotateKey({ description: "Order that contains the return." }),
  ),
  returnId: Schema.String.pipe(
    Schema.annotateKey({ description: "Return this delivery belongs to." }),
  ),
  reverseFulfillmentOrderId: Schema.String.pipe(
    Schema.annotateKey({ description: "Reverse fulfillment order that groups these items." }),
  ),
  version: readVersion,
}))
  .annotate({ description: "Return shipments and how they are delivered." })
  .pipe(Iceberg.identifier("id"));

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

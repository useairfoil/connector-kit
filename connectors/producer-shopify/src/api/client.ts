import { ConnectorError } from "@useairfoil/connector-kit";
import { Config, Context, Effect, Layer, Option, Schema, Stream } from "effect";
import { HttpClient } from "effect/http";

import type { ShopifyConnectionConfig } from "../manifest";
import type { Customer } from "../resources/customers/row";
import type { Order } from "../resources/orders/row";
import type { Product } from "../resources/products/row";
import type { Refund } from "../resources/refunds/row";

import {
  CustomerAddressesQuery,
  CustomerByIdQuery,
  CustomersQuery,
  GraphQLCustomerAddressesSchema,
  GraphQLCustomerByIdDataSchema,
  type GraphQLCustomerNode,
  GraphQLCustomersDataSchema,
  normalizeCustomerNode,
} from "../resources/customers/graphql";
import {
  GraphQLDiscountApplicationsSchema,
  GraphQLLineItemsSchema,
  type GraphQLOrderNode,
  GraphQLOrdersDataSchema,
  GraphQLShippingLinesSchema,
  OrderDiscountApplicationsQuery,
  OrderLineItemsQuery,
  OrderShippingLinesQuery,
  OrdersQuery,
  fromOrderNode,
} from "../resources/orders/graphql";
import {
  GraphQLProductByIdDataSchema,
  type GraphQLProductNode,
  GraphQLProductVariantNodeSchema,
  GraphQLProductsDataSchema,
  ProductByIdQuery,
  ProductVariantsQuery,
  ProductsQuery,
  normalizeProductNode,
} from "../resources/products/graphql";
import {
  GraphQLOrderAdjustmentsSchema,
  GraphQLOrderRefundsDataSchema,
  GraphQLRefundLineItemsSchema,
  type GraphQLRefundNode,
  GraphQLRefundShippingLinesSchema,
  GraphQLRefundTransactionsSchema,
  OrderRefundsQuery,
  RefundLineItemsQuery,
  RefundOrderAdjustmentsQuery,
  RefundShippingLinesQuery,
  RefundTransactionsQuery,
  fromRefundNode,
} from "../resources/refunds/graphql";
import { type PageInfo, connection } from "../resources/shared";
import * as ShopifyAuth from "./auth";
import * as ShopifyGraphQL from "./graphql";

export type ShopifyPage<A> = {
  readonly items: ReadonlyArray<A>;
  readonly endCursor: string | null;
  readonly hasMore: boolean;
};

type PageRequest = { readonly first: number; readonly after?: string };

export type ShopifyApiClientService = {
  readonly checkConnection: Effect.Effect<void, ConnectorError>;
  readonly checkProductsAccess: Effect.Effect<void, ConnectorError>;
  readonly checkOrdersAccess: Effect.Effect<void, ConnectorError>;
  readonly checkCustomersAccess: Effect.Effect<void, ConnectorError>;
  readonly fetchGraphQL: <A>(options: {
    readonly operationName: string;
    readonly query: string;
    readonly variables?: Record<string, unknown>;
    readonly schema: Schema.Decoder<A>;
  }) => Effect.Effect<A, ConnectorError>;
  readonly fetchProducts: (
    options: PageRequest,
  ) => Effect.Effect<ShopifyPage<Product>, ConnectorError>;
  /** Gets every variant page, or none when the product is gone. */
  readonly fetchProductById: (id: string) => Effect.Effect<Option.Option<Product>, ConnectorError>;
  /** Gets every page of line items, shipping lines, and discounts. */
  readonly fetchOrders: (options: PageRequest) => Effect.Effect<ShopifyPage<Order>, ConnectorError>;
  readonly fetchRefunds: (
    options: PageRequest,
  ) => Effect.Effect<ShopifyPage<Refund>, ConnectorError>;
  readonly fetchCustomers: (
    options: PageRequest,
  ) => Effect.Effect<ShopifyPage<Customer>, ConnectorError>;
  /** Gets every address page, or none when the customer is gone. */
  readonly fetchCustomerById: (
    id: string,
  ) => Effect.Effect<Option.Option<Customer>, ConnectorError>;
};

export class ShopifyApiClient extends Context.Service<ShopifyApiClient, ShopifyApiClientService>()(
  "@useairfoil/producer-shopify/ShopifyApiClient",
) {}

// Protected fields make this fail without protected customer data access.
const CustomersAccessQuery = `#graphql
query AirfoilCustomersAccess {
  customers(first: 1) {
    nodes {
      id
      defaultEmailAddress { emailAddress }
      defaultPhoneNumber { phoneNumber }
      defaultAddress { address1 }
    }
  }
}
`;

const OrdersAccessQuery = `#graphql
query AirfoilOrdersAccess {
  orders(first: 1) {
    nodes {
      id
      email
      phone
      shippingAddress { address1 }
    }
  }
}
`;

const ProductsAccessQuery = `#graphql
query AirfoilProductsAccess {
  products(first: 1) {
    nodes {
      id
    }
  }
}
`;

const ShopIdentityQuery = `#graphql
query AirfoilShopIdentity {
  shop {
    id
  }
}
`;

const ShopIdentitySchema = Schema.Struct({
  shop: Schema.Struct({ id: Schema.String }),
});

const ProductsAccessSchema = Schema.Struct({
  products: Schema.Struct({
    nodes: Schema.Array(Schema.Struct({ id: Schema.String })),
  }),
});

const OrdersAccessSchema = Schema.Struct({
  orders: Schema.Struct({ nodes: Schema.Array(Schema.Struct({ id: Schema.String })) }),
});

const CustomersAccessSchema = Schema.Struct({
  customers: Schema.Struct({ nodes: Schema.Array(Schema.Struct({ id: Schema.String })) }),
});

// Follow-up queries alias the parent as `node` and the list as `connection`.
const nestedPageSchema = <S extends Schema.Top>(connection: S) =>
  Schema.Struct({ node: Schema.NullOr(Schema.Struct({ connection })) });

export const make = Effect.fnUntraced(function* (config: ShopifyConnectionConfig) {
  const fetchGraphQL = yield* ShopifyGraphQL.make(config);

  const nextPageCursor = (pageInfo: PageInfo): Option.Option<string> =>
    pageInfo.hasNextPage ? Option.fromNullishOr(pageInfo.endCursor) : Option.none();

  const fetchProductById = (id: string) =>
    fetchGraphQL({
      operationName: "AirfoilProductById",
      query: ProductByIdQuery,
      variables: { id },
      schema: GraphQLProductByIdDataSchema,
    }).pipe(
      Effect.flatMap((data) => {
        const node = data.product;
        if (node === null) {
          return Effect.succeed(Option.none());
        }
        return loadProduct(node).pipe(Effect.map(Option.some));
      }),
    );

  const followConnection = <A>(
    first: { readonly nodes: ReadonlyArray<A>; readonly pageInfo: PageInfo },
    options: {
      readonly id: string;
      readonly operationName: string;
      readonly query: string;
      readonly schema: Schema.Decoder<{
        readonly node: {
          readonly connection: { readonly nodes: ReadonlyArray<A>; readonly pageInfo: PageInfo };
        } | null;
      }>;
    },
  ): Effect.Effect<ReadonlyArray<A>, ConnectorError> =>
    Option.match(nextPageCursor(first.pageInfo), {
      onNone: () => Effect.succeed(first.nodes),
      onSome: (initialCursor) =>
        Stream.paginate(initialCursor, (after) =>
          fetchGraphQL({
            operationName: options.operationName,
            query: options.query,
            variables: { id: options.id, first: 100, after },
            schema: options.schema,
          }).pipe(
            Effect.flatMap(({ node }) =>
              node === null
                ? Effect.fail(
                    new ConnectorError({
                      message: `Shopify record disappeared during ${options.operationName}`,
                    }),
                  )
                : Effect.succeed([
                    node.connection.nodes,
                    nextPageCursor(node.connection.pageInfo),
                  ] as const),
            ),
          ),
        ).pipe(
          Stream.runCollect,
          Effect.map((rest) => [...first.nodes, ...rest]),
        ),
    });

  const loadOrder = (node: GraphQLOrderNode) =>
    Effect.all({
      discountApplications: followConnection(node.discountApplications, {
        id: node.id,
        operationName: "AirfoilOrderDiscountApplications",
        query: OrderDiscountApplicationsQuery,
        schema: nestedPageSchema(GraphQLDiscountApplicationsSchema),
      }),
      shippingLines: followConnection(node.shippingLines, {
        id: node.id,
        operationName: "AirfoilOrderShippingLines",
        query: OrderShippingLinesQuery,
        schema: nestedPageSchema(GraphQLShippingLinesSchema),
      }),
      lineItems: followConnection(node.lineItems, {
        id: node.id,
        operationName: "AirfoilOrderLineItems",
        query: OrderLineItemsQuery,
        schema: nestedPageSchema(GraphQLLineItemsSchema),
      }),
    }).pipe(Effect.map((nested) => fromOrderNode(node, nested)));

  const loadRefund = (orderId: string, node: GraphQLRefundNode) =>
    Effect.all({
      transactions: followConnection(node.transactions, {
        id: node.id,
        operationName: "AirfoilRefundTransactions",
        query: RefundTransactionsQuery,
        schema: nestedPageSchema(GraphQLRefundTransactionsSchema),
      }),
      refundLineItems: followConnection(node.refundLineItems, {
        id: node.id,
        operationName: "AirfoilRefundLineItems",
        query: RefundLineItemsQuery,
        schema: nestedPageSchema(GraphQLRefundLineItemsSchema),
      }),
      refundShippingLines: followConnection(node.refundShippingLines, {
        id: node.id,
        operationName: "AirfoilRefundShippingLines",
        query: RefundShippingLinesQuery,
        schema: nestedPageSchema(GraphQLRefundShippingLinesSchema),
      }),
      orderAdjustments: followConnection(node.orderAdjustments, {
        id: node.id,
        operationName: "AirfoilRefundOrderAdjustments",
        query: RefundOrderAdjustmentsQuery,
        schema: nestedPageSchema(GraphQLOrderAdjustmentsSchema),
      }),
    }).pipe(Effect.map((nested) => fromRefundNode(orderId, node, nested)));

  const loadCustomer = (node: GraphQLCustomerNode) =>
    followConnection(node.addressesV2, {
      id: node.id,
      operationName: "AirfoilCustomerAddresses",
      query: CustomerAddressesQuery,
      schema: nestedPageSchema(GraphQLCustomerAddressesSchema),
    }).pipe(Effect.map((addresses) => normalizeCustomerNode(node, addresses)));

  const loadProduct = (node: GraphQLProductNode) =>
    followConnection(node.variants, {
      id: node.id,
      operationName: "AirfoilProductVariants",
      query: ProductVariantsQuery,
      schema: nestedPageSchema(connection(GraphQLProductVariantNodeSchema)),
    }).pipe(Effect.map((variants) => normalizeProductNode(node, variants)));

  const toPage = <A>(
    pageInfo: PageInfo,
    items: Effect.Effect<ReadonlyArray<A>, ConnectorError>,
  ): Effect.Effect<ShopifyPage<A>, ConnectorError> =>
    items.pipe(
      Effect.map((loaded) => ({
        items: loaded,
        endCursor: pageInfo.endCursor,
        hasMore: pageInfo.hasNextPage,
      })),
    );

  const fetchProducts = (options: PageRequest) =>
    fetchGraphQL({
      operationName: "AirfoilProducts",
      query: ProductsQuery,
      variables: { first: options.first, after: options.after ?? null },
      schema: GraphQLProductsDataSchema,
    }).pipe(
      Effect.flatMap(({ products }) =>
        toPage(products.pageInfo, Effect.forEach(products.nodes, loadProduct)),
      ),
    );

  const fetchOrders = (options: PageRequest) =>
    fetchGraphQL({
      operationName: "AirfoilOrders",
      query: OrdersQuery,
      variables: { first: options.first, after: options.after ?? null },
      schema: GraphQLOrdersDataSchema,
    }).pipe(
      Effect.flatMap(({ orders }) =>
        toPage(orders.pageInfo, Effect.forEach(orders.nodes, loadOrder)),
      ),
    );

  const fetchRefunds = (options: PageRequest) =>
    fetchGraphQL({
      operationName: "AirfoilOrderRefunds",
      query: OrderRefundsQuery,
      variables: { first: options.first, after: options.after ?? null },
      schema: GraphQLOrderRefundsDataSchema,
    }).pipe(
      Effect.flatMap(({ orders }) =>
        toPage(
          orders.pageInfo,
          Effect.forEach(orders.nodes, (order) =>
            Effect.forEach(order.refunds, (refund) => loadRefund(order.id, refund)),
          ).pipe(Effect.map((refunds) => refunds.flat())),
        ),
      ),
    );

  const fetchCustomers = (options: PageRequest) =>
    fetchGraphQL({
      operationName: "AirfoilCustomers",
      query: CustomersQuery,
      variables: { first: options.first, after: options.after ?? null },
      schema: GraphQLCustomersDataSchema,
    }).pipe(
      Effect.flatMap(({ customers }) =>
        toPage(customers.pageInfo, Effect.forEach(customers.nodes, loadCustomer)),
      ),
    );

  const fetchCustomerById = (id: string) =>
    fetchGraphQL({
      operationName: "AirfoilCustomerById",
      query: CustomerByIdQuery,
      variables: { id },
      schema: GraphQLCustomerByIdDataSchema,
    }).pipe(
      Effect.flatMap(({ customer }) =>
        customer === null
          ? Effect.succeed(Option.none())
          : loadCustomer(customer).pipe(Effect.map(Option.some)),
      ),
    );

  const checkCustomersAccess = fetchGraphQL({
    operationName: "AirfoilCustomersAccess",
    query: CustomersAccessQuery,
    schema: CustomersAccessSchema,
  }).pipe(Effect.asVoid);

  const checkOrdersAccess = fetchGraphQL({
    operationName: "AirfoilOrdersAccess",
    query: OrdersAccessQuery,
    schema: OrdersAccessSchema,
  }).pipe(Effect.asVoid);

  const checkConnection = fetchGraphQL({
    operationName: "AirfoilShopIdentity",
    query: ShopIdentityQuery,
    schema: ShopIdentitySchema,
  }).pipe(Effect.asVoid);

  const checkProductsAccess = fetchGraphQL({
    operationName: "AirfoilProductsAccess",
    query: ProductsAccessQuery,
    schema: ProductsAccessSchema,
  }).pipe(Effect.asVoid);

  return {
    checkConnection,
    checkProductsAccess,
    checkOrdersAccess,
    checkCustomersAccess,
    fetchGraphQL,
    fetchProducts,
    fetchProductById,
    fetchOrders,
    fetchRefunds,
    fetchCustomers,
    fetchCustomerById,
  };
});

export const layer = (
  config: ShopifyConnectionConfig,
): Layer.Layer<ShopifyApiClient, ConnectorError, HttpClient.HttpClient | ShopifyAuth.ShopifyAuth> =>
  Layer.effect(ShopifyApiClient)(make(config));

export const layerConfig = (
  config: Config.Wrap<ShopifyConnectionConfig>,
): Layer.Layer<
  ShopifyApiClient,
  ConnectorError | Config.ConfigError,
  HttpClient.HttpClient | ShopifyAuth.ShopifyAuth
> => Layer.effect(ShopifyApiClient)(Config.unwrap(config).pipe(Effect.flatMap(make)));

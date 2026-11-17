import type { Headers } from "effect/http";

import {
  Connector,
  ConnectorError,
  Cursor,
  Fetch,
  Resource,
  type ResourceDefinition,
  Webhook,
} from "@useairfoil/connector-kit";
import {
  Config,
  Context,
  DateTime,
  Duration,
  Effect,
  Layer,
  Option,
  Redacted,
  Result,
  Schema,
  Stream,
} from "effect";
import { Base64 } from "effect/encoding";
import { HttpServerResponse } from "effect/http";
import { Webhook as StandardWebhook } from "standardwebhooks";

import * as PolarApiClient from "./api";
import { manifest, type PolarConfig, type PolarWebhookConfig } from "./manifest";
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
import { type ListResponse } from "./resources/shared";
import { SubscriptionSchema } from "./resources/subscriptions";
import { UsageEventSchema } from "./resources/usage-events";
import {
  CheckoutEventSchema,
  checkoutEventTypes,
  CustomerEventSchema,
  customerEventTypes,
  DiscountEventSchema,
  discountEventTypes,
  OrderEventSchema,
  orderEventTypes,
  ProductEventSchema,
  productEventTypes,
  RefundEventSchema,
  refundEventTypes,
  SubscriptionEventSchema,
  subscriptionEventTypes,
  WebhookPayloadSchema,
} from "./webhooks";
export { manifest, PolarConfigDef } from "./manifest";
export type { PolarConfig } from "./manifest";

const verifyWebhookSignature = (options: {
  readonly rawBody: Uint8Array;
  readonly headers: Headers.Headers;
  readonly secret: string;
}): Effect.Effect<void, ConnectorError> =>
  Effect.try({
    try: () => {
      const body = Buffer.from(options.rawBody);
      try {
        new StandardWebhook(options.secret).verify(body, options.headers);
      } catch {
        // Secrets made before 8 September 2026 are keyed by the base64 of the whole string.
        new StandardWebhook(Base64.encode(options.secret)).verify(body, options.headers);
      }
    },
    catch: (error) =>
      new ConnectorError({
        message: "Invalid Polar webhook signature",
        cause: error,
      }),
  });

const withEventVersion = <Row extends { readonly version: Date }>(
  row: Row,
  version: Date,
): Row => ({ ...row, version });

const pageResource = <Key extends string, Row extends { readonly [K in Key]: Date }>(options: {
  readonly api: PolarApiClient.PolarApiClientService;
  readonly schema: Schema.Decoder<Row>;
  readonly path: string;
  readonly cursorField: Key;
  readonly sorting?: string;
}) =>
  Fetch.page({
    pageCursor: Cursor.number(),
    cutoff: Cursor.isoDateTime(),
    fetch: ({ pageCursor, cutoff }) => {
      const page = typeof pageCursor === "number" ? pageCursor : 1;
      const sorting = options.sorting ?? `-${options.cursorField}`;
      const cutoffTime = DateTime.toEpochMillis(DateTime.makeUnsafe(String(cutoff)));

      return options.api
        .fetchList(options.schema, options.path, {
          page,
          limit: 100,
          sorting,
        })
        .pipe(
          Effect.map((response) => ({
            rows: response.items.filter((row) => row[options.cursorField].getTime() <= cutoffTime),
            nextPageCursor: page + 1,
            hasMore: page < response.pagination.max_page,
          })),
        );
    },
  });

const changesInterval = Duration.minutes(10);
// Records can commit a little after their timestamp, so each read starts early.
const changesOverlap = Duration.toMillis(Duration.minutes(1));
const reopenLimit = 20;

const OpenRecordsCursor = Schema.fromJsonString(
  Schema.Struct({
    from: Schema.Finite,
    through: Schema.optional(Schema.Finite),
    page: Schema.Int,
    open: Schema.Array(Schema.String),
  }),
);

// Payments and disputes have no webhooks and can't sort by `modified_at`.
// Changes read new records by `created_at` and re-read open ones by ID.
const openRecordChanges = <
  Row extends { readonly id: string; readonly created_at: Date },
>(options: {
  readonly api: PolarApiClient.PolarApiClientService;
  readonly schema: Schema.Decoder<Row>;
  readonly path: string;
  readonly isOpen: (row: Row) => boolean;
}) =>
  Fetch.changes({
    cursor: Cursor.string(),
    interval: changesInterval,
    fetch: ({ cursor }) =>
      Effect.gen(function* () {
        // The first run reads every record once to find the open ones.
        const state = Option.getOrElse(
          Schema.decodeUnknownOption(OpenRecordsCursor)(cursor),
          () => ({ from: 0, through: undefined, page: 1, open: [] }),
        );
        const through =
          state.through ?? DateTime.toEpochMillis(yield* DateTime.now) - changesOverlap;
        const from = state.from - changesOverlap;
        const response = yield* options.api.fetchList(options.schema, options.path, {
          page: state.page,
          limit: 100,
          sorting: "-created_at",
        });
        const created = response.items.filter((row) => {
          const time = row.created_at.getTime();
          return time >= from && time <= through;
        });
        const hasMore =
          state.page < response.pagination.max_page &&
          response.items.every((row) => row.created_at.getTime() >= from);
        const seen = new Set(created.map((row) => row.id));
        const open = state.open.filter((id) => !seen.has(id));
        const reopen = hasMore ? [] : open.slice(0, reopenLimit);
        const reread = yield* Effect.forEach(
          reopen,
          (id) => options.api.fetchJson(options.schema, `${options.path}${id}`),
          { concurrency: 4 },
        );
        const rows = [...created, ...reread];
        const stillOpen = new Set([
          ...open.slice(reopen.length),
          ...rows.filter(options.isOpen).map((row) => row.id),
        ]);
        return {
          rows,
          cursor: Schema.encodeSync(OpenRecordsCursor)({
            from: hasMore ? state.from : through,
            through: hasMore ? through : undefined,
            page: hasMore ? state.page + 1 : 1,
            open: [...stillOpen],
          }),
          hasMore,
        };
      }),
  });

const EventsCursor = Schema.fromJsonString(
  Schema.Struct({ from: Schema.Finite, through: Schema.Finite, page: Schema.Int }),
);

const listEvents = (
  api: PolarApiClient.PolarApiClientService,
  page: number,
  params: Record<string, string>,
) =>
  api.fetchList(UsageEventSchema, "events/", { page, limit: 100, sorting: "-timestamp", params });

const listAll = <A>(
  api: PolarApiClient.PolarApiClientService,
  schema: Schema.Decoder<A>,
  path: string,
) =>
  Stream.paginate(1, (page: number) =>
    api
      .fetchList(schema, path, { page, limit: 100, sorting: "-created_at" })
      .pipe(
        Effect.map(
          ({ items, pagination }) =>
            [items, page < pagination.max_page ? Option.some(page + 1) : Option.none()] as const,
        ),
      ),
  ).pipe(Stream.runCollect);

type RowPage<Row> = { readonly rows: ReadonlyArray<Row>; readonly hasMore: boolean };

const listPage =
  <A>(api: PolarApiClient.PolarApiClientService, schema: Schema.Decoder<A>, path: string) =>
  (page: number): Effect.Effect<RowPage<A>, ConnectorError> =>
    api.fetchList(schema, path, { page, limit: 100, sorting: "-created_at" }).pipe(
      Effect.map((response) => ({
        rows: response.items,
        hasMore: page < response.pagination.max_page,
      })),
    );

const childPage =
  <Parent, Row>(options: {
    readonly parents: (page: number) => Effect.Effect<ListResponse<Parent>, ConnectorError>;
    readonly children: (parent: Parent) => Effect.Effect<ReadonlyArray<Row>, ConnectorError>;
  }) =>
  (page: number): Effect.Effect<RowPage<Row>, ConnectorError> =>
    options.parents(page).pipe(
      Effect.flatMap((response) =>
        Effect.forEach(response.items, options.children, { concurrency: 4 }).pipe(
          Effect.map((children) => ({
            rows: children.flat(),
            hasMore: page < response.pagination.max_page,
          })),
        ),
      ),
    );

const backfillPages = <Row extends { readonly created_at: Date }>(
  read: (page: number) => Effect.Effect<RowPage<Row>, ConnectorError>,
) =>
  Fetch.page({
    pageCursor: Cursor.number(),
    cutoff: Cursor.isoDateTime(),
    fetch: ({ pageCursor, cutoff }) => {
      const page = typeof pageCursor === "number" ? pageCursor : 1;
      const cutoffTime = DateTime.toEpochMillis(DateTime.makeUnsafe(String(cutoff)));
      return read(page).pipe(
        Effect.map(({ rows, hasMore }) => ({
          rows: rows.filter((row) => row.created_at.getTime() <= cutoffTime),
          nextPageCursor: page + 1,
          hasMore,
        })),
      );
    },
  });

/**
 * These have no webhooks and can't sort by `modified_at`, so changes read
 * them in full. The first cursor is the backfill cutoff, so page cursors
 * carry a prefix.
 */
const pollPages = <Row extends object>(
  read: (page: number) => Effect.Effect<RowPage<Row>, ConnectorError>,
  interval = Duration.hours(1),
) =>
  Fetch.changes({
    cursor: Cursor.string(),
    interval,
    fetch: ({ cursor }) => {
      const value = String(cursor);
      const page = value.startsWith("page:") ? Number(value.slice(5)) : 1;
      return read(page).pipe(
        Effect.map(({ rows, hasMore }) => ({
          rows,
          cursor: hasMore ? `page:${page + 1}` : "",
          hasMore,
        })),
      );
    },
  });

const Parent = Schema.Struct({ id: Schema.String });
const SeatParent = Schema.Struct({ id: Schema.String, seats: Schema.NullOr(Schema.Int) });
const SeatList = Schema.Struct({ seats: Schema.Array(CustomerSeatSchema) });
const LicenseKeyActivations = Schema.Struct({ activations: Schema.Array(LicenseActivationSchema) });

const build = Effect.gen(function* () {
  const api = yield* PolarApiClient.PolarApiClient;

  const Customers = Resource.entity({
    name: "customers",
    rowSchema: CustomerSchema,
    version: "version",

    check: api
      .fetchList(CustomerSchema, "customers/", { page: 1, limit: 1, sorting: "-created_at" })
      .pipe(Effect.asVoid),
    backfill: pageResource({
      api,
      schema: CustomerSchema,
      path: "customers/",
      cursorField: "created_at",
    }),
    webhook: {
      schema: CustomerEventSchema,
      handler: ({ payload }) => Effect.succeed([withEventVersion(payload.data, payload.timestamp)]),
    },
  });

  const Checkouts = Resource.entity({
    name: "checkouts",
    rowSchema: CheckoutSchema,
    version: "version",

    check: api
      .fetchList(CheckoutSchema, "checkouts/", { page: 1, limit: 1, sorting: "-created_at" })
      .pipe(Effect.asVoid),
    backfill: pageResource({
      api,
      schema: CheckoutSchema,
      path: "checkouts/",
      cursorField: "created_at",
    }),
    webhook: {
      schema: CheckoutEventSchema,
      handler: ({ payload }) => Effect.succeed([withEventVersion(payload.data, payload.timestamp)]),
    },
  });

  const Orders = Resource.entity({
    name: "orders",
    rowSchema: OrderSchema,
    version: "version",

    check: api
      .fetchList(OrderSchema, "orders/", { page: 1, limit: 1, sorting: "-created_at" })
      .pipe(Effect.asVoid),
    backfill: pageResource({
      api,
      schema: OrderSchema,
      path: "orders/",
      cursorField: "created_at",
    }),
    webhook: {
      schema: OrderEventSchema,
      handler: ({ payload }) => Effect.succeed([withEventVersion(payload.data, payload.timestamp)]),
    },
  });

  const Subscriptions = Resource.entity({
    name: "subscriptions",
    rowSchema: SubscriptionSchema,
    version: "version",

    check: api
      .fetchList(SubscriptionSchema, "subscriptions/", {
        page: 1,
        limit: 1,
        sorting: "-started_at",
      })
      .pipe(Effect.asVoid),
    backfill: pageResource({
      api,
      schema: SubscriptionSchema,
      path: "subscriptions/",
      cursorField: "created_at",
      // Polar does not sort subscriptions by created_at.
      sorting: "-started_at",
    }),
    webhook: {
      schema: SubscriptionEventSchema,
      handler: ({ payload }) => Effect.succeed([withEventVersion(payload.data, payload.timestamp)]),
    },
  });

  const Refunds = Resource.entity({
    name: "refunds",
    rowSchema: RefundSchema,
    version: "version",

    check: api
      .fetchList(RefundSchema, "refunds/", { page: 1, limit: 1, sorting: "-created_at" })
      .pipe(Effect.asVoid),
    backfill: pageResource({
      api,
      schema: RefundSchema,
      path: "refunds/",
      cursorField: "created_at",
    }),
    webhook: {
      schema: RefundEventSchema,
      handler: ({ payload }) => Effect.succeed([withEventVersion(payload.data, payload.timestamp)]),
    },
  });

  const Products = Resource.entity({
    name: "products",
    rowSchema: ProductSchema,
    version: "version",

    check: api
      .fetchList(ProductSchema, "products/", { page: 1, limit: 1, sorting: "-created_at" })
      .pipe(Effect.asVoid),
    backfill: pageResource({
      api,
      schema: ProductSchema,
      path: "products/",
      cursorField: "created_at",
    }),
    webhook: {
      schema: ProductEventSchema,
      handler: ({ payload }) => Effect.succeed([withEventVersion(payload.data, payload.timestamp)]),
    },
  });

  const Discounts = Resource.entity({
    name: "discounts",
    rowSchema: DiscountSchema,
    version: "version",

    check: api
      .fetchList(DiscountSchema, "discounts/", { page: 1, limit: 1, sorting: "-created_at" })
      .pipe(Effect.asVoid),
    backfill: pageResource({
      api,
      schema: DiscountSchema,
      path: "discounts/",
      cursorField: "created_at",
    }),
    webhook: {
      schema: DiscountEventSchema,
      handler: ({ payload }) =>
        Effect.succeed([
          payload.type === "discount.deleted"
            ? { id: payload.data.id, version: payload.timestamp, _deleted: true }
            : withEventVersion(payload.data, payload.timestamp),
        ]),
    },
  });

  const Payments = Resource.entity({
    name: "payments",
    rowSchema: PaymentSchema,
    version: "version",

    check: api
      .fetchList(PaymentSchema, "payments/", { page: 1, limit: 1, sorting: "-created_at" })
      .pipe(Effect.asVoid),
    backfill: pageResource({
      api,
      schema: PaymentSchema,
      path: "payments/",
      cursorField: "created_at",
    }),
    changes: openRecordChanges({
      api,
      schema: PaymentSchema,
      path: "payments/",
      isOpen: (payment) => payment.status === "pending",
    }),
  });

  const Disputes = Resource.entity({
    name: "disputes",
    rowSchema: DisputeSchema,
    version: "version",

    check: api
      .fetchList(DisputeSchema, "disputes/", { page: 1, limit: 1, sorting: "-created_at" })
      .pipe(Effect.asVoid),
    backfill: pageResource({
      api,
      schema: DisputeSchema,
      path: "disputes/",
      cursorField: "created_at",
    }),
    changes: openRecordChanges({
      api,
      schema: DisputeSchema,
      path: "disputes/",
      isOpen: (dispute) => !dispute.closed,
    }),
  });

  const UsageEvents = Resource.entity({
    name: "usage_events",
    rowSchema: UsageEventSchema,
    version: "version",

    check: listEvents(api, 1, {}).pipe(Effect.asVoid),
    backfill: Fetch.page({
      pageCursor: Cursor.number(),
      cutoff: Cursor.isoDateTime(),
      fetch: ({ pageCursor, cutoff }) => {
        const page = typeof pageCursor === "number" ? pageCursor : 1;
        return listEvents(api, page, { end_timestamp: String(cutoff) }).pipe(
          Effect.map((response) => ({
            rows: response.items,
            nextPageCursor: page + 1,
            hasMore: page < response.pagination.max_page,
          })),
        );
      },
    }),
    // Events don't change, so changes read each new time window once.
    changes: Fetch.changes({
      cursor: Cursor.string(),
      interval: changesInterval,
      fetch: ({ cursor }) =>
        Effect.gen(function* () {
          const now = DateTime.toEpochMillis(yield* DateTime.now);
          // The first cursor is the backfill cutoff, then the end of the last window.
          const state = Option.getOrElse(Schema.decodeUnknownOption(EventsCursor)(cursor), () => ({
            from: DateTime.toEpochMillis(DateTime.makeUnsafe(String(cursor))) - changesOverlap,
            through: now - changesOverlap,
            page: 1,
          }));
          const response = yield* listEvents(api, state.page, {
            start_timestamp: DateTime.formatIso(DateTime.makeUnsafe(state.from)),
            end_timestamp: DateTime.formatIso(DateTime.makeUnsafe(state.through)),
          });
          const hasMore = state.page < response.pagination.max_page;
          return {
            rows: response.items,
            cursor: hasMore
              ? Schema.encodeSync(EventsCursor)({ ...state, page: state.page + 1 })
              : DateTime.formatIso(DateTime.makeUnsafe(state.through)),
            hasMore,
          };
        }),
    }),
  });

  const Meters = Resource.entity({
    name: "meters",
    rowSchema: MeterSchema,
    version: "version",

    check: api
      .fetchList(MeterSchema, "meters/", { page: 1, limit: 1, sorting: "-created_at" })
      .pipe(Effect.asVoid),
    backfill: pageResource({
      api,
      schema: MeterSchema,
      path: "meters/",
      cursorField: "created_at",
    }),
    changes: pollPages(listPage(api, MeterSchema, "meters/")),
  });

  const CustomerMeters = Resource.entity({
    name: "customer_meters",
    rowSchema: CustomerMeterSchema,
    version: "version",

    check: api
      .fetchList(CustomerMeterSchema, "customer-meters/", {
        page: 1,
        limit: 1,
        sorting: "-created_at",
      })
      .pipe(Effect.asVoid),
    backfill: pageResource({
      api,
      schema: CustomerMeterSchema,
      path: "customer-meters/",
      cursorField: "created_at",
    }),
    changes: pollPages(listPage(api, CustomerMeterSchema, "customer-meters/")),
  });

  const Benefits = Resource.entity({
    name: "benefits",
    rowSchema: BenefitSchema,
    version: "version",

    check: api
      .fetchList(BenefitSchema, "benefits/", { page: 1, limit: 1, sorting: "-created_at" })
      .pipe(Effect.asVoid),
    backfill: pageResource({
      api,
      schema: BenefitSchema,
      path: "benefits/",
      cursorField: "created_at",
    }),
    changes: pollPages(listPage(api, BenefitSchema, "benefits/")),
  });

  const BenefitGrants = Resource.entity({
    name: "benefit_grants",
    rowSchema: BenefitGrantSchema,
    version: "version",

    check: api
      .fetchList(BenefitGrantSchema, "benefit-grants/", {
        page: 1,
        limit: 1,
        sorting: "-created_at",
      })
      .pipe(Effect.asVoid),
    backfill: pageResource({
      api,
      schema: BenefitGrantSchema,
      path: "benefit-grants/",
      cursorField: "created_at",
    }),
    changes: pollPages(listPage(api, BenefitGrantSchema, "benefit-grants/")),
  });

  const CheckoutLinks = Resource.entity({
    name: "checkout_links",
    rowSchema: CheckoutLinkSchema,
    version: "version",

    check: api
      .fetchList(CheckoutLinkSchema, "checkout-links/", {
        page: 1,
        limit: 1,
        sorting: "-created_at",
      })
      .pipe(Effect.asVoid),
    backfill: pageResource({
      api,
      schema: CheckoutLinkSchema,
      path: "checkout-links/",
      cursorField: "created_at",
    }),
    changes: pollPages(listPage(api, CheckoutLinkSchema, "checkout-links/")),
  });

  const CustomFields = Resource.entity({
    name: "custom_fields",
    rowSchema: CustomFieldSchema,
    version: "version",

    check: api
      .fetchList(CustomFieldSchema, "custom-fields/", { page: 1, limit: 1, sorting: "-created_at" })
      .pipe(Effect.asVoid),
    backfill: pageResource({
      api,
      schema: CustomFieldSchema,
      path: "custom-fields/",
      cursorField: "created_at",
    }),
    changes: pollPages(listPage(api, CustomFieldSchema, "custom-fields/")),
  });

  const LicenseKeys = Resource.entity({
    name: "license_keys",
    rowSchema: LicenseKeySchema,
    version: "version",

    check: api
      .fetchList(LicenseKeySchema, "license-keys/", { page: 1, limit: 1, sorting: "-created_at" })
      .pipe(Effect.asVoid),
    backfill: pageResource({
      api,
      schema: LicenseKeySchema,
      path: "license-keys/",
      cursorField: "created_at",
    }),
    changes: pollPages(listPage(api, LicenseKeySchema, "license-keys/")),
  });

  const listParents = <A>(schema: Schema.Decoder<A>, path: string, page: number) =>
    api.fetchList(schema, path, { page, limit: 100, sorting: "-created_at" });

  // Polar lists members only per customer.
  const memberPage = childPage({
    parents: (page) => listParents(Parent, "customers/", page),
    children: ({ id }) => listAll(api, CustomerMemberSchema, `customers/${id}/members`),
  });

  const CustomerMembers = Resource.entity({
    name: "customer_members",
    rowSchema: CustomerMemberSchema,
    version: "version",

    check: api.fetchList(Parent, "customers/", { page: 1, limit: 1, sorting: "-created_at" }).pipe(
      Effect.flatMap(({ items }) =>
        Effect.forEach(items, ({ id }) =>
          api.fetchList(Parent, `customers/${id}/members`, {
            page: 1,
            limit: 1,
            sorting: "-created_at",
          }),
        ),
      ),
      Effect.asVoid,
    ),
    backfill: backfillPages(memberPage),
    changes: pollPages(memberPage, Duration.days(1)),
  });

  // Polar lists seats only per order or subscription. Only seat-based ones have seats.
  const seatPage = childPage({
    parents: (page) =>
      Effect.all([
        listParents(SeatParent, "orders/", page),
        api.fetchList(SeatParent, "subscriptions/", { page, limit: 100, sorting: "-started_at" }),
      ]).pipe(
        Effect.map(([orders, subscriptions]) => ({
          items: [
            ...orders.items.map(({ id, seats }) => ({ seats, params: { order_id: id } })),
            ...subscriptions.items.map(({ id, seats }) => ({
              seats,
              params: { subscription_id: id },
            })),
          ],
          pagination: {
            total_count: orders.pagination.total_count + subscriptions.pagination.total_count,
            max_page: Math.max(orders.pagination.max_page, subscriptions.pagination.max_page),
          },
        })),
      ),
    children: ({ seats, params }) =>
      seats === null
        ? Effect.succeed([])
        : api.fetchJson(SeatList, "customer-seats", params).pipe(Effect.map((list) => list.seats)),
  });

  const CustomerSeats = Resource.entity({
    name: "customer_seats",
    rowSchema: CustomerSeatSchema,
    version: "version",

    // A subscription without seats still returns an empty list.
    check: api
      .fetchList(Parent, "subscriptions/", { page: 1, limit: 1, sorting: "-started_at" })
      .pipe(
        Effect.flatMap(({ items }) =>
          Effect.forEach(items, ({ id }) =>
            api.fetchJson(SeatList, "customer-seats", { subscription_id: id }),
          ),
        ),
        Effect.asVoid,
      ),
    backfill: backfillPages(seatPage),
    changes: pollPages(seatPage, Duration.days(1)),
  });

  // Activations come only with a single license key.
  const activationPage = childPage({
    parents: (page) => listParents(Parent, "license-keys/", page),
    children: ({ id }) =>
      api
        .fetchJson(LicenseKeyActivations, `license-keys/${id}`)
        .pipe(Effect.map((key) => key.activations)),
  });

  const LicenseActivations = Resource.entity({
    name: "license_activations",
    rowSchema: LicenseActivationSchema,
    version: "version",

    check: listParents(Parent, "license-keys/", 1).pipe(Effect.asVoid),
    backfill: backfillPages(activationPage),
    changes: pollPages(activationPage, Duration.days(1)),
  });

  const byType = new Map<string, ResourceDefinition>(
    [
      { resource: Customers, eventTypes: customerEventTypes },
      { resource: Checkouts, eventTypes: checkoutEventTypes },
      { resource: Orders, eventTypes: orderEventTypes },
      { resource: Subscriptions, eventTypes: subscriptionEventTypes },
      { resource: Refunds, eventTypes: refundEventTypes },
      { resource: Products, eventTypes: productEventTypes },
      { resource: Discounts, eventTypes: discountEventTypes },
    ].flatMap(({ resource, eventTypes }) => eventTypes.map((type) => [type, resource])),
  );

  const connector = Connector.define({
    name: "producer-polar",
    title: "Polar",
    resources: [
      Customers,
      Checkouts,
      Orders,
      Subscriptions,
      Refunds,
      Products,
      Discounts,
      Payments,
      Disputes,
      UsageEvents,
      Meters,
      CustomerMeters,
      Benefits,
      CheckoutLinks,
      CustomFields,
      LicenseKeys,
      BenefitGrants,
      CustomerMembers,
      CustomerSeats,
      LicenseActivations,
    ],
  });

  return {
    connector,
    webhooks: (config: PolarWebhookConfig) =>
      Effect.succeed([
        Webhook.route({
          path: manifest.webhook.path,
          ackMode: "after-ingest",
          verify: ({ request, rawBody, payload }) =>
            verifyWebhookSignature({
              rawBody,
              headers: request.headers,
              secret: Redacted.value(config.webhookSecret),
            }).pipe(Effect.as(byType.has(payload.type))),
          schema: WebhookPayloadSchema,
          handler: ({ request, rawBody, payload, to }) =>
            Effect.gen(function* () {
              const verified = yield* verifyWebhookSignature({
                rawBody,
                headers: request.headers,
                secret: Redacted.value(config.webhookSecret),
              }).pipe(Effect.result);
              if (Result.isFailure(verified)) {
                return HttpServerResponse.jsonUnsafe(
                  { ok: false, error: verified.failure.message },
                  { status: 401 },
                );
              }

              const resource = byType.get(payload.type);
              if (resource !== undefined && "data" in payload) {
                yield* to(resource, payload);
              }

              return HttpServerResponse.jsonUnsafe({ ok: true });
            }),
        }),
      ]),
  };
});

export const resources = build.pipe(Effect.map(({ connector }) => connector.resources));

export const webhooks = (config: PolarWebhookConfig) =>
  build.pipe(Effect.flatMap((built) => built.webhooks(config)));

export const make = Effect.fnUntraced(function* (config: PolarConfig) {
  const built = yield* build;
  const webhooks = yield* built.webhooks(config);

  return Connector.define({ ...built.connector, webhooks });
});

export type PolarConnectorRuntime = Effect.Success<ReturnType<typeof make>>;

export class PolarConnector extends Context.Service<PolarConnector, PolarConnectorRuntime>()(
  "@useairfoil/producer-polar/PolarConnector",
) {}

export const layer = (config: PolarConfig) =>
  Layer.effect(PolarConnector)(make(config).pipe(Effect.annotateLogs({ component: "polar" }))).pipe(
    Layer.provide(PolarApiClient.layer(config)),
  );

export const layerConfig = (config: Config.Wrap<PolarConfig>) =>
  Layer.unwrap(Config.unwrap(config).pipe(Effect.map(layer)));

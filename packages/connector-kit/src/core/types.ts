import type { Duration, Effect, Schema } from "effect";
import type { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http";

import type { ConnectorError } from "../errors";
import type { Identified, RequiredField } from "../iceberg/annotations";

export namespace Cursor {
  export type Value = string | number | Date;

  export type Kind = "string" | "number" | "isoDateTime";

  export type Definition<T extends Value = Value> = {
    readonly kind: Kind;
    readonly decode: (value: unknown) => Effect.Effect<T, ConnectorError>;
  };
}

/** Rows and an optional cursor from one resource. */
export type ResourceBatch<Row extends object = object> = {
  readonly cursor?: Cursor.Value;
  readonly rows: ReadonlyArray<Row>;
};

export type ResourceState = {
  readonly backfill?: {
    readonly cutoff: Cursor.Value;
    readonly pageCursor?: Cursor.Value;
    readonly completed: boolean;
    readonly lastSuccessAt?: string;
  };
  readonly changes?: {
    readonly cursor: Cursor.Value;
    readonly lastSuccessAt?: string;
  };
  readonly lastError?: {
    readonly source: "backfill" | "changes";
    readonly operation: "fetch" | "ingest" | "checkpoint";
    readonly code: "fetch_failed" | "ingest_failed" | "checkpoint_failed";
    readonly message: string;
    readonly at: string;
  };
};

export type SyncState = "pending" | "backfilling" | "live" | "error";

/** A row schema with its key, set by `Iceberg.identifier`. */
export type ResourceSchema = Schema.Decoder<object> & Identified<string>;

/**
 * Takes a resource schema and returns its decoded row object type.
 *
 * @example
 * ```ts
 * const ProductSchema = Schema.Struct({ id: Schema.String, updatedAt: Schema.String }).pipe(
 *   Iceberg.identifier("id"),
 * );
 * type Product = ResourceRow<typeof ProductSchema>;
 * // Result:
 * // type Product = { readonly id: string; readonly updatedAt: string }
 * ```
 */
export type ResourceRow<S extends ResourceSchema> = Schema.Schema.Type<S>;

/**
 * Takes a resource schema and returns the string keys available on its row type.
 *
 * @example
 * ```ts
 * const ProductSchema = Schema.Struct({ id: Schema.String, updatedAt: Schema.String }).pipe(
 *   Iceberg.identifier("id"),
 * );
 * type ProductField = ResourceField<typeof ProductSchema>;
 * // Result:
 * // type ProductField = "id" | "updatedAt"
 *
 * const version: ResourceField<typeof ProductSchema> = "updatedAt";
 * ```
 */
type KnownResourceField<S extends ResourceSchema> = keyof ResourceRow<S> & string;

export type ResourceField<S extends ResourceSchema> = [KnownResourceField<S>] extends [never]
  ? string
  : KnownResourceField<S>;

/** A row field that cannot be null or undefined. */
export type ResourceRequiredField<S extends ResourceSchema> = RequiredField<S>;

/** The fields that identify a row, from `Iceberg.identifier`. */
export type ResourceKey<S extends ResourceSchema> = S extends Identified<infer Key> ? Key : never;

/** Deletes a row: its key, version, and `_deleted: true`. */
export type ResourceDelete<S extends ResourceSchema, Version extends ResourceField<S>> = Pick<
  ResourceRow<S>,
  Extract<ResourceKey<S> | Version, keyof ResourceRow<S>>
> & {
  readonly _deleted: true;
};

/** A full row, or a delete. The engine replaces the whole row. */
export type ResourceUpdate<S extends ResourceSchema, Version extends ResourceField<S>> =
  | (ResourceRow<S> & { readonly _deleted?: boolean })
  | ResourceDelete<S, Version>;

export type FetchPageResult<Row extends object> = {
  readonly rows: ReadonlyArray<Row>;
  readonly nextPageCursor?: Cursor.Value;
  readonly hasMore: boolean;
};

export type PageFetch<Row extends object, R = never> = {
  readonly pageCursor: Cursor.Definition;
  readonly cutoff: Cursor.Definition;
  readonly fetch: (input: {
    readonly pageCursor?: Cursor.Value;
    readonly cutoff: Cursor.Value;
  }) => Effect.Effect<FetchPageResult<Row>, ConnectorError, R>;
};

export type FetchChangesResult<Row extends object> = {
  readonly rows: ReadonlyArray<Row>;
  readonly cursor: Cursor.Value;
  /** When true, the engine runs the changes again without waiting for the interval. */
  readonly hasMore?: boolean;
};

export type ChangesFetch<Row extends object, R = never> = {
  readonly cursor: Cursor.Definition;
  readonly interval?: Duration.Input;
  readonly fetch: (input: {
    readonly cursor: Cursor.Value;
  }) => Effect.Effect<FetchChangesResult<Row>, ConnectorError, R>;
};

export type WebhookHandler<Row extends object, Payload> = {
  /** Types the payload. The route decodes it before `to`. */
  readonly schema: Schema.Decoder<Payload>;
  handler(input: { readonly payload: Payload }): Effect.Effect<ReadonlyArray<Row>, ConnectorError>;
};

export type ResourceDefinition<
  S extends ResourceSchema = ResourceSchema,
  Payload = unknown,
  R = never,
  Name extends string = string,
  Version extends ResourceRequiredField<S> = ResourceRequiredField<S>,
> = {
  readonly name: Name;
  /** Types the rows, and names the key. The Iceberg table decides how they are encoded. */
  readonly rowSchema: S;

  /** Orders updates for the entity. */
  readonly version: Version;

  /** Read-only validation used before provisioning this resource. */
  readonly check: Effect.Effect<void, ConnectorError>;
  readonly backfill?: PageFetch<ResourceRow<NoInfer<S>>, R>;
  readonly changes?: ChangesFetch<ResourceUpdate<NoInfer<S>, NoInfer<Version>>, R>;
  readonly webhook?: WebhookHandler<ResourceUpdate<NoInfer<S>, NoInfer<Version>>, Payload>;
};

/** The parts of a resource its table needs. */
export type TableResource = Pick<ResourceDefinition, "name" | "rowSchema" | "version">;

/** Resources that write to tables, such as a connector or a demo. */
export type TableSource = {
  readonly resources: ReadonlyArray<TableResource>;
};

/**
 * Takes a connector resource tuple and returns a `{ [resourceName]: rowType }`
 * map.
 *
 * @example
 * ```ts
 * type Rows = ResourceRows<[typeof Products, typeof Orders]>;
 * // Result:
 * // type Rows = {
 * //   readonly products: Product;
 * //   readonly orders: Order;
 * // }
 *
 * type ProductRow = Rows["products"];
 * // Result:
 * // type ProductRow = Product
 * ```
 */
export type ResourceRows<Resources extends ReadonlyArray<ResourceDefinition>> = {
  readonly [Resource in Resources[number] as Resource["name"]]: Resource extends ResourceDefinition<
    infer S,
    unknown,
    unknown,
    string,
    infer _Version
  >
    ? ResourceRow<S>
    : never;
};

/** Resource names preserved from a connector's resource tuple. */
export type ResourceName<Resources extends ReadonlyArray<ResourceDefinition>> =
  keyof ResourceRows<Resources> & string;

/**
 * Takes a resource definition and returns the payload type accepted by
 * `to(resource, payload)`.
 *
 * @example
 * ```ts
 * type ProductPayload = ResourcePayload<typeof Products>;
 * // Result, if Products was defined with a ProductEvent webhook schema:
 * // type ProductPayload = ProductEvent
 * ```
 */
export type ResourcePayload<R> =
  R extends ResourceDefinition<ResourceSchema, infer Payload, unknown, string, string>
    ? Payload
    : never;

export type WebhookAckMode = "after-enqueue" | "after-ingest";

export type WebhookRouteContext<
  Resources extends ReadonlyArray<ResourceDefinition> = ReadonlyArray<ResourceDefinition>,
  Payload = unknown,
> = {
  readonly request: HttpServerRequest.HttpServerRequest;
  readonly rawBody: Uint8Array;
  readonly payload: Payload;
  /** Runs a resource's webhook handler on a decoded payload and collects its rows. */
  readonly to: <Resource extends Resources[number]>(
    resource: Resource,
    payload: ResourcePayload<Resource>,
  ) => Effect.Effect<void, ConnectorError>;
};

export type WebhookRoute<
  Resources extends ReadonlyArray<ResourceDefinition> = ReadonlyArray<ResourceDefinition>,
  Payload = unknown,
> = {
  readonly path: HttpRouter.PathInput;
  readonly ackMode: WebhookAckMode;
  readonly schema: Schema.Decoder<Payload>;
  handler(
    context: WebhookRouteContext<Resources, Payload>,
  ): Effect.Effect<HttpServerResponse.HttpServerResponse, ConnectorError>;
};

export type WebhookRouteInput<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Payload,
> = WebhookRoute<Resources, Payload>;

/**
 * Takes a resource definition and returns the rows its changes and webhooks may
 * return: full rows or deletes.
 */
export type ResourceUpdateOf<R> =
  R extends ResourceDefinition<infer S, unknown, unknown, string, infer Version>
    ? ResourceUpdate<S, Version>
    : never;

/** Rows from one feed run, by resource name. A missing resource has no rows. */
export type FeedRows<Resources extends ReadonlyArray<ResourceDefinition>> = {
  readonly [Resource in Resources[number] as Resource["name"]]?: ReadonlyArray<
    ResourceUpdateOf<Resource>
  >;
};

export type FetchFeedResult<Resources extends ReadonlyArray<ResourceDefinition>> = {
  readonly rows: FeedRows<Resources>;
  readonly cursor: Cursor.Value;
  /** When true, the engine runs the feed again without waiting for the interval. */
  readonly hasMore?: boolean;
};

/**
 * One changes source for several resources, with one cursor. Use it when one
 * provider log, such as an events API, covers them all.
 */
export type ChangesFeed<
  Resources extends ReadonlyArray<ResourceDefinition> = ReadonlyArray<ResourceDefinition>,
  R = never,
> = {
  readonly resources: Resources;
  readonly cursor: Cursor.Definition;
  readonly interval?: Duration.Input;
  readonly fetch: (input: {
    readonly cursor: Cursor.Value;
    /** The resources that run. Skip the work for the others. */
    readonly selected: ReadonlySet<string>;
  }) => Effect.Effect<FetchFeedResult<Resources>, ConnectorError, R>;
};

export type ConnectorDefinition<
  Resources extends ReadonlyArray<ResourceDefinition> = ReadonlyArray<ResourceDefinition>,
  FeedResources extends ReadonlyArray<ResourceDefinition> = ReadonlyArray<ResourceDefinition>,
> = {
  readonly name: string;
  readonly title?: string;
  readonly resources: Resources;
  /** Shared changes for resources that do not define their own `changes`. */
  readonly changes?: ChangesFeed<FeedResources>;
  readonly webhooks?: ReadonlyArray<WebhookRoute>;
};

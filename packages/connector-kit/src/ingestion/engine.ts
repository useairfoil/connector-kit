import { Array as Arr, DateTime, Effect, Layer, Order, Queue } from "effect";
import { HttpRouter, type HttpServer, HttpServerResponse } from "effect/http";
import * as Observability from "effect/observability";

import type {
  ChangesFeed,
  ConnectorDefinition,
  Cursor,
  ResourceDefinition,
  ResourceState,
  WebhookRoute,
} from "../core/types";
import type { StateOperation, StateSource } from "../state-store/schema";

import { ConnectorError } from "../errors";
import { ingestBatch } from "../ingestor/instrumented";
import { Ingestor } from "../ingestor/service";
import * as Metrics from "../metrics";
import { StateStore } from "../state-store";
import { deriveSyncState, hasChanges, normalizeCursor } from "../state-store/state";
import { statusRoute } from "../status";
import { Attr, SpanName, annotateError } from "../telemetry";
import { router, WebhookQueue, type QueuedWebhookBatch } from "../webhook/server";

type RunBaseOptions = {
  readonly initialCutoff?: Cursor.Value;
};

export type RunOptions = RunBaseOptions & {
  readonly webhook?: {
    readonly routes: ReadonlyArray<WebhookRoute>;
    readonly healthPath?: HttpRouter.PathInput;
    readonly metricsPath?: HttpRouter.PathInput | false;
    readonly statusPath?: HttpRouter.PathInput | false;
    readonly disableHttpLogger?: boolean;
  };
};

type RunNoWebhookOptions = RunBaseOptions & {
  readonly webhook?: undefined;
};

type RunWebhookOptions = RunOptions & {
  readonly webhook: NonNullable<RunOptions["webhook"]>;
};

/**
 * Runs all connector ingestion loops. Callers provide the Ingestor and
 * StateStore layers; webhook mode additionally requires an HttpServer layer.
 */
export function run<const Resources extends ReadonlyArray<ResourceDefinition>>(
  connector: ConnectorDefinition<Resources>,
  options?: RunNoWebhookOptions,
): Effect.Effect<void, ConnectorError, StateStore | Ingestor>;
export function run<const Resources extends ReadonlyArray<ResourceDefinition>>(
  connector: ConnectorDefinition<Resources>,
  options: RunWebhookOptions,
): Effect.Effect<void, ConnectorError, StateStore | Ingestor | HttpServer.HttpServer>;
export function run(definition: ConnectorDefinition, options?: RunOptions) {
  return Effect.gen(function* () {
    // Check the whole feed, even the resources that don't run.
    if (definition.changes) yield* validateFeed(definition, definition.changes);
    const ingestor = yield* Ingestor;
    const connector = selectResources(definition, ingestor.resourceNames);
    const queueLayer = makeWebhookQueueLayer(connector.name);
    const runtimeLayer = options?.webhook
      ? Layer.mergeAll(
          queueLayer,
          makeWebhookServerLayer(connector, options.webhook).pipe(Layer.provide(queueLayer)),
        )
      : Layer.empty;

    return yield* Effect.gen(function* () {
      const initialCutoff =
        options?.initialCutoff ?? (yield* DateTime.now.pipe(Effect.map(DateTime.formatIso)));
      yield* Effect.logInfo("Connector started").pipe(
        Effect.annotateLogs({
          [Attr.connectorName]: connector.name,
          resources: connector.resources.length,
        }),
      );

      const sourceRun = runIngestion(connector, initialCutoff);
      const webhookRun = options?.webhook
        ? runWebhookRuntime(connector, options.webhook.routes)
        : Effect.void;

      return yield* Effect.all([sourceRun, webhookRun], { concurrency: "unbounded" }).pipe(
        Effect.asVoid,
      );
    }).pipe(Effect.provide(runtimeLayer));
  });
}

const selectResources = (
  connector: ConnectorDefinition,
  names: ReadonlyArray<string> | undefined,
): ConnectorDefinition => {
  if (names === undefined) return connector;
  const isSelected = (resource: ResourceDefinition) => names.includes(resource.name);
  const { changes, ...rest } = connector;
  const feedResources = changes?.resources.filter(isSelected) ?? [];
  return {
    ...rest,
    resources: connector.resources.filter(isSelected),
    ...(changes && feedResources.length > 0
      ? { changes: { ...changes, resources: feedResources } }
      : {}),
  };
};

const makeWebhookQueueLayer = (connector: string): Layer.Layer<WebhookQueue> =>
  Layer.effect(WebhookQueue)(
    Effect.gen(function* () {
      const queue = yield* Queue.bounded<QueuedWebhookBatch>(1024);
      yield* Metrics.setWebhookQueueDepth(connector, 0);
      return WebhookQueue.of({ queue });
    }),
  );

const runWebhookRuntime = (connector: ConnectorDefinition, routes: ReadonlyArray<WebhookRoute>) => {
  const hasAfterEnqueue = routes.some((route) => route.ackMode === "after-enqueue");
  return Effect.all(
    [hasAfterEnqueue ? runWebhookQueueConsumer(connector) : Effect.void, Effect.never],
    {
      concurrency: "unbounded",
    },
  ).pipe(Effect.asVoid);
};

const runWebhookQueueConsumer = (connector: ConnectorDefinition) =>
  Effect.gen(function* () {
    const queue = yield* WebhookQueue;
    while (true) {
      const batch = yield* Queue.take(queue.queue);
      const depth = yield* Queue.size(queue.queue);
      yield* Metrics.setWebhookQueueDepth(connector.name, depth);
      yield* ingestBatch({
        connector: connector.name,
        resource: batch.resource,
        source: "webhook",
        batch: batch.batch,
      });
    }
  });

const makeWebhookServerLayer = (
  connector: ConnectorDefinition,
  options: {
    readonly routes: ReadonlyArray<WebhookRoute>;
    readonly healthPath?: HttpRouter.PathInput;
    readonly metricsPath?: HttpRouter.PathInput | false;
    readonly statusPath?: HttpRouter.PathInput | false;
    readonly disableHttpLogger?: boolean;
  },
): Layer.Layer<never, never, HttpServer.HttpServer> => {
  const healthPath: HttpRouter.PathInput = options.healthPath ?? "/health";
  const metricsPath = options.metricsPath === undefined ? "/metrics" : options.metricsPath;
  const statusPath = options.statusPath === undefined ? "/status" : options.statusPath;
  const app = Layer.mergeAll(
    router(options.routes, {
      connectorName: connector.name,
      resourceNames: connector.resources.map((resource) => resource.name),
    }),
    HttpRouter.add("GET", healthPath, Effect.succeed(HttpServerResponse.text("ok"))),
    ...(metricsPath === false
      ? []
      : [Observability.PrometheusMetrics.layerHttp({ path: metricsPath })]),
    ...(statusPath === false ? [] : [statusRoute(connector, statusPath)]),
  );

  return HttpRouter.serve(app, {
    disableLogger: options.disableHttpLogger ?? true,
  });
};

const runIngestion = (
  connector: ConnectorDefinition,
  initialCutoff: Cursor.Value,
): Effect.Effect<void, ConnectorError, StateStore | Ingestor> =>
  Effect.gen(function* () {
    const feed = connector.changes;
    yield* Effect.all(
      [
        Effect.forEach(
          connector.resources,
          (resource) => runResourceSources(connector, resource, initialCutoff),
          { concurrency: "unbounded" },
        ),
        feed ? runChangesFeed(connector, feed, initialCutoff) : Effect.void,
      ],
      { concurrency: "unbounded" },
    );
  });

const bySavedAt = Order.mapInput(
  Order.String,
  (state: NonNullable<ResourceState["changes"]>) => state.lastSuccessAt ?? "",
);

const validateFeed = (connector: ConnectorDefinition, feed: ChangesFeed) =>
  Effect.forEach(feed.resources, (member, index) => {
    if (feed.resources.findIndex((item) => item.name === member.name) !== index) {
      return Effect.fail(
        new ConnectorError({ message: `Resource ${member.name} is in the changes feed twice` }),
      );
    }
    const resource = connector.resources.find((item) => item.name === member.name);
    if (!resource) {
      return Effect.fail(
        new ConnectorError({
          message: `Changes feed resource ${member.name} is not a resource of connector ${connector.name}`,
        }),
      );
    }
    if (resource.changes) {
      return Effect.fail(
        new ConnectorError({
          message: `Resource ${member.name} has its own changes and is also in the changes feed`,
        }),
      );
    }
    return Effect.void;
  }).pipe(
    Effect.andThen(
      feed.resources.length === 0
        ? Effect.fail(new ConnectorError({ message: "The changes feed has no resources" }))
        : Effect.void,
    ),
  );

const initializeResourceState = (
  existing: ResourceState | undefined,
  initialCutoff: Cursor.Value,
): ResourceState => ({
  ...existing,
  changes: existing?.changes ?? { cursor: initialCutoff },
  backfill: existing?.backfill ?? {
    cutoff: initialCutoff,
    completed: false,
  },
});

const getInitializedState = Effect.fnUntraced(function* (
  resource: string,
  initialCutoff: Cursor.Value,
) {
  const store = yield* StateStore;
  const existing = yield* store.getResourceState(resource);
  return initializeResourceState(existing, initialCutoff);
});

const runResourceSources = (
  connector: ConnectorDefinition,
  resource: ResourceDefinition,
  initialCutoff: Cursor.Value,
) => {
  const runs = [
    resource.backfill
      ? isolateSourceFailure(
          runBackfill(connector, resource, initialCutoff),
          connector,
          resource,
          "backfill",
        )
      : Effect.void,
    resource.changes
      ? isolateSourceFailure(
          runChanges(connector, resource, initialCutoff),
          connector,
          resource,
          "changes",
        )
      : Effect.void,
  ];

  return initializeRuntimeStatus(connector, resource, initialCutoff).pipe(
    Effect.andThen(Effect.all(runs, { concurrency: "unbounded" })),
    Effect.asVoid,
    Effect.catch((error) =>
      Metrics.setSyncState({ connector: connector.name, resource: resource.name }, "error").pipe(
        Effect.andThen(Effect.logError("Connector resource initialization failed", error)),
        Effect.annotateLogs({
          [Attr.connectorName]: connector.name,
          resource: resource.name,
        }),
        Effect.andThen(Effect.never),
      ),
    ),
  );
};

const recordResourceError =
  (
    connector: ConnectorDefinition,
    resource: ResourceDefinition,
    source: StateSource,
    operation: StateOperation,
  ) =>
  <A, R>(
    effect: Effect.Effect<A, ConnectorError, R>,
  ): Effect.Effect<A, ConnectorError, R | StateStore> =>
    effect.pipe(
      Effect.tapError(() =>
        Metrics.setSyncState({ connector: connector.name, resource: resource.name }, "error").pipe(
          Effect.andThen(
            StateStore.pipe(
              Effect.flatMap((store) => store.setResourceError(resource.name, source, operation)),
            ),
          ),
        ),
      ),
    );

const isolateSourceFailure = <A, R>(
  effect: Effect.Effect<A, ConnectorError, R>,
  connector: ConnectorDefinition,
  resource: ResourceDefinition,
  source: StateSource,
): Effect.Effect<A, never, R> =>
  // Only typed source errors are isolated. Defects and interruption still stop the runtime.
  effect.pipe(
    Effect.catch((error) =>
      Effect.logError("Connector source parked", error).pipe(
        Effect.annotateLogs({
          [Attr.connectorName]: connector.name,
          resource: resource.name,
          source,
        }),
        Effect.andThen(Effect.never),
      ),
    ),
  );

const refreshRuntimeStatus = Effect.fnUntraced(function* (
  connector: ConnectorDefinition,
  resource: ResourceDefinition,
  initialCutoff: Cursor.Value,
) {
  const state = yield* getInitializedState(resource.name, initialCutoff);
  yield* Metrics.setSyncState(
    { connector: connector.name, resource: resource.name },
    deriveSyncState(connector, resource, state),
  );

  return state;
});

const initializeRuntimeStatus = Effect.fnUntraced(function* (
  connector: ConnectorDefinition,
  resource: ResourceDefinition,
  initialCutoff: Cursor.Value,
) {
  const state = yield* getInitializedState(resource.name, initialCutoff);
  yield* Metrics.setSyncState(
    { connector: connector.name, resource: resource.name },
    deriveSyncState(connector, resource, state),
  );

  if (resource.backfill) {
    yield* Metrics.setLastSuccessTimestamp(
      { connector: connector.name, resource: resource.name, source: "backfill" },
      state.backfill?.lastSuccessAt,
    );
  }
  if (hasChanges(connector, resource)) {
    yield* Metrics.setLastSuccessTimestamp(
      { connector: connector.name, resource: resource.name, source: "changes" },
      state.changes?.lastSuccessAt,
    );
  }
});

const runBackfill = Effect.fnUntraced(function* (
  connector: ConnectorDefinition,
  resource: ResourceDefinition,
  initialCutoff: Cursor.Value,
) {
  if (!resource.backfill) return;
  const store = yield* StateStore;
  let state = yield* getInitializedState(resource.name, initialCutoff);

  if (state.backfill?.completed === true) {
    // The checkpoint may have committed before the previous process cleared
    // its error marker. It may also be hidden by a newer changes error.
    yield* store
      .clearResourceError(resource.name, "backfill")
      .pipe(recordResourceError(connector, resource, "backfill", "checkpoint"));
    yield* refreshRuntimeStatus(connector, resource, initialCutoff);
    return;
  }

  while (state.backfill?.completed !== true) {
    const backfill = state.backfill ?? { cutoff: initialCutoff, completed: false };
    const clearsVisibleError = state.lastError?.source === "backfill";
    const page = yield* resource.backfill
      .fetch({
        pageCursor: backfill.pageCursor,
        cutoff: backfill.cutoff,
      })
      .pipe(recordResourceError(connector, resource, "backfill", "fetch"));

    yield* ingestBatch({
      connector: connector.name,
      resource: resource.name,
      source: "backfill",
      batch: {
        cursor: page.nextPageCursor ?? backfill.cutoff,
        rows: page.rows,
      },
    }).pipe(recordResourceError(connector, resource, "backfill", "ingest"));

    const lastSuccessAt = yield* DateTime.now.pipe(Effect.map(DateTime.formatIso));
    state = {
      ...state,
      backfill: {
        cutoff: backfill.cutoff,
        pageCursor: page.nextPageCursor,
        completed: !page.hasMore,
        lastSuccessAt,
      },
    };

    // Checkpoint only after ingestion succeeds so a crash cannot skip an
    // unacknowledged page; replay therefore remains at-least-once.
    yield* Effect.withSpan(
      store
        .setBackfillState(resource.name, {
          cutoff: normalizeCursor(backfill.cutoff),
          pageCursor:
            page.nextPageCursor === undefined ? undefined : normalizeCursor(page.nextPageCursor),
          completed: !page.hasMore,
          lastSuccessAt,
        })
        .pipe(
          Effect.andThen(
            Metrics.setLastSuccessTimestamp(
              { connector: connector.name, resource: resource.name, source: "backfill" },
              lastSuccessAt,
            ),
          ),
          Effect.andThen(store.clearResourceError(resource.name, "backfill")),
          Effect.tapError((error) => annotateError("state_set", error)),
        ),
      SpanName.stateSet,
      { attributes: { [Attr.stateKey]: resource.name } },
    ).pipe(recordResourceError(connector, resource, "backfill", "checkpoint"));

    // Completion or clearing an error can change the resource-wide sync state.
    if (clearsVisibleError || !page.hasMore) {
      state = yield* refreshRuntimeStatus(connector, resource, initialCutoff);
    }
  }
});

const runChanges = Effect.fnUntraced(function* (
  connector: ConnectorDefinition,
  resource: ResourceDefinition,
  initialCutoff: Cursor.Value,
) {
  if (!resource.changes) return;
  const store = yield* StateStore;

  while (true) {
    const state = yield* getInitializedState(resource.name, initialCutoff);
    const cursor = state.changes?.cursor ?? initialCutoff;
    const clearsVisibleError = state.lastError?.source === "changes";
    const page = yield* resource.changes
      .fetch({ cursor })
      .pipe(recordResourceError(connector, resource, "changes", "fetch"));

    yield* ingestBatch({
      connector: connector.name,
      resource: resource.name,
      source: "changes",
      batch: {
        cursor: page.cursor,
        rows: page.rows,
      },
    }).pipe(recordResourceError(connector, resource, "changes", "ingest"));

    const lastSuccessAt = yield* DateTime.now.pipe(Effect.map(DateTime.formatIso));
    // Advance the durable cursor only after the engine acknowledges the page.
    yield* Effect.withSpan(
      store
        .setChangesState(resource.name, {
          cursor: normalizeCursor(page.cursor),
          lastSuccessAt,
        })
        .pipe(
          Effect.andThen(
            Metrics.setLastSuccessTimestamp(
              { connector: connector.name, resource: resource.name, source: "changes" },
              lastSuccessAt,
            ),
          ),
          Effect.andThen(store.clearResourceError(resource.name, "changes")),
          Effect.tapError((error) => annotateError("state_set", error)),
        ),
      SpanName.stateSet,
      { attributes: { [Attr.stateKey]: resource.name } },
    ).pipe(recordResourceError(connector, resource, "changes", "checkpoint"));

    if (clearsVisibleError) {
      yield* refreshRuntimeStatus(connector, resource, initialCutoff);
    }

    if (!page.hasMore) {
      yield* Effect.sleep(resource.changes.interval ?? "1 minute");
    }
  }
});

// Every member resource stores the feed cursor. All rows are ingested before any
// cursor is written. If a crash stops the writes partway, the next run starts
// from the oldest cursor.
const runChangesFeed = (
  connector: ConnectorDefinition,
  feed: ChangesFeed,
  initialCutoff: Cursor.Value,
): Effect.Effect<void, never, StateStore | Ingestor> =>
  Effect.gen(function* () {
    const store = yield* StateStore;
    const members = feed.resources;
    const selected = new Set(members.map((resource) => resource.name));
    // Any failure stops the whole feed, so it is an error for every resource in it.
    const recordFeedError =
      (operation: StateOperation) =>
      <A, R>(effect: Effect.Effect<A, ConnectorError, R>) =>
        effect.pipe(
          Effect.tapError(() =>
            Effect.forEach(
              members,
              (resource) =>
                Metrics.setSyncState(
                  { connector: connector.name, resource: resource.name },
                  "error",
                ).pipe(Effect.andThen(store.setResourceError(resource.name, "changes", operation))),
              { discard: true },
            ),
          ),
        );

    while (true) {
      const states = yield* Effect.forEach(members, (resource) =>
        store.getResourceState(resource.name),
      );
      // A resource that was off has an older cursor. Resume from the oldest, so it
      // gets the changes it missed. The others read some changes again.
      const saved = states.flatMap((state) => (state?.changes ? [state.changes] : []));
      const cursor = Arr.isReadonlyArrayNonEmpty(saved)
        ? Arr.min(saved, bySavedAt).cursor
        : initialCutoff;
      const result = yield* feed.fetch({ cursor, selected }).pipe(recordFeedError("fetch"));

      yield* Effect.forEach(
        members,
        (resource) =>
          ingestBatch({
            connector: connector.name,
            resource: resource.name,
            source: "changes",
            batch: {
              cursor: result.cursor,
              rows: result.rows[resource.name] ?? [],
            },
          }),
        { discard: true },
      ).pipe(recordFeedError("ingest"));

      const lastSuccessAt = yield* DateTime.now.pipe(Effect.map(DateTime.formatIso));
      yield* Effect.forEach(
        members,
        (resource) =>
          Effect.withSpan(
            store
              .setChangesState(resource.name, {
                cursor: normalizeCursor(result.cursor),
                lastSuccessAt,
              })
              .pipe(
                Effect.andThen(
                  Metrics.setLastSuccessTimestamp(
                    { connector: connector.name, resource: resource.name, source: "changes" },
                    lastSuccessAt,
                  ),
                ),
                Effect.andThen(store.clearResourceError(resource.name, "changes")),
                Effect.tapError((error) => annotateError("state_set", error)),
              ),
            SpanName.stateSet,
            { attributes: { [Attr.stateKey]: resource.name } },
          ),
        { discard: true },
      ).pipe(recordFeedError("checkpoint"));

      yield* Effect.forEach(members, (resource, index) =>
        states[index]?.lastError?.source === "changes"
          ? refreshRuntimeStatus(connector, resource, initialCutoff)
          : Effect.void,
      );

      if (!result.hasMore) {
        yield* Effect.sleep(feed.interval ?? "1 minute");
      }
    }
  }).pipe(
    // Only typed errors park the feed. Defects and interruption still stop the runtime.
    Effect.catch((error) =>
      Effect.logError("Connector changes feed parked", error).pipe(
        Effect.annotateLogs({
          [Attr.connectorName]: connector.name,
          resources: feed.resources.map((resource) => resource.name).join(","),
        }),
        Effect.andThen(Effect.never),
      ),
    ),
  );

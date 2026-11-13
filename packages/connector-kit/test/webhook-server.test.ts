import { NodeHttpServer } from "@effect/platform-node";
import { describe, expect, it } from "@effect/vitest";
import { Deferred, Effect, Layer, Ref, Schema } from "effect";
import { HttpClient, HttpClientRequest, HttpRouter, HttpServerResponse } from "effect/http";

import { Connector, Cursor, Fetch, Resource } from "../src/core";
import { ConnectorError } from "../src/errors";
import { identifier } from "../src/iceberg/annotations";
import { run } from "../src/ingestion/engine";
import { Ingestor, type IngestOptions } from "../src/ingestor/service";
import { layerMemory as StateStoreLayerMemory, StateStore } from "../src/state-store";
import * as Status from "../src/status";
import * as Webhook from "../src/webhook";

const TestRowSchema = Schema.Struct({
  id: Schema.String,
  updatedAt: Schema.String,
}).pipe(identifier("id"));

const TestPayloadSchema = Schema.Struct({
  id: Schema.String,
  updatedAt: Schema.String,
});

const makeIngestorLayer = (
  ingestedRef: Ref.Ref<ReadonlyArray<IngestOptions>>,
  expectedIngestions = 0,
  resourceNames?: ReadonlyArray<string>,
) =>
  Effect.gen(function* () {
    const done = yield* Deferred.make<void>();
    let count = 0;
    const layer = Layer.succeed(Ingestor)({
      resourceNames,
      ingest: (options) =>
        Ref.update(ingestedRef, (ingested) => [...ingested, options]).pipe(
          Effect.tap(() =>
            Effect.sync(() => {
              count += 1;
            }),
          ),
          Effect.tap(() =>
            count >= expectedIngestions ? Deferred.succeed(done, undefined) : Effect.void,
          ),
          Effect.as({ rows: options.batch.rows.length, bytes: 0 }),
        ),
    });
    return { done, layer };
  });

const layerMemoryNotifyingOnError = (onError: () => Effect.Effect<void>) =>
  Layer.effect(StateStore)(
    StateStore.pipe(
      Effect.provide(StateStoreLayerMemory),
      Effect.map((inner) => ({
        ...inner,
        setResourceError: (...args: Parameters<typeof inner.setResourceError>) =>
          inner.setResourceError(...args).pipe(Effect.andThen(onError())),
      })),
    ),
  );

// Webhook runtime is long-lived, so tests run it in a scoped fiber.
const startConnector = (connector: ReturnType<typeof Connector.define>) =>
  Effect.forkScoped(
    run(connector, {
      initialCutoff: "2026-01-01T00:00:00.000Z",
      webhook: { routes: connector.webhooks ?? [] },
    }),
  );

describe("webhook server", () => {
  it.effect("returns 400 for invalid JSON", () =>
    Effect.gen(function* () {
      const route = Webhook.route({
        path: "/webhooks/test",
        ackMode: "after-ingest",
        schema: TestPayloadSchema,
        handler: () => Effect.succeed(HttpServerResponse.jsonUnsafe({ ok: true })),
      });
      const connector = Connector.define({ name: "test", resources: [], webhooks: [route] });
      const ingestedRef = yield* Ref.make<ReadonlyArray<IngestOptions>>([]);
      const { layer } = yield* makeIngestorLayer(ingestedRef);

      yield* Effect.gen(function* () {
        yield* startConnector(connector);
        const client = yield* HttpClient.HttpClient;
        const response = yield* client.execute(
          HttpClientRequest.post("/webhooks/test").pipe(
            HttpClientRequest.bodyText("{bad", "application/json"),
          ),
        );

        expect(response.status).toBe(400);
        expect(yield* Ref.get(ingestedRef)).toHaveLength(0);
      }).pipe(
        Effect.provide(Layer.mergeAll(StateStoreLayerMemory, layer, NodeHttpServer.layerTest)),
      );
    }).pipe(Effect.scoped),
  );

  it.effect("serves prometheus metrics including webhook outcomes", () =>
    Effect.gen(function* () {
      const route = Webhook.route({
        path: "/webhooks/test",
        ackMode: "after-ingest",
        schema: TestPayloadSchema,
        handler: () => Effect.succeed(HttpServerResponse.jsonUnsafe({ ok: true })),
      });
      const connector = Connector.define({ name: "test", resources: [], webhooks: [route] });
      const ingestedRef = yield* Ref.make<ReadonlyArray<IngestOptions>>([]);
      const { layer } = yield* makeIngestorLayer(ingestedRef);

      yield* Effect.gen(function* () {
        yield* startConnector(connector);
        const client = yield* HttpClient.HttpClient;
        yield* client.execute(
          HttpClientRequest.post("/webhooks/test").pipe(
            HttpClientRequest.bodyText("{bad", "application/json"),
          ),
        );
        const response = yield* client.execute(HttpClientRequest.get("/metrics"));
        const body = yield* response.text;

        expect(response.status).toBe(200);
        expect(body).toContain("airfoil_connector_webhook_requests");
        expect(body).toContain("airfoil_connector_webhook_queue_depth");
        expect(body).toContain('airfoil_webhook_outcome="invalid_json"');
      }).pipe(
        Effect.provide(Layer.mergeAll(StateStoreLayerMemory, layer, NodeHttpServer.layerTest)),
      );
    }).pipe(Effect.scoped),
  );

  it.effect("keeps health available when a source stops with an expected error", () =>
    Effect.gen(function* () {
      const errorWritten = yield* Deferred.make<void>();
      const resource = Resource.entity({
        name: "products",
        rowSchema: TestRowSchema,
        version: "updatedAt",
        check: Effect.void,
        changes: Fetch.changes({
          cursor: Cursor.isoDateTime(),
          fetch: () => Effect.fail(new ConnectorError({ message: "provider unavailable" })),
        }),
      });
      const connector = Connector.define({ name: "test", resources: [resource], webhooks: [] });
      const ingestedRef = yield* Ref.make<ReadonlyArray<IngestOptions>>([]);
      const { layer } = yield* makeIngestorLayer(ingestedRef);

      yield* Effect.gen(function* () {
        yield* startConnector(connector);
        yield* Deferred.await(errorWritten);
        const client = yield* HttpClient.HttpClient;
        const health = yield* client.execute(HttpClientRequest.get("/health"));
        const status = yield* client.execute(HttpClientRequest.get("/status"));
        const statusBody = yield* Schema.decodeUnknownEffect(Status.StatusResponseSchema)(
          yield* status.json,
        );

        expect(health.status).toBe(200);
        expect(yield* health.text).toBe("ok");
        expect(status.status).toBe(200);
        expect(statusBody.resources[0]?.state).toBe("error");
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            layerMemoryNotifyingOnError(() => Deferred.succeed(errorWritten, undefined)),
            layer,
            NodeHttpServer.layerTest,
          ),
        ),
      );
    }).pipe(Effect.scoped),
  );

  it.effect("serves resource sync status", () =>
    Effect.gen(function* () {
      const resource = Resource.entity({
        name: "products",
        rowSchema: TestRowSchema,
        version: "updatedAt",
        check: Effect.void,
        backfill: Fetch.page({
          pageCursor: Cursor.string(),
          cutoff: Cursor.isoDateTime(),
          fetch: () =>
            Effect.succeed({
              rows: [],
              hasMore: false,
            }),
        }),
      });
      const connector = Connector.define({ name: "test", resources: [resource], webhooks: [] });
      const ingestedRef = yield* Ref.make<ReadonlyArray<IngestOptions>>([]);
      const { done, layer } = yield* makeIngestorLayer(ingestedRef, 1);

      yield* Effect.gen(function* () {
        yield* startConnector(connector);
        yield* Deferred.await(done);
        const client = yield* HttpClient.HttpClient;
        const response = yield* client.execute(HttpClientRequest.get("/status"));
        const text = yield* response.text;

        expect(response.status, text).toBe(200);
        const body = yield* Schema.decodeUnknownEffect(Status.StatusResponseSchema)(
          JSON.parse(text),
        );
        expect(body).toMatchInlineSnapshot(`
          {
            "connector": "test",
            "resources": [
              {
                "backfill": {
                  "completed": true,
                  "cutoff": "2026-01-01T00:00:00.000Z",
                  "lastSuccessAt": "1970-01-01T00:00:00.000Z",
                },
                "name": "products",
                "state": "live",
              },
            ],
            "webhooks": [],
          }
        `);
      }).pipe(
        Effect.provide(Layer.mergeAll(StateStoreLayerMemory, layer, NodeHttpServer.layerTest)),
      );
    }).pipe(Effect.scoped),
  );

  it.effect(
    "returns a generic 500 and does not leak internal error detail when status computation fails",
    () =>
      Effect.gen(function* () {
        const resource = Resource.entity({
          name: "products",
          rowSchema: TestRowSchema,
          version: "updatedAt",
          check: Effect.void,
          backfill: Fetch.page({
            pageCursor: Cursor.string(),
            cutoff: Cursor.isoDateTime(),
            fetch: () => Effect.succeed({ rows: [], hasMore: false }),
          }),
        });
        const connector = Connector.define({ name: "test", resources: [resource], webhooks: [] });
        const failingStateStoreLayer = Layer.succeed(StateStore)({
          getResourceState: () =>
            Effect.fail(new ConnectorError({ message: "super secret internal detail" })),
          setBackfillState: () => Effect.void,
          setChangesState: () => Effect.void,
          setResourceError: () => Effect.void,
          clearResourceError: () => Effect.void,
        });

        yield* Effect.gen(function* () {
          const client = yield* HttpClient.HttpClient;
          const response = yield* client.execute(HttpClientRequest.get("/status"));
          const text = yield* response.text;

          expect(response.status).toBe(500);
          expect(text).not.toContain("super secret internal detail");
          const body = yield* Schema.decodeUnknownEffect(Status.StatusUnavailableResponseSchema)(
            JSON.parse(text),
          );
          expect(body).toMatchInlineSnapshot(`
            {
              "error": "Failed to compute status",
              "ok": false,
            }
          `);
        }).pipe(
          Effect.provide(
            Layer.mergeAll(
              HttpRouter.serve(Status.statusRoute(connector), { disableLogger: true }).pipe(
                Layer.provide(Layer.mergeAll(NodeHttpServer.layerTest, failingStateStoreLayer)),
              ),
              NodeHttpServer.layerTest,
            ),
          ),
        );
      }).pipe(Effect.scoped),
  );

  it.effect("reports webhook-only resources as live, not stuck backfilling", () =>
    Effect.gen(function* () {
      const route = Webhook.route({
        path: "/webhooks/test",
        ackMode: "after-ingest",
        schema: TestPayloadSchema,
        handler: ({ to, payload }) =>
          to(resource, payload).pipe(Effect.as(HttpServerResponse.jsonUnsafe({ ok: true }))),
      });
      const resource = Resource.entity({
        name: "events",
        rowSchema: TestRowSchema,
        version: "updatedAt",
        check: Effect.void,
        webhook: {
          schema: TestPayloadSchema,
          handler: ({ payload }) => Effect.succeed([payload]),
        },
      });
      const connector = Connector.define({
        name: "test",
        resources: [resource],
        webhooks: [route],
      });
      const ingestedRef = yield* Ref.make<ReadonlyArray<IngestOptions>>([]);
      const { layer } = yield* makeIngestorLayer(ingestedRef);

      yield* Effect.gen(function* () {
        yield* startConnector(connector);
        const client = yield* HttpClient.HttpClient;
        const response = yield* client.execute(HttpClientRequest.get("/status"));
        const text = yield* response.text;

        expect(response.status, text).toBe(200);
        const body = yield* Schema.decodeUnknownEffect(Status.StatusResponseSchema)(
          JSON.parse(text),
        );
        const eventsStatus = body.resources.find((r) => r.name === "events");
        expect(eventsStatus).toMatchInlineSnapshot(`
          {
            "name": "events",
            "state": "live",
          }
        `);
      }).pipe(
        Effect.provide(Layer.mergeAll(StateStoreLayerMemory, layer, NodeHttpServer.layerTest)),
      );
    }).pipe(Effect.scoped),
  );

  it.effect("returns 400 for invalid route payload", () =>
    Effect.gen(function* () {
      const route = Webhook.route({
        path: "/webhooks/test",
        ackMode: "after-ingest",
        schema: TestPayloadSchema,
        handler: () => Effect.succeed(HttpServerResponse.jsonUnsafe({ ok: true })),
      });
      const connector = Connector.define({ name: "test", resources: [], webhooks: [route] });
      const ingestedRef = yield* Ref.make<ReadonlyArray<IngestOptions>>([]);
      const { layer } = yield* makeIngestorLayer(ingestedRef);

      yield* Effect.gen(function* () {
        yield* startConnector(connector);
        const client = yield* HttpClient.HttpClient;
        const response = yield* client.execute(
          HttpClientRequest.post("/webhooks/test").pipe(
            HttpClientRequest.bodyJsonUnsafe({ id: 123, updatedAt: "2026-01-01T00:00:00.000Z" }),
          ),
        );

        expect(response.status).toBe(400);
        expect(yield* Ref.get(ingestedRef)).toHaveLength(0);
      }).pipe(
        Effect.provide(Layer.mergeAll(StateStoreLayerMemory, layer, NodeHttpServer.layerTest)),
      );
    }).pipe(Effect.scoped),
  );

  it.effect("ingests resource webhook rows after to", () =>
    Effect.gen(function* () {
      const Products = Resource.entity({
        name: "products",
        rowSchema: TestRowSchema,
        version: "updatedAt",
        check: Effect.void,
        webhook: {
          schema: TestPayloadSchema,
          handler: ({ payload }) => Effect.succeed([payload]),
        },
      });
      const route = Webhook.route({
        path: "/webhooks/test",
        ackMode: "after-ingest",
        schema: TestPayloadSchema,
        handler: ({ payload, to }) =>
          to(Products, payload).pipe(Effect.as(HttpServerResponse.jsonUnsafe({ ok: true }))),
      });
      const connector = Connector.define({
        name: "test",
        resources: [Products],
        webhooks: [route],
      });
      const ingestedRef = yield* Ref.make<ReadonlyArray<IngestOptions>>([]);
      const { done, layer } = yield* makeIngestorLayer(ingestedRef, 1);

      yield* Effect.gen(function* () {
        yield* startConnector(connector);
        const client = yield* HttpClient.HttpClient;
        const response = yield* client.execute(
          HttpClientRequest.post("/webhooks/test").pipe(
            HttpClientRequest.bodyJsonUnsafe({ id: "p1", updatedAt: "2026-01-01T00:00:00.000Z" }),
          ),
        );

        expect(response.status).toBe(200);
        yield* Deferred.await(done);
        const ingested = yield* Ref.get(ingestedRef);
        expect({
          source: ingested[0]?.source,
          resource: ingested[0]?.resource,
          rowCount: ingested[0]?.batch.rows.length,
        }).toMatchInlineSnapshot(`
          {
            "resource": "products",
            "rowCount": 1,
            "source": "webhook",
          }
        `);

        const metricsResponse = yield* client.execute(HttpClientRequest.get("/metrics"));
        const metricsBody = yield* metricsResponse.text;
        expect(metricsBody).toContain("airfoil_connector_batch_size");
        expect(metricsBody).toContain('source="webhook"');
      }).pipe(
        Effect.provide(Layer.mergeAll(StateStoreLayerMemory, layer, NodeHttpServer.layerTest)),
      );
    }).pipe(Effect.scoped),
  );
  it.effect("skips unselected resources in webhooks and status", () =>
    Effect.gen(function* () {
      const makeResource = <const Name extends string>(
        name: Name,
        handler: (
          payload: typeof TestPayloadSchema.Type,
        ) => Effect.Effect<ReadonlyArray<typeof TestPayloadSchema.Type>>,
      ) =>
        Resource.entity({
          name,
          rowSchema: TestRowSchema,
          version: "updatedAt",
          check: Effect.void,
          webhook: { schema: TestPayloadSchema, handler: ({ payload }) => handler(payload) },
        });
      const Products = makeResource("products", (payload) => Effect.succeed([payload]));
      const Orders = makeResource("orders", () => Effect.die("orders handler ran"));
      const route = Webhook.route({
        path: "/webhooks/test",
        ackMode: "after-ingest",
        schema: TestPayloadSchema,
        handler: ({ payload, to }) =>
          to(Products, payload).pipe(
            Effect.andThen(to(Orders, payload)),
            Effect.as(HttpServerResponse.jsonUnsafe({ ok: true })),
          ),
      });
      const connector = Connector.define({
        name: "test",
        resources: [Products, Orders],
        webhooks: [route],
      });
      const ingestedRef = yield* Ref.make<ReadonlyArray<IngestOptions>>([]);
      const { done, layer } = yield* makeIngestorLayer(ingestedRef, 1, ["products"]);

      yield* Effect.gen(function* () {
        yield* startConnector(connector);
        const client = yield* HttpClient.HttpClient;
        const response = yield* client.execute(
          HttpClientRequest.post("/webhooks/test").pipe(
            HttpClientRequest.bodyJsonUnsafe({ id: "p1", updatedAt: "2026-01-01T00:00:00.000Z" }),
          ),
        );
        yield* Deferred.await(done);
        const status = yield* client.execute(HttpClientRequest.get("/status"));
        const body = yield* Schema.decodeUnknownEffect(Status.StatusResponseSchema)(
          yield* status.json,
        );

        expect({
          webhook: response.status,
          ingested: (yield* Ref.get(ingestedRef)).map((options) => options.resource),
          status: body.resources.map((resource) => resource.name),
        }).toMatchInlineSnapshot(`
          {
            "ingested": [
              "products",
            ],
            "status": [
              "products",
            ],
            "webhook": 200,
          }
        `);
      }).pipe(
        Effect.provide(Layer.mergeAll(StateStoreLayerMemory, layer, NodeHttpServer.layerTest)),
      );
    }).pipe(Effect.scoped),
  );
});

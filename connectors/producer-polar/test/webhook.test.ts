import { NodeHttpServer } from "@effect/platform-node";
import { describe, expect, it } from "@effect/vitest";
import { ConnectorError, Ingestion, StateStore, Webhook } from "@useairfoil/connector-kit";
import { ConfigProvider, DateTime, Deferred, Effect, Layer, Ref } from "effect";
import { Base64 } from "effect/encoding";
import { HttpClient, HttpClientRequest, HttpRouter } from "effect/http";
import { Webhook as StandardWebhook } from "standardwebhooks";

import type { PolarApiClientService } from "../src/api";

import { PolarApiClient, PolarConnector } from "../src/index";
import { discount, product, refund, subscription } from "./fixtures";
import { makeTestIngestor } from "./helpers";

const webhookSecret = "test-webhook-secret";

const customerWebhookPayload = {
  type: "customer.created",
  timestamp: "2024-01-01T00:00:00Z",
  api_version: "2026-10",
  data: {
    id: "cus_1",
    created_at: "2024-01-01T00:00:00Z",
    modified_at: null,
    type: "individual",
    deleted_at: null,
    external_id: null,
    email: "test@example.com",
    email_verified: true,
    name: "Test",
    billing_name: null,
    organization_id: "org_1",
    avatar_url: "https://example.com/avatar.png",
    metadata: {},
    billing_address: null,
    tax_id: null,
  },
};

const signPayload = (rawBody: string) => {
  const now = new Date();
  const webhookId = "webhook_1";
  const base64Secret = Base64.encode(webhookSecret);
  const verifier = new StandardWebhook(base64Secret);
  return {
    "webhook-id": webhookId,
    "webhook-timestamp": String(Math.floor(now.getTime() / 1000)),
    "webhook-signature": verifier.sign(webhookId, now, rawBody),
  };
};

const makeApiStub = (): PolarApiClientService => ({
  fetchJson: (_schema) => Effect.fail(new ConnectorError({ message: "Unexpected fetchJson" })),
  fetchList: (_schema) =>
    Effect.succeed({
      items: [],
      pagination: { total_count: 0, max_page: 1 },
    }),
});

const connectorTestLayer = Layer.effect(PolarConnector.PolarConnector)(
  PolarConnector.PolarConfigDef.config.pipe(Effect.flatMap(PolarConnector.make)),
).pipe(
  Layer.provide(Layer.succeed(PolarApiClient.PolarApiClient)(makeApiStub())),
  Layer.provide(
    ConfigProvider.layer(
      ConfigProvider.fromUnknown({
        POLAR_ACCESS_TOKEN: "test",
        POLAR_API_BASE_URL: "https://sandbox-api.polar.sh/v1/",
        POLAR_WEBHOOK_SECRET: webhookSecret,
      }),
    ),
  ),
);

const postSignedWebhook = (payload: unknown) =>
  Effect.gen(function* () {
    const { ingestedRef, layer } = yield* makeTestIngestor(1);
    const connector = yield* PolarConnector.PolarConnector;
    const now = yield* DateTime.now.pipe(Effect.map(DateTime.formatIso));

    return yield* Effect.gen(function* () {
      yield* Effect.forkScoped(
        Ingestion.run(connector, {
          initialCutoff: now,
          webhook: {
            routes: connector.webhooks ?? [],
          },
        }),
      );

      const rawBody = JSON.stringify(payload);
      const client = yield* HttpClient.HttpClient;
      const request = HttpClientRequest.post("/webhook").pipe(
        HttpClientRequest.setHeaders(signPayload(rawBody)),
        HttpClientRequest.bodyText(rawBody, "application/json"),
      );
      const response = yield* client.execute(request);
      const ingested = yield* Ref.get(ingestedRef);

      return {
        status: response.status,
        webhookIngests: ingested.filter((item) => item.source === "webhook"),
      };
    }).pipe(
      Effect.provide(Layer.mergeAll(StateStore.layerMemory, layer, NodeHttpServer.layerTest)),
    );
  });

describe("producer-polar webhook", () => {
  it.effect("ingests live webhook batches", () =>
    Effect.gen(function* () {
      const { ingestedRef, done, layer } = yield* makeTestIngestor(5);
      const connector = yield* PolarConnector.PolarConnector;
      const now = yield* DateTime.now.pipe(Effect.map(DateTime.formatIso));

      yield* Effect.gen(function* () {
        yield* Effect.forkScoped(
          Ingestion.run(connector, {
            initialCutoff: now,
            webhook: {
              routes: connector.webhooks ?? [],
            },
          }),
        );

        const rawBody = JSON.stringify(customerWebhookPayload);
        const headers = signPayload(rawBody);
        const client = yield* HttpClient.HttpClient;
        const request = HttpClientRequest.post("/webhook").pipe(
          HttpClientRequest.setHeaders(headers),
          HttpClientRequest.bodyText(rawBody, "application/json"),
        );
        const response = yield* client.execute(request);

        expect(response.status).toBe(200);

        yield* Deferred.await(done);
        const ingested = yield* Ref.get(ingestedRef);
        const webhookIngest = ingested.find(
          (item) => item.source === "webhook" && item.resource === "customers",
        );

        expect(webhookIngest).toMatchObject({
          resource: "customers",
          batch: {
            rows: [{ id: "cus_1", version: new Date(customerWebhookPayload.timestamp) }],
          },
        });
      }).pipe(
        Effect.provide(Layer.mergeAll(StateStore.layerMemory, layer, NodeHttpServer.layerTest)),
      );
    }).pipe(Effect.provide(connectorTestLayer), Effect.scoped),
  );

  it.effect("turns customer.deleted into a soft delete", () =>
    Effect.gen(function* () {
      const result = yield* postSignedWebhook({
        ...customerWebhookPayload,
        type: "customer.deleted",
        data: { ...customerWebhookPayload.data, deleted_at: "2024-01-01T00:00:00Z" },
      });

      expect(result.status).toBe(200);
      expect(result.webhookIngests).toMatchObject([
        {
          resource: "customers",
          batch: { rows: [{ id: "cus_1", email: "test@example.com", _deleted: true }] },
        },
      ]);
    }).pipe(Effect.provide(connectorTestLayer), Effect.scoped),
  );

  it.effect("rejects invalid webhook signatures", () =>
    Effect.gen(function* () {
      const { ingestedRef, layer } = yield* makeTestIngestor(1);
      const connector = yield* PolarConnector.PolarConnector;
      const now = yield* DateTime.now.pipe(Effect.map(DateTime.formatIso));

      yield* Effect.gen(function* () {
        yield* Effect.forkScoped(
          Ingestion.run(connector, {
            initialCutoff: now,
            webhook: {
              routes: connector.webhooks ?? [],
            },
          }),
        );

        const rawBody = JSON.stringify(customerWebhookPayload);
        const headers = signPayload(`${rawBody}-invalid`);
        const client = yield* HttpClient.HttpClient;
        const request = HttpClientRequest.post("/webhook").pipe(
          HttpClientRequest.setHeaders(headers),
          HttpClientRequest.bodyText(rawBody, "application/json"),
        );
        const response = yield* client.execute(request);

        expect(response.status).toBe(401);
        const ingested = yield* Ref.get(ingestedRef);

        expect(ingested.some((item) => item.source === "webhook")).toBe(false);
      }).pipe(
        Effect.provide(Layer.mergeAll(StateStore.layerMemory, layer, NodeHttpServer.layerTest)),
      );
    }).pipe(Effect.provide(connectorTestLayer), Effect.scoped),
  );

  it.effect.each(["subscription.cycled", "subscription.migrated"])(
    "routes %s to subscriptions",
    (type) =>
      Effect.gen(function* () {
        const result = yield* postSignedWebhook({
          type,
          timestamp: "2026-02-01T00:00:00Z",
          api_version: "2026-10",
          data: subscription,
        });

        expect(result.status).toBe(200);
        expect(result.webhookIngests).toMatchObject([
          {
            resource: "subscriptions",
            batch: {
              rows: [{ id: subscription.id, version: new Date("2026-02-01T00:00:00Z") }],
            },
          },
        ]);
      }).pipe(Effect.provide(connectorTestLayer), Effect.scoped),
  );

  it.effect.each([
    { type: "refund.created", resource: "refunds", data: refund },
    { type: "product.updated", resource: "products", data: product },
    { type: "discount.created", resource: "discounts", data: discount },
  ])("routes $type to $resource", ({ type, resource, data }) =>
    Effect.gen(function* () {
      const result = yield* postSignedWebhook({
        type,
        timestamp: "2026-02-01T00:00:00Z",
        api_version: "2026-10",
        data,
      });

      expect(result.status).toBe(200);
      expect(result.webhookIngests).toMatchObject([
        {
          resource,
          batch: { rows: [{ id: data.id, version: new Date("2026-02-01T00:00:00Z") }] },
        },
      ]);
    }).pipe(Effect.provide(connectorTestLayer), Effect.scoped),
  );

  it.effect("turns discount.deleted into a soft delete", () =>
    Effect.gen(function* () {
      const result = yield* postSignedWebhook({
        type: "discount.deleted",
        timestamp: "2026-02-01T00:00:00Z",
        api_version: "2026-10",
        data: discount,
      });

      expect(result.status).toBe(200);
      expect(result.webhookIngests.map(({ resource, batch }) => ({ resource, rows: batch.rows })))
        .toMatchInlineSnapshot(`
        [
          {
            "resource": "discounts",
            "rows": [
              {
                "_deleted": true,
                "id": "discount_1",
                "version": 2026-02-01T00:00:00.000Z,
              },
            ],
          },
        ]
      `);
    }).pipe(Effect.provide(connectorTestLayer), Effect.scoped),
  );

  it.effect("acknowledges event types it does not store", () =>
    Effect.gen(function* () {
      const result = yield* postSignedWebhook({
        type: "payout.created",
        timestamp: "2026-02-01T00:00:00Z",
        api_version: "2026-10",
        data: { id: "payout_1" },
      });

      expect(result.status).toBe(200);
      expect(result.webhookIngests).toEqual([]);
    }).pipe(Effect.provide(connectorTestLayer), Effect.scoped),
  );
});

it.effect("verifies setup requests without starting ingestion", () =>
  Effect.gen(function* () {
    const connector = yield* PolarConnector.PolarConnector;
    const reported = yield* Ref.make(0);
    const routes = yield* Webhook.verificationRouter(
      connector.webhooks ?? [],
      Ref.update(reported, (count) => count + 1),
    );
    yield* Layer.build(HttpRouter.serve(routes, { disableLogger: true }));
    const rawBody = JSON.stringify(customerWebhookPayload);
    const send = (headers: Record<string, string>) =>
      HttpClient.execute(
        HttpClientRequest.post("/webhook").pipe(
          HttpClientRequest.setHeaders(headers),
          HttpClientRequest.bodyText(rawBody, "application/json"),
        ),
      );
    expect((yield* send({})).status).toBe(401);
    expect(yield* Ref.get(reported)).toBe(0);
    expect((yield* send(signPayload(rawBody))).status).toBe(200);
    expect(yield* Ref.get(reported)).toBe(1);
  }).pipe(Effect.provide(Layer.merge(connectorTestLayer, NodeHttpServer.layerTest))),
);

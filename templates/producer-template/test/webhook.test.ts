import { NodeHttpServer } from "@effect/platform-node";
import { describe, expect, it } from "@effect/vitest";
import { ConnectorError, Ingestion, StateStore } from "@useairfoil/connector-kit";
import { ConfigProvider, DateTime, Deferred, Effect, Layer, Ref } from "effect";
import { HttpClient, HttpClientRequest } from "effect/http";

import type { TemplateApiClientService } from "../src/api";

import { TemplateApiClient, TemplateConnector } from "../src/index";
import { makeTestIngestor } from "./helpers";

const postWebhookPayload = {
  type: "post.created",
  timestamp: "2026-01-01T00:00:00Z",
  data: {
    id: 1,
    userId: 1,
    title: "sunt aut facere",
    body: "quia et suscipit",
  },
} as const;

// API stub — the webhook test does not exercise any backfill, so fetchList
// returns an empty page and fetchJson is never expected to be called.
const makeApiStub = (): TemplateApiClientService => ({
  fetchJson: (_schema) => Effect.fail(new ConnectorError({ message: "Unexpected fetchJson" })),
  fetchList: (_schema) => Effect.succeed({ items: [], hasMore: false }),
});

describe("producer-template webhook", () => {
  it.effect("ingests live webhook batches", () =>
    Effect.gen(function* () {
      const { ingestedRef, done, layer } = yield* makeTestIngestor(1);
      const connector = yield* TemplateConnector.TemplateConnector;
      const now = yield* DateTime.now.pipe(Effect.map(DateTime.formatIso));
      const webhook = connector.resources[0]?.webhook;
      if (!webhook) return yield* Effect.die("Expected posts webhook handler");

      const deleted = yield* webhook.handler({
        payload: {
          type: "post.deleted",
          timestamp: "2026-01-02T00:00:00Z",
          data: { id: 1n },
        },
      });

      expect(deleted).toEqual([{ id: 1n, version: "2026-01-02T00:00:00Z", _deleted: true }]);

      yield* Effect.gen(function* () {
        yield* Effect.forkScoped(
          Ingestion.run(connector, {
            initialCutoff: now,
            webhook: { routes: connector.webhooks ?? [] },
          }),
        );

        const client = yield* HttpClient.HttpClient;
        const request = HttpClientRequest.post("/webhook").pipe(
          HttpClientRequest.bodyJsonUnsafe(postWebhookPayload),
        );
        const response = yield* client.execute(request);

        expect(response.status).toBe(200);

        yield* Deferred.await(done);
        const ingested = yield* Ref.get(ingestedRef);
        const webhookIngest = ingested.find((item) => item.source === "webhook");

        expect(webhookIngest?.resource).toBe("posts");
        expect(webhookIngest?.batch.rows).toEqual([
          {
            ...postWebhookPayload.data,
            id: 1n,
            userId: 1n,
            version: postWebhookPayload.timestamp,
            _deleted: false,
          },
        ]);
      }).pipe(
        Effect.provide(Layer.mergeAll(StateStore.layerMemory, layer, NodeHttpServer.layerTest)),
      );
    }).pipe(
      Effect.provide(
        Layer.effect(TemplateConnector.TemplateConnector)(
          TemplateConnector.TemplateConfigDef.config.pipe(Effect.flatMap(TemplateConnector.make)),
        ).pipe(
          Layer.provide(Layer.succeed(TemplateApiClient.TemplateApiClient)(makeApiStub())),
          Layer.provide(
            ConfigProvider.layer(
              ConfigProvider.fromUnknown({
                TEMPLATE_API_BASE_URL: "https://jsonplaceholder.typicode.com",
                TEMPLATE_API_TOKEN: "test",
              }),
            ),
          ),
        ),
      ),
      Effect.scoped,
    ),
  );
});

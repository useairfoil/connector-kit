import { NodeHttpServer } from "@effect/platform-node";
import { describe, expect, it } from "@effect/vitest";
import { Ingestion, StateStore, Webhook } from "@useairfoil/connector-kit";
import { DateTime, Deferred, Effect, Layer, Ref } from "effect";
import { HttpClient, HttpClientRequest, HttpRouter } from "effect/http";
import { TestClock } from "effect/testing";

import { StripeConnector, webhookPath } from "../src/index";
import { customer } from "./fixtures/customers";
import { event } from "./fixtures/events";
import { canceledSubscription, charge, invoice, price, product, refund } from "./fixtures/objects";
import {
  type FakeStripe,
  connectorLayer,
  makeFakeClient,
  makeTestIngestor,
  signPayload,
} from "./helpers";

const now = Date.parse("2026-10-03T12:00:00.000Z");
const nowSeconds = Math.floor(now / 1000);

/** Posts a body to the webhook route and waits for `expected` ingests. */
const post = (
  fake: FakeStripe,
  body: unknown,
  options: { readonly signature?: string | null; readonly expected?: number } = {},
) =>
  Effect.gen(function* () {
    yield* TestClock.setTime(now);
    const { client, requests } = yield* makeFakeClient(fake);
    const connector = yield* StripeConnector.StripeConnector.pipe(
      Effect.provide(connectorLayer(client)),
    );
    const expected = options.expected ?? 0;
    const { ingestedRef, done, layer } = yield* makeTestIngestor(expected);
    const cutoff = yield* DateTime.now.pipe(Effect.map(DateTime.formatIso));

    return yield* Effect.gen(function* () {
      yield* Effect.forkScoped(
        Ingestion.run(connector, {
          initialCutoff: cutoff,
          webhook: { routes: connector.webhooks ?? [] },
        }),
      );

      const rawBody = JSON.stringify(body);
      const signature =
        options.signature === undefined
          ? signPayload(rawBody, { timestamp: nowSeconds })
          : options.signature;
      const http = yield* HttpClient.HttpClient;
      const response = yield* http.execute(
        HttpClientRequest.post("/webhook").pipe(
          HttpClientRequest.setHeaders(signature === null ? {} : { "stripe-signature": signature }),
          HttpClientRequest.bodyText(rawBody, "application/json"),
        ),
      );
      if (expected > 0) yield* Deferred.await(done);

      const webhookIngests = (yield* Ref.get(ingestedRef)).filter(
        (item) => item.source === "webhook",
      );
      return {
        status: response.status,
        rows: webhookIngests.flatMap((item) =>
          item.batch.rows.map((row) => ({ resource: item.resource, row })),
        ),
        // Ingestion also runs backfill and changes; only object fetches matter here.
        fetched: (yield* Ref.get(requests)).filter((request) => !request.includes("?")),
      };
    }).pipe(
      Effect.provide(Layer.mergeAll(StateStore.layerMemory, layer, NodeHttpServer.layerTest)),
    );
  }).pipe(Effect.scoped);

describe("webhook", () => {
  it.effect("rejects bad, missing, and old signatures", () =>
    Effect.gen(function* () {
      const body = event({ id: "evt_1", type: "customer.updated", objectId: "cus_1" });
      const rawBody = JSON.stringify(body);

      const results = {
        otherBody: yield* post({}, body, {
          signature: signPayload(JSON.stringify({ ...body, id: "evt_2" }), {
            timestamp: nowSeconds,
          }),
        }),
        missing: yield* post({}, body, { signature: null }),
        olderThanFiveMinutes: yield* post({}, body, {
          signature: signPayload(rawBody, { timestamp: nowSeconds - 301 }),
        }),
      };

      expect(results).toMatchInlineSnapshot(`
        {
          "missing": {
            "fetched": [],
            "rows": [],
            "status": 401,
          },
          "olderThanFiveMinutes": {
            "fetched": [],
            "rows": [],
            "status": 401,
          },
          "otherBody": {
            "fetched": [],
            "rows": [],
            "status": 401,
          },
        }
      `);
    }),
  );

  it.effect("acknowledges unknown events and rejects known events without an object ID", () =>
    Effect.gen(function* () {
      const results = {
        unknown: yield* post({}, { id: "evt_1", type: "invoice.upcoming", data: { object: {} } }),
        missingObjectId: yield* post(
          {},
          { id: "evt_2", type: "customer.updated", created: nowSeconds, data: { object: {} } },
        ),
      };

      expect(results).toMatchInlineSnapshot(`
        {
          "missingObjectId": {
            "fetched": [],
            "rows": [],
            "status": 400,
          },
          "unknown": {
            "fetched": [],
            "rows": [],
            "status": 200,
          },
        }
      `);
    }),
  );

  it.effect("routes events to every resource", () =>
    Effect.gen(function* () {
      const cases = [
        { type: "customer.updated", path: "customers/cus_1", object: customer },
        { type: "product.updated", path: "products/prod_1", object: product },
        { type: "price.created", path: "prices/price_1", object: price },
        {
          type: "customer.subscription.deleted",
          path: "subscriptions/sub_2",
          object: canceledSubscription,
        },
        { type: "invoice.paid", path: "invoices/in_1", object: invoice },
        { type: "charge.refunded", path: "charges/ch_1", object: charge },
        { type: "charge.refund.updated", path: "refunds/re_1", object: refund },
      ];

      const results: Record<string, unknown> = {};
      for (const { type, path, object } of cases) {
        const result = yield* post(
          { objects: { [path]: object } },
          event({ id: "evt_1", type, objectId: object.id }),
          { expected: 1 },
        );
        results[type] = {
          status: result.status,
          fetched: result.fetched,
          rows: result.rows.map(({ resource, row }) => ({
            resource,
            id: "id" in row ? row.id : null,
          })),
        };
      }

      expect(results).toMatchInlineSnapshot(`
        {
          "charge.refund.updated": {
            "fetched": [
              "refunds/re_1",
            ],
            "rows": [
              {
                "id": "re_1",
                "resource": "refunds",
              },
            ],
            "status": 200,
          },
          "charge.refunded": {
            "fetched": [
              "charges/ch_1",
            ],
            "rows": [
              {
                "id": "ch_1",
                "resource": "charges",
              },
            ],
            "status": 200,
          },
          "customer.subscription.deleted": {
            "fetched": [
              "subscriptions/sub_2",
            ],
            "rows": [
              {
                "id": "sub_2",
                "resource": "subscriptions",
              },
            ],
            "status": 200,
          },
          "customer.updated": {
            "fetched": [
              "customers/cus_1",
            ],
            "rows": [
              {
                "id": "cus_1",
                "resource": "customers",
              },
            ],
            "status": 200,
          },
          "invoice.paid": {
            "fetched": [
              "invoices/in_1",
            ],
            "rows": [
              {
                "id": "in_1",
                "resource": "invoices",
              },
            ],
            "status": 200,
          },
          "price.created": {
            "fetched": [
              "prices/price_1",
            ],
            "rows": [
              {
                "id": "price_1",
                "resource": "prices",
              },
            ],
            "status": 200,
          },
          "product.updated": {
            "fetched": [
              "products/prod_1",
            ],
            "rows": [
              {
                "id": "prod_1",
                "resource": "products",
              },
            ],
            "status": 200,
          },
        }
      `);
    }),
  );
});

it.effect("verifies signed setup events without fetching or ingesting rows", () =>
  Effect.gen(function* () {
    yield* TestClock.setTime(now);
    const { client, requests } = yield* makeFakeClient({});
    const connector = yield* StripeConnector.StripeConnector.pipe(
      Effect.provide(connectorLayer(client)),
    );
    const reported = yield* Ref.make(0);
    const routes = yield* Webhook.verificationRouter(
      connector.webhooks ?? [],
      Ref.update(reported, (count) => count + 1),
    );
    yield* Layer.build(HttpRouter.serve(routes, { disableLogger: true }));
    const rawBody = JSON.stringify(
      event({ id: "evt_setup", type: "customer.updated", objectId: "cus_setup" }),
    );
    const send = (signature: string) =>
      HttpClient.execute(
        HttpClientRequest.post(webhookPath).pipe(
          HttpClientRequest.setHeader("stripe-signature", signature),
          HttpClientRequest.bodyText(rawBody, "application/json"),
        ),
      );
    expect((yield* send("invalid")).status).toBe(401);
    expect(yield* Ref.get(reported)).toBe(0);
    expect((yield* send(signPayload(rawBody, { timestamp: nowSeconds }))).status).toBe(200);
    expect(yield* Ref.get(reported)).toBe(1);
    expect(yield* Ref.get(requests)).toEqual([]);
  }).pipe(Effect.provide(NodeHttpServer.layerTest)),
);

import type { ResourceBatch } from "@useairfoil/connector-kit";

import { ConnectorError, Ingestor } from "@useairfoil/connector-kit";
import { ConfigProvider, Deferred, Effect, Layer, Ref, Schema } from "effect";
import { createHmac } from "node:crypto";

import type { HubSpotClientService } from "../src/client/client";

import { HubSpotClient, HubSpotConnector } from "../src/index";

export const clientSecret = "client-test-secret";

const testConfig = (options: { readonly webhooks: boolean }) =>
  ConfigProvider.layer(
    ConfigProvider.fromUnknown({
      HUBSPOT_ACCESS_TOKEN: "pat-test",
      AIRFOIL_WEBHOOK_URL: "https://hooks.example.com/webhook",
      ...(options.webhooks ? { HUBSPOT_CLIENT_SECRET: clientSecret } : {}),
    }),
  );

export type FakeRequest = {
  readonly method: "GET" | "POST";
  readonly path: string;
  readonly params?: Readonly<Record<string, string>>;
  readonly body?: unknown;
};

/** Answers a request with a response body, or undefined for a 404. */
export type FakeHubSpot = (request: FakeRequest) => unknown;

const decode = <A>(schema: Schema.Decoder<A>, value: unknown, path: string) =>
  Schema.decodeUnknownEffect(schema)(value).pipe(
    Effect.mapError(
      (cause) => new ConnectorError({ message: `Fixture for ${path} does not decode`, cause }),
    ),
  );

export const fetchedAt = new Date("2026-10-07T12:00:00.000Z");

/**
 * A fake HubSpot client. It decodes fixtures with the real schemas, so the
 * tests also cover decoding, and it records every request.
 */
export const makeFakeClient = (fake: FakeHubSpot) =>
  Effect.gen(function* () {
    const requests = yield* Ref.make<ReadonlyArray<FakeRequest>>([]);
    const answer = <A>(schema: Schema.Decoder<A>, request: FakeRequest) =>
      Effect.gen(function* () {
        yield* Ref.update(requests, (current) => [...current, request]);
        const body = fake(request);
        if (body === undefined) {
          return yield* new ConnectorError({
            message: `HubSpot API returned 404 for ${request.path}`,
          });
        }
        return { body: yield* decode(schema, body, request.path), fetchedAt };
      });
    const client: HubSpotClientService = {
      get: (schema, path, params) =>
        answer(schema, { method: "GET", path, ...(params === undefined ? {} : { params }) }),
      post: (schema, path, body) => answer(schema, { method: "POST", path, body }),
    };
    return { client, requests };
  });

export const connectorLayer = (
  client: HubSpotClientService,
  options: { readonly webhooks: boolean } = { webhooks: true },
) =>
  Layer.effect(HubSpotConnector.HubSpotConnector)(
    HubSpotConnector.HubSpotConfigDef.config.pipe(Effect.flatMap(HubSpotConnector.make)),
  ).pipe(
    Layer.provide(Layer.succeed(HubSpotClient.HubSpotClient)(client)),
    Layer.provide(testConfig(options)),
  );

export type Ingested = {
  readonly resource: string;
  readonly source: Ingestor.IngestSource;
  readonly batch: ResourceBatch;
};

export const makeTestIngestor = (expected: number) =>
  Effect.gen(function* () {
    const ingestedRef = yield* Ref.make<ReadonlyArray<Ingested>>([]);
    const done = yield* Deferred.make<number, never>();
    const layer = Layer.succeed(Ingestor.Ingestor)({
      ingest: ({ resource, source, batch }) =>
        Effect.gen(function* () {
          const next = yield* Ref.updateAndGet(ingestedRef, (items) => [
            ...items,
            { resource, source, batch },
          ]);
          if (next.length === expected) {
            yield* Deferred.succeed(done, next.length);
          }
          return { rows: batch.rows.length, bytes: 0 };
        }),
    });

    return { ingestedRef, done, layer };
  });

export const sign = (options: {
  readonly method: string;
  readonly url: string;
  readonly body: string;
  readonly timestamp: number;
  readonly secret?: string;
}) =>
  createHmac("sha256", options.secret ?? clientSecret)
    .update(`${options.method}${options.url}${options.body}${options.timestamp}`)
    .digest("base64");

// Bigints, dates, and maps print plainly in snapshots.
export const plain = (value: unknown): unknown =>
  JSON.parse(
    JSON.stringify(value, (_key, item) =>
      typeof item === "bigint" ? `${item}n` : item instanceof Map ? Object.fromEntries(item) : item,
    ),
  );

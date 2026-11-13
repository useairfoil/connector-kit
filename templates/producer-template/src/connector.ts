import {
  Connector,
  ConnectorError,
  Cursor,
  Fetch,
  Resource,
  Webhook,
} from "@useairfoil/connector-kit";
import { Config, Context, Effect, Layer, Option, Redacted } from "effect";
import { HttpServerResponse } from "effect/http";

import type { TemplateConfig } from "./manifest";

import * as TemplateApiClient from "./api";
export type { TemplateConfig } from "./manifest";
export { manifest, TemplateConfigDef } from "./manifest";
import { PostSchema, WebhookPayloadSchema } from "./schemas";

// Verify signatures against `rawBody`, not parsed JSON.
const verifyWebhookSignature = (_options: {
  readonly rawBody: Uint8Array;
  readonly signature: string | null;
  readonly secret: string;
}): Effect.Effect<void, ConnectorError> => Effect.void;

export const make = Effect.fnUntraced(function* (config: TemplateConfig) {
  const api = yield* TemplateApiClient.TemplateApiClient;

  const Posts = Resource.entity({
    name: "posts",
    rowSchema: PostSchema,
    version: "version",

    check: api.fetchList(PostSchema, "/posts", { page: 1, limit: 1 }).pipe(Effect.asVoid),
    backfill: Fetch.page({
      pageCursor: Cursor.number(),
      cutoff: Cursor.isoDateTime(),
      fetch: ({ pageCursor }) => {
        const page = typeof pageCursor === "number" ? pageCursor : 1;
        const limit = 10;
        return api.fetchList(PostSchema, "/posts", { page, limit }).pipe(
          Effect.map((response) => ({
            rows: response.items,
            nextPageCursor: response.hasMore ? page + 1 : page,
            hasMore: response.hasMore,
          })),
        );
      },
    }),
    webhook: {
      schema: WebhookPayloadSchema,
      handler: ({ payload }) =>
        Effect.succeed([
          payload.type === "post.deleted"
            ? { id: payload.data.id, version: payload.timestamp, _deleted: true }
            : { ...payload.data, version: payload.timestamp },
        ]),
    },
  });

  const webhookRoute = Webhook.route({
    path: "/webhook",
    ackMode: "after-ingest",
    schema: WebhookPayloadSchema,
    handler: ({ request, rawBody, payload, to }) =>
      Effect.gen(function* () {
        if (Option.isSome(config.webhookSecret)) {
          const verificationError = yield* verifyWebhookSignature({
            rawBody,
            signature: request.headers["x-template-signature"] ?? null,
            secret: Redacted.value(config.webhookSecret.value),
          }).pipe(Effect.match({ onFailure: (error) => error, onSuccess: () => undefined }));
          if (verificationError) {
            return HttpServerResponse.jsonUnsafe(
              { ok: false, error: verificationError.message },
              { status: 401 },
            );
          }
        }

        switch (payload.type) {
          case "post.created":
          case "post.updated":
            yield* to(Posts, payload);
            break;
          case "post.deleted":
            yield* to(Posts, payload);
            break;
        }

        return HttpServerResponse.jsonUnsafe({ ok: true });
      }),
  });

  if (Option.isNone(config.webhookSecret)) {
    yield* Effect.logWarning(
      "TEMPLATE_WEBHOOK_SECRET is not set. Incoming webhooks will not be signature-verified.",
    );
  }

  return Connector.define({
    name: "producer-template",
    title: "Producer Template",
    resources: [Posts],
    webhooks: [webhookRoute],
  });
});

export type TemplateConnectorRuntime = Effect.Success<ReturnType<typeof make>>;

export class TemplateConnector extends Context.Service<
  TemplateConnector,
  TemplateConnectorRuntime
>()("@useairfoil/producer-template/TemplateConnector") {}

export const layer = (config: TemplateConfig) =>
  Layer.effect(TemplateConnector)(
    make(config).pipe(Effect.annotateLogs({ component: "producer-template" })),
  ).pipe(Layer.provide(TemplateApiClient.layer(config)));

export const layerConfig = (config: Config.Wrap<TemplateConfig>) =>
  Layer.unwrap(Config.unwrap(config).pipe(Effect.map(layer)));

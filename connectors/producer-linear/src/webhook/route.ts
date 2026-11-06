import { type ResourceDefinition, Webhook } from "@useairfoil/connector-kit";
import { Effect, Result, Schema } from "effect";
import { HttpServerResponse } from "effect/http";

import { manifest } from "../manifest";
import { verifySignature } from "./signature";

export const webhookPath = manifest.webhook.path;

const WebhookEventSchema = Schema.Struct({
  type: Schema.String,
  action: Schema.String,
  webhookTimestamp: Schema.Number,
  data: Schema.Struct({ id: Schema.String }),
});

const isRemovalOrRestore = (action: string) => action === "remove" || action === "restore";

export const makeWebhookRoute = (options: {
  readonly secret: string;
  /** Resources by the event's `type`, such as `Issue`. */
  readonly targets: ReadonlyMap<string, ResourceDefinition>;
  readonly issueHistory: ResourceDefinition;
}) =>
  Webhook.route({
    path: webhookPath,
    ackMode: "after-enqueue",
    verify: ({ request, rawBody, payload }) =>
      verifySignature({
        rawBody,
        header: request.headers["linear-signature"],
        secret: options.secret,
        timestamp: payload.webhookTimestamp,
      }).pipe(Effect.as(isRemovalOrRestore(payload.action) && options.targets.has(payload.type))),
    schema: WebhookEventSchema,
    handler: ({ request, rawBody, payload, to }) =>
      Effect.gen(function* () {
        const verified = yield* verifySignature({
          rawBody,
          header: request.headers["linear-signature"],
          secret: options.secret,
          timestamp: payload.webhookTimestamp,
        }).pipe(Effect.result);
        if (Result.isFailure(verified)) {
          return HttpServerResponse.jsonUnsafe(
            { ok: false, error: verified.failure.message },
            { status: 401 },
          );
        }

        // Polling reads creates and updates.
        const resource = options.targets.get(payload.type);
        if (isRemovalOrRestore(payload.action)) {
          if (resource !== undefined) yield* to(resource, payload);
          if (payload.type === "Issue") yield* to(options.issueHistory, payload);
        }

        return HttpServerResponse.jsonUnsafe({ ok: true });
      }),
  });

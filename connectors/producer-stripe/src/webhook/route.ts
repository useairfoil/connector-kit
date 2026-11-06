import { type ResourceDefinition, Webhook } from "@useairfoil/connector-kit";
import { Effect, Result, Schema } from "effect";
import { HttpServerResponse } from "effect/http";

import { manifest } from "../manifest";
import { StripeEventSchema } from "../schemas/events";
import { verifySignature } from "./signature";

export type WebhookTarget = {
  readonly resource: ResourceDefinition;
  readonly eventTypes: ReadonlyArray<string>;
};

export const webhookPath = manifest.webhook.path;

// Known events must fully decode. Other events get a 200 and are skipped.
const makePayloadSchema = (handled: ReadonlySet<string>) =>
  Schema.Union([
    StripeEventSchema.check(
      Schema.makeFilter((event) => handled.has(event.type) || "unhandled event type"),
    ),
    Schema.Struct({
      type: Schema.String.check(
        Schema.makeFilter((type) => !handled.has(type) || "handled event type"),
      ),
    }),
  ]);

export const makeWebhookRoute = (options: {
  readonly secret: string;
  readonly targets: ReadonlyArray<WebhookTarget>;
}) => {
  const byType = new Map<string, ResourceDefinition>(
    options.targets.flatMap((target) => target.eventTypes.map((type) => [type, target.resource])),
  );

  return Webhook.route({
    path: webhookPath,
    ackMode: "after-enqueue",
    verify: ({ request, rawBody, payload }) =>
      verifySignature({
        rawBody,
        header: request.headers["stripe-signature"],
        secret: options.secret,
      }).pipe(Effect.as(byType.has(payload.type))),
    schema: makePayloadSchema(new Set(byType.keys())),
    handler: ({ request, rawBody, payload, to }) =>
      Effect.gen(function* () {
        const verified = yield* verifySignature({
          rawBody,
          header: request.headers["stripe-signature"],
          secret: options.secret,
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
  });
};

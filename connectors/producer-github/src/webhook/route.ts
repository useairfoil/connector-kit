import { type ResourceDefinition, Webhook } from "@useairfoil/connector-kit";
import { Effect, Option, Result, Schema } from "effect";
import { HttpServerResponse } from "effect/http";

import { manifest } from "../manifest";
import { InstallationEventSchema, WebhookPayloadSchema } from "../schemas/events";
import { verifySignature } from "./signature";

export const webhookPath = manifest.webhook.path;

export const makeWebhookRoute = (options: {
  readonly secret: string;
  readonly installationId: number;
  /** Resources by `X-GitHub-Event` name. One event can feed several. */
  readonly targets: ReadonlyMap<string, ReadonlyArray<ResourceDefinition>>;
}) =>
  Webhook.route({
    path: webhookPath,
    ackMode: "after-enqueue",
    verify: ({ request, rawBody, payload }) =>
      verifySignature({
        rawBody,
        header: request.headers["x-hub-signature-256"],
        secret: options.secret,
      }).pipe(
        Effect.as(
          request.headers["x-github-event"] === "ping" ||
            (options.targets.has(request.headers["x-github-event"] ?? "") &&
              Schema.decodeUnknownOption(InstallationEventSchema)(payload).pipe(
                Option.flatMap(({ installation }) => Option.fromNullishOr(installation?.id)),
                Option.contains(options.installationId),
              )),
        ),
      ),
    schema: WebhookPayloadSchema,
    handler: ({ request, rawBody, payload, to }) =>
      Effect.gen(function* () {
        const verified = yield* verifySignature({
          rawBody,
          header: request.headers["x-hub-signature-256"],
          secret: options.secret,
        }).pipe(Effect.result);
        if (Result.isFailure(verified)) {
          return HttpServerResponse.jsonUnsafe(
            { ok: false, error: verified.failure.message },
            { status: 401 },
          );
        }

        // One app can be installed on several accounts, and all of their events
        // come to the same URL. Only ours are stored. `ping` has no installation.
        const installationId = Schema.decodeUnknownOption(InstallationEventSchema)(payload).pipe(
          Option.flatMap(({ installation }) => Option.fromNullishOr(installation?.id)),
        );
        if (Option.contains(installationId, options.installationId)) {
          const resources = options.targets.get(request.headers["x-github-event"] ?? "") ?? [];
          yield* Effect.forEach(resources, (resource) => to(resource, payload), { discard: true });
        }

        return HttpServerResponse.jsonUnsafe({ ok: true });
      }),
  });

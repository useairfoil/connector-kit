import { NodeHttpServer } from "@effect/platform-node";
import { Config, Effect, FileSystem, Layer, Schedule, Schema } from "effect";
import { Command } from "effect/cli";
import { HttpClient, HttpClientRequest, HttpRouter } from "effect/http";
import { createServer } from "node:http";

import type { WebhookRoute } from "../core";

import { ConnectorError } from "../errors";
import * as RuntimeConfig from "../runtime-config";
import { verificationRouter } from "../webhook/verification";

export const WebhookNotification = Schema.Struct({
  version: Schema.Literal(1),
  attempt: Schema.NonEmptyString.check(Schema.isMaxLength(120)),
  event: Schema.Literals(["webhook_verified", "webhook_rejected"]),
});

export const makeWebhookCommand = <E, R>(
  routes: Effect.Effect<ReadonlyArray<WebhookRoute>, E, R>,
) =>
  Command.make("webhook", {}, () =>
    Effect.gen(function* () {
      const webhooks = yield* routes;
      if (webhooks.length === 0 || webhooks.some((route) => route.verify === undefined))
        return yield* new ConnectorError({ message: "Webhook verification is not configured" });

      const url = yield* Config.URL(RuntimeConfig.PlatformRuntimeKey.notificationUrl);
      const tokenPath = yield* Config.NonEmptyString(
        RuntimeConfig.PlatformRuntimeKey.notificationTokenPath,
      );
      const attempt = yield* Config.NonEmptyString(
        RuntimeConfig.PlatformRuntimeKey.notificationAttempt,
      );

      const fileSystem = yield* FileSystem.FileSystem;
      const client = yield* HttpClient.HttpClient;

      const notify = (event: typeof WebhookNotification.Type.event) =>
        Effect.gen(function* () {
          const token = yield* fileSystem.readFileString(tokenPath);
          if (token.trim() === "")
            return yield* new ConnectorError({ message: "Notification identity is unavailable" });
          const request = HttpClientRequest.post(url.href).pipe(
            HttpClientRequest.bearerToken(token.trim()),
            HttpClientRequest.bodyJsonUnsafe({ version: 1, attempt, event }),
          );
          yield* HttpClient.filterStatusOk(client).execute(request);
        }).pipe(
          Effect.scoped,
          Effect.timeout("5 seconds"),
          Effect.retry({ times: 3, schedule: Schedule.spaced("1 second") }),
          Effect.mapError(
            () => new ConnectorError({ message: "Webhook verification notification failed" }),
          ),
        );

      const port = yield* RuntimeConfig.httpPort;
      const routesLayer = yield* verificationRouter(
        webhooks,
        notify("webhook_verified"),
        notify("webhook_rejected"),
      );

      return yield* Layer.launch(
        HttpRouter.serve(routesLayer, { disableLogger: true }).pipe(
          Layer.provide(NodeHttpServer.layer(createServer, { port })),
        ),
      );
    }).pipe(
      Effect.provide(RuntimeConfig.layerHosted()),
      Effect.mapError(
        () => new ConnectorError({ message: "Webhook verification could not start" }),
      ),
      Effect.scoped,
    ),
  );

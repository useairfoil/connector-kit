import { NodeHttpServer } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { Command } from "effect/cli";
import { HttpRouter } from "effect/http";
import { createServer } from "node:http";

import type { WebhookRoute } from "../core";

import { ConnectorError } from "../errors";
import * as RuntimeConfig from "../runtime-config";
import { verificationRouter } from "../webhook/verification";
import { Notifier, notifierFlag, notifierLayer } from "./notifier";

export const makeWebhookCommand = <E, R>(
  routes: Effect.Effect<ReadonlyArray<WebhookRoute>, E, R>,
) =>
  Command.make("webhook", { notifier: notifierFlag }, ({ notifier }) =>
    Effect.gen(function* () {
      const webhooks = yield* routes;
      if (webhooks.length === 0 || webhooks.some((route) => route.verify === undefined))
        return yield* new ConnectorError({ message: "Webhook verification is not configured" });

      const { notify } = yield* Notifier;
      const port = yield* RuntimeConfig.httpPort;
      const routesLayer = yield* verificationRouter(
        webhooks,
        notify({ _tag: "webhook_verified" }),
        notify({ _tag: "webhook_rejected" }),
      );

      return yield* Layer.launch(
        HttpRouter.serve(routesLayer, { disableLogger: true }).pipe(
          Layer.provide(NodeHttpServer.layer(createServer, { port })),
        ),
      );
    }).pipe(
      Effect.provide(notifierLayer(notifier)),
      Effect.provide(RuntimeConfig.layerHosted()),
      Effect.mapError(
        () => new ConnectorError({ message: "Webhook verification could not start" }),
      ),
      Effect.scoped,
    ),
  );

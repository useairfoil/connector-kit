import {
  ConnectorApp,
  Ingestor,
  RuntimeConfig,
  StateStore,
  Telemetry,
} from "@useairfoil/connector-kit";
import { Effect, Layer, Logger } from "effect";
import { Command } from "effect/cli";

import { ShopifyConnector } from "./index";

const ConnectorLayer = ShopifyConnector.layerConfig(ShopifyConnector.ShopifyConfigDef.config);

const TelemetryLayer = Telemetry.layerOtlp({ redactedHeaders: ["x-shopify-access-token"] });

export const sandboxCommand = Command.make("sandbox", {}, () =>
  Effect.gen(function* () {
    const port = yield* RuntimeConfig.httpPort;
    const entrypoint = yield* ShopifyConnector.ShopifyConnector;

    return yield* ConnectorApp.start(entrypoint, { port });
  }).pipe(
    Effect.annotateLogs({ component: "producer-shopify" }),
    Effect.provide(
      Layer.mergeAll(StateStore.layerMemory, Ingestor.layerConsole, ConnectorLayer, TelemetryLayer),
    ),
    Effect.provide(Logger.layer([Logger.consoleLogFmt])),
  ),
).pipe(Command.withDescription("Run the connector locally and log ingested data"));

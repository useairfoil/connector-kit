import {
  ConnectorApp,
  Ingestor,
  RuntimeConfig,
  StateStore,
  Telemetry,
} from "@useairfoil/connector-kit";
import { Effect, Layer, Logger } from "effect";
import { Command } from "effect/cli";

import { LinearConnector } from "./index";

const ConnectorLayer = LinearConnector.layerConfig(LinearConnector.LinearConfigDef.config);

const TelemetryLayer = Telemetry.layerOtlp();

export const sandboxCommand = Command.make("sandbox", {}, () =>
  Effect.gen(function* () {
    const port = yield* RuntimeConfig.httpPort;
    const entrypoint = yield* LinearConnector.LinearConnector;

    return yield* ConnectorApp.start(entrypoint, { port });
  }).pipe(
    Effect.annotateLogs({ component: "linear" }),
    Effect.provide(
      Layer.mergeAll(StateStore.layerMemory, Ingestor.layerConsole, ConnectorLayer, TelemetryLayer),
    ),
    Effect.provide(Logger.layer([Logger.consoleLogFmt])),
  ),
).pipe(Command.withDescription("Run the connector locally and log ingested data"));

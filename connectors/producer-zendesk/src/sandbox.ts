import {
  ConnectorApp,
  Ingestor,
  RuntimeConfig,
  StateStore,
  Telemetry,
} from "@useairfoil/connector-kit";
import { Effect, Layer, Logger } from "effect";
import { Command } from "effect/cli";

import { ZendeskConnector } from "./index";

const ConnectorLayer = ZendeskConnector.layerConfig(ZendeskConnector.ZendeskConfigDef.config);

const TelemetryLayer = Telemetry.layerOtlp();

export const sandboxCommand = Command.make("sandbox", {}, () =>
  Effect.gen(function* () {
    const port = yield* RuntimeConfig.httpPort;
    const entrypoint = yield* ZendeskConnector.ZendeskConnector;

    return yield* ConnectorApp.start(entrypoint, { port });
  }).pipe(
    Effect.annotateLogs({ component: "zendesk" }),
    Effect.provide(
      Layer.mergeAll(StateStore.layerMemory, Ingestor.layerConsole, ConnectorLayer, TelemetryLayer),
    ),
    Effect.provide(Logger.layer([Logger.consoleLogFmt])),
  ),
).pipe(Command.withDescription("Run the connector locally and log ingested data"));

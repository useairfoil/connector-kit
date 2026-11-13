import { PgClient } from "@effect/sql-pg";
import {
  ConnectorApp,
  Ingestor,
  RuntimeConfig,
  StateStore,
  Telemetry,
} from "@useairfoil/connector-kit";
import { Config, Effect, Layer, Logger, Schema } from "effect";
import { Command } from "effect/cli";

import * as LinearClient from "./client/client";
import { LinearConnector } from "./index";
import { LinearConnectionConfigDef, LinearWebhookConfigDef } from "./manifest";

const ConnectorLayer = LinearConnector.layerConfig(LinearConnector.LinearConfigDef.config);
const TelemetryLayer = Telemetry.layerOtlp();
const PostgresLayer = PgClient.layerConfig({
  url: Config.schema(
    Schema.Redacted(Schema.NonEmptyString),
    RuntimeConfig.PlatformRuntimeKey.postgresConnectionString,
  ),
  maxConnections: Config.succeed(2),
  connectTimeout: Config.succeed("5 seconds"),
  applicationName: Config.succeed("airfoil-producer-linear"),
});
const StateStoreLayer = StateStore.layerSql().pipe(Layer.provide(PostgresLayer));

export const startCommand = Command.make("start", {}, () =>
  Effect.gen(function* () {
    const port = yield* RuntimeConfig.httpPort;
    const entrypoint = yield* LinearConnector.LinearConnector;

    return yield* ConnectorApp.start(entrypoint, { port }).pipe(
      Effect.provide(Ingestor.layerArrowFlightConfig(entrypoint)),
    );
  }).pipe(
    Effect.annotateLogs({ component: "linear" }),
    Effect.provide(Layer.mergeAll(StateStoreLayer, ConnectorLayer, TelemetryLayer)),
    Effect.provide(RuntimeConfig.layerHosted()),
    Effect.provide(Logger.layer([Logger.consoleLogFmt])),
  ),
).pipe(Command.withDescription("Run the connector"));

const ConnectionLayer = LinearClient.layerConfig(LinearConnectionConfigDef.config);

export const webhookCommand = ConnectorApp.makeWebhookCommand(
  LinearWebhookConfigDef.config.pipe(
    Effect.flatMap(LinearConnector.webhooks),
    Effect.provide(ConnectionLayer),
  ),
);

export const checkCommand = ConnectorApp.makeCheckCommand(
  LinearConnector.resources.pipe(Effect.provide(ConnectionLayer)),
);

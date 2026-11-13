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

import * as PolarApiClient from "./api";
import { PolarConnector } from "./index";
import { PolarConnectionConfigDef, PolarWebhookConfigDef } from "./manifest";

const ConnectorLayer = PolarConnector.layerConfig(PolarConnector.PolarConfigDef.config);
const TelemetryLayer = Telemetry.layerOtlp();
const PostgresLayer = PgClient.layerConfig({
  url: Config.schema(
    Schema.Redacted(Schema.NonEmptyString),
    RuntimeConfig.PlatformRuntimeKey.postgresConnectionString,
  ),
  maxConnections: Config.succeed(2),
  connectTimeout: Config.succeed("5 seconds"),
  applicationName: Config.succeed("airfoil-producer-polar"),
});
const StateStoreLayer = StateStore.layerSql().pipe(Layer.provide(PostgresLayer));

export const startCommand = Command.make("start", {}, () =>
  Effect.gen(function* () {
    const port = yield* RuntimeConfig.httpPort;
    const entrypoint = yield* PolarConnector.PolarConnector;

    return yield* ConnectorApp.start(entrypoint, { port }).pipe(
      Effect.provide(Ingestor.layerArrowFlightConfig(entrypoint)),
    );
  }).pipe(
    Effect.annotateLogs({ component: "polar" }),
    Effect.provide(Layer.mergeAll(StateStoreLayer, ConnectorLayer, TelemetryLayer)),
    Effect.provide(RuntimeConfig.layerHosted()),
    Effect.provide(Logger.layer([Logger.consoleLogFmt])),
  ),
).pipe(Command.withDescription("Run the connector"));

const ConnectionLayer = PolarApiClient.layerConfig(PolarConnectionConfigDef.config);

export const webhookCommand = ConnectorApp.makeWebhookCommand(
  PolarWebhookConfigDef.config.pipe(
    Effect.flatMap(PolarConnector.webhooks),
    Effect.provide(ConnectionLayer),
  ),
);

export const checkCommand = ConnectorApp.makeCheckCommand(
  PolarConnector.resources.pipe(Effect.provide(ConnectionLayer)),
);

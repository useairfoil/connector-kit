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

import * as GitHubClient from "./client/client";
import { GitHubConnector } from "./index";
import { GitHubConnectionConfigDef, GitHubWebhookConfigDef } from "./manifest";

const ConnectorLayer = GitHubConnector.layerConfig(GitHubConnector.GitHubConfigDef.config);
const TelemetryLayer = Telemetry.layerOtlp();
const PostgresLayer = PgClient.layerConfig({
  url: Config.schema(
    Schema.Redacted(Schema.NonEmptyString),
    RuntimeConfig.PlatformRuntimeKey.postgresConnectionString,
  ),
  maxConnections: Config.succeed(2),
  connectTimeout: Config.succeed("5 seconds"),
  applicationName: Config.succeed("airfoil-producer-github"),
});
const StateStoreLayer = StateStore.layerSql().pipe(Layer.provide(PostgresLayer));

export const startCommand = Command.make("start", {}, () =>
  Effect.gen(function* () {
    const port = yield* RuntimeConfig.httpPort;
    const entrypoint = yield* GitHubConnector.GitHubConnector;

    return yield* ConnectorApp.start(entrypoint, { port }).pipe(
      Effect.provide(Ingestor.layerArrowFlightConfig(entrypoint)),
    );
  }).pipe(
    Effect.annotateLogs({ component: "github" }),
    Effect.provide(Layer.mergeAll(StateStoreLayer, ConnectorLayer, TelemetryLayer)),
    Effect.provide(RuntimeConfig.layerHosted()),
    Effect.provide(Logger.layer([Logger.consoleLogFmt])),
  ),
).pipe(Command.withDescription("Run the connector"));

const ConnectionLayer = GitHubClient.layerConfig(GitHubConnectionConfigDef.config);

export const webhookCommand = ConnectorApp.makeWebhookCommand(
  GitHubWebhookConfigDef.config.pipe(
    Effect.flatMap(GitHubConnector.webhooks),
    Effect.provide(ConnectionLayer),
  ),
);

export const checkCommand = ConnectorApp.makeCheckCommand(
  GitHubConnector.resources.pipe(Effect.provide(ConnectionLayer)),
);

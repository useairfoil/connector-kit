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

import * as ShopifyAuth from "./api/auth";
import * as ShopifyApiClient from "./api/client";
import { ShopifyConnector } from "./index";
import { ShopifyConnectionConfigDef, ShopifyWebhookConfigDef } from "./manifest";

const ConnectorLayer = ShopifyConnector.layerConfig(ShopifyConnector.ShopifyConfigDef.config);

const TelemetryLayer = Telemetry.layerOtlp({
  redactedHeaders: ["x-shopify-access-token"],
});
const PostgresLayer = PgClient.layerConfig({
  url: Config.schema(
    Schema.Redacted(Schema.NonEmptyString),
    RuntimeConfig.PlatformRuntimeKey.postgresConnectionString,
  ),
  maxConnections: Config.succeed(2),
  connectTimeout: Config.succeed("5 seconds"),
  applicationName: Config.succeed("airfoil-producer-shopify"),
});
const StateStoreLayer = StateStore.layerSql().pipe(Layer.provide(PostgresLayer));

export const startCommand = Command.make("start", {}, () =>
  Effect.gen(function* () {
    const port = yield* RuntimeConfig.httpPort;
    const entrypoint = yield* ShopifyConnector.ShopifyConnector;

    return yield* ConnectorApp.start(entrypoint, { port }).pipe(
      Effect.provide(Ingestor.layerArrowFlightConfig(entrypoint)),
    );
  }).pipe(
    Effect.annotateLogs({ component: "producer-shopify" }),
    Effect.provide(
      Layer.mergeAll(
        StateStoreLayer,
        ConnectorLayer,
        Logger.layer([Logger.consolePretty()]),
        TelemetryLayer,
      ),
    ),
    Effect.provide(RuntimeConfig.layerHosted()),
  ),
).pipe(Command.withDescription("Run the connector"));

const ConnectionLayer = ShopifyApiClient.layerConfig(ShopifyConnectionConfigDef.config).pipe(
  Layer.provide(ShopifyAuth.layerConfig(ShopifyConnectionConfigDef.config)),
);

export const webhookCommand = ConnectorApp.makeWebhookCommand(
  ShopifyWebhookConfigDef.config.pipe(
    Effect.flatMap(ShopifyConnector.webhooks),
    Effect.provide(ConnectionLayer),
  ),
);

export const checkCommand = ConnectorApp.makeCheckCommand(
  ShopifyConnector.resources.pipe(Effect.provide(ConnectionLayer)),
);

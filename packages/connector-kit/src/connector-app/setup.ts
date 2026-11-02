import { CatalogManager } from "@useairfoil/api";
import { Duration, Effect, Option, Schema } from "effect";
import { Command, Flag } from "effect/cli";

import { retryCatalogRequest } from "../catalog/retry";
import { ensureTable } from "../catalog/table";
import * as RuntimeConfig from "../runtime-config";

/** Creates or verifies all bound tables without loading provider credentials. */
export const makeSetupCommand = (schemas: Readonly<Record<string, Schema.Top>>) =>
  Command.make(
    "setup",
    {
      checkpointIntervalSec: Flag.Int("checkpoint-interval-sec").pipe(
        Flag.withSchema(Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 900 }))),
        Flag.withDescription(
          "Checkpoint interval for new tables in seconds (0 disables the interval delay)",
        ),
        Flag.optional,
      ),
      retryInterval: Flag.String("retry-interval").pipe(
        Flag.withDefault("5 seconds"),
        Flag.withSchema(Schema.DurationFromString),
        Flag.filter(
          (duration) => Duration.isPositive(duration) && Duration.isFinite(duration),
          () => "a positive duration, such as 5 seconds",
        ),
        Flag.withDescription("Delay between transient catalog retries"),
      ),
      retries: Flag.Int("retries").pipe(
        Flag.withDefault(10),
        Flag.filter(
          (value) => value >= 0,
          () => "a non-negative number of retries",
        ),
        Flag.withDescription("Maximum retries per catalog request after the initial attempt"),
      ),
    },
    ({ retryInterval, retries, checkpointIntervalSec }) =>
      Effect.gen(function* () {
        const source = {
          resources: Object.entries(schemas).map(([name, rowSchema]) => ({ name, rowSchema })),
        };
        const tables = yield* RuntimeConfig.loadTableBindings(source);
        const uri = yield* RuntimeConfig.engineUri;
        const catalogId = yield* RuntimeConfig.catalog;
        const manager = yield* CatalogManager.make({ engineUri: uri.href });
        const retry = { interval: retryInterval, times: retries };
        const properties = Option.match(checkpointIntervalSec, {
          onNone: () => undefined,
          onSome: (seconds) => ({ "airfoil.checkpoint.interval-sec": String(seconds) }),
        });
        const catalog = yield* retryCatalogRequest(manager.getIcebergCatalog(catalogId), retry);

        // Sequential setup avoids bursting the catalog's table-creation quota.
        for (const resource of source.resources) {
          const binding = tables[resource.name];
          if (!binding) continue;
          yield* ensureTable(resource.rowSchema, {
            catalog,
            identifier: binding,
            location: binding.location,
            retry,
            properties,
          });
          yield* Effect.logInfo(`Prepared ${[...binding.namespace, binding.name].join(".")}`);
        }
      }),
  ).pipe(Command.withDescription("Create or verify the Iceberg tables in AIRFOIL_TABLE_BINDINGS"));

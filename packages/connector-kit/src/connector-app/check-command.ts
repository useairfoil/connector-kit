import { Effect } from "effect";
import { Command } from "effect/cli";

import type { ResourceDefinition } from "../core/types";

import { ConnectorError } from "../errors";
import * as RuntimeConfig from "../runtime-config";
import { Notifier, notifierFlag, notifierLayer } from "./notifier";

export const makeCheckCommand = <E, R>(
  resources: Effect.Effect<ReadonlyArray<ResourceDefinition>, E, R>,
) =>
  Command.make("check", { notifier: notifierFlag }, ({ notifier }) =>
    Effect.gen(function* () {
      const source = { resources: yield* resources };
      const bindings = yield* RuntimeConfig.loadTableBindings(source);

      const results = yield* Effect.forEach(
        source.resources.filter((resource) => Object.hasOwn(bindings, resource.name)),
        (resource) =>
          resource.check.pipe(
            Effect.match({
              onFailure: () => ({ resource: resource.name, status: "check_failed" as const }),
              onSuccess: () => ({ resource: resource.name, status: "ok" as const }),
            }),
          ),
      );

      const { notify } = yield* Notifier;
      yield* notify({ _tag: "check_completed", resources: results });
      if (results.some((result) => result.status !== "ok"))
        return yield* new ConnectorError({ message: "Connector connection check failed" });
    }).pipe(
      Effect.provide(notifierLayer(notifier)),
      Effect.timeout("3 minutes"),
      Effect.provide(RuntimeConfig.layerHosted()),
      Effect.mapError(() => new ConnectorError({ message: "Connector connection check failed" })),
      Effect.scoped,
    ),
  );

import { DateTime, Effect, Option, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import humanFormat from "human-format";

import { run, type DemoDefinition } from "../demo";
import { layerArrowFlightConfig } from "../ingestor/arrow-flight";

/** Reads byte sizes such as `512kB`, `128MB` or `1.5GB`. */
export const parseSize = (input: string): Option.Option<number> =>
  Option.liftThrowable(() => humanFormat.parse.bytes(input))().pipe(
    Option.filter((bytes) => Number.isSafeInteger(bytes) && bytes > 0),
  );

/**
 * Creates the command that writes demo data over Arrow Flight, then exits.
 * It reads hosted config and table bindings, so provide `RuntimeConfig.layerHosted()`.
 */
export const makeDemoCommand = (demo: DemoDefinition) =>
  Command.make(
    "demo",
    {
      size: Flag.String("size").pipe(
        Flag.filterMap(parseSize, () => "a size like 512kB, 128MB or 1.5GB"),
      ),
      seed: Flag.Int("seed").pipe(Flag.optional),
      checkpointIntervalSec: Flag.Int("checkpoint-interval-sec").pipe(
        Flag.withSchema(Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 900 }))),
        Flag.withDescription(
          "Checkpoint interval for new tables in seconds (0 disables the interval delay)",
        ),
        Flag.optional,
      ),
    },
    ({ size, seed, checkpointIntervalSec }) =>
      Effect.gen(function* () {
        const now = yield* DateTime.nowAsDate;

        yield* run(demo, { bytes: size, seed: Option.getOrUndefined(seed), now }).pipe(
          Effect.provide(
            layerArrowFlightConfig(
              { resources: [...demo.setup.tables, ...demo.group.tables] },
              Option.match(checkpointIntervalSec, {
                onNone: () => undefined,
                onSome: (seconds) => ({ "airfoil.checkpoint.interval-sec": String(seconds) }),
              }),
            ),
          ),
        );
      }),
  ).pipe(Command.withDescription("Write demo data for the bound tables, then exit"));

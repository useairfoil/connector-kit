import { ByteSize, DateTime, Effect, Option } from "effect";
import { Command, Flag } from "effect/cli";

import { run, type DemoDefinition } from "../demo";
import { layerArrowFlightConfig } from "../ingestor/arrow-flight";

/** Reads sizes such as `512KiB`, `128MiB` or `1GiB`. */
export const parseSize = (input: string): Option.Option<number> => {
  if (!/^\d+(KiB|MiB|GiB)$/.test(input)) return Option.none();

  return ByteSize.fromString(input).pipe(
    Option.flatMap(ByteSize.toNumber),
    Option.filter((bytes) => bytes > 0),
  );
};

/**
 * Creates the command that writes demo data over Arrow Flight, then exits.
 * It reads hosted config and table bindings, so provide `RuntimeConfig.layerHosted()`.
 */
export const makeDemoCommand = (demo: DemoDefinition) =>
  Command.make(
    "demo",
    {
      size: Flag.String("size").pipe(
        Flag.filterMap(parseSize, () => "a size like 512KiB, 128MiB or 1GiB"),
      ),
      seed: Flag.Int("seed").pipe(Flag.withDefault(1)),
    },
    ({ size, seed }) =>
      Effect.gen(function* () {
        const now = yield* DateTime.nowAsDate;

        yield* run(demo, { bytes: size, seed, now }).pipe(
          Effect.provide(
            layerArrowFlightConfig({
              resources: [...demo.setup.tables, ...demo.group.tables],
            }),
          ),
        );
      }),
  ).pipe(Command.withDescription("Write demo data for the bound tables, then exit"));

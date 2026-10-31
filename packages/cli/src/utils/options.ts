import { Config } from "effect";
import { Flag, GlobalFlag } from "effect/cli";

export const EngineUri = GlobalFlag.Setting("uri")({
  flag: Flag.String("uri").pipe(
    Flag.withDefault("http://localhost:7777"),
    Flag.withDescription("Engine URI"),
  ),
});

export const Output = GlobalFlag.Setting("output")({
  flag: Flag.Literals("output", ["default", "json"] as const).pipe(
    Flag.withDefault("default"),
    Flag.withDescription("Log output format"),
  ),
});

export const catalogFlag = Flag.String("catalog").pipe(
  Flag.withDescription("Catalog ID. Alternatively, use the AIRFOIL_CATALOG environment variable"),
  Flag.withFallbackConfig(Config.NonEmptyString("AIRFOIL_CATALOG")),
);

import { Config } from "effect";

import { PlatformRuntimeDefault, PlatformRuntimeKey } from "./constants";

/** Shared HTTP port used by hosted and sandbox connector entrypoints. */
export const httpPort = Config.Port(PlatformRuntimeKey.httpPort).pipe(
  Config.withDefault(PlatformRuntimeDefault.httpPort),
);

/** Engine URL, including the protocol. */
export const engineUri = Config.URL(PlatformRuntimeKey.engineUri);

/** Catalog ID. */
export const catalog = Config.NonEmptyString(PlatformRuntimeKey.catalog);

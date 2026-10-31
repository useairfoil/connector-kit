import { NodeServices } from "@effect/platform-node";
import { describe, expect, it } from "@effect/vitest";
import { Config, ConfigProvider, Effect, Exit, FileSystem, Redacted } from "effect";

import * as RuntimeConfig from "../src/runtime-config";

describe("runtime config", () => {
  it.effect("provides the shared HTTP and engine runtime configuration", () =>
    Effect.gen(function* () {
      const port = yield* RuntimeConfig.httpPort;
      const engineUri = yield* RuntimeConfig.engineUri;
      const catalog = yield* RuntimeConfig.catalog;

      expect(port).toBe(9090);
      expect(engineUri.href).toBe("http://engine:7777/");
      expect(catalog).toBe("default-catalog");
    }).pipe(
      Effect.provide(
        ConfigProvider.layer(
          ConfigProvider.fromUnknown({
            [RuntimeConfig.PlatformRuntimeKey.httpPort]: 9090,
            ENGINE_URI: "http://engine:7777",
            [RuntimeConfig.PlatformRuntimeKey.catalog]: "default-catalog",
          }),
        ),
      ),
    ),
  );

  it.effect("defaults the shared HTTP port to 8080", () =>
    RuntimeConfig.httpPort.pipe(
      Effect.provide(ConfigProvider.layer(ConfigProvider.fromUnknown({}))),
      Effect.map((port) => expect(port).toBe(8080)),
    ),
  );

  it.effect("classifies a missing path and an unreadable file", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const directory = yield* fs.makeTempDirectoryScoped();

      const missingPath = yield* Config.String("API_TOKEN").pipe(
        Effect.provide(RuntimeConfig.layerHosted()),
        Effect.provide(ConfigProvider.layer(ConfigProvider.fromUnknown({}))),
        Effect.flip,
      );
      const unreadableFile = yield* Config.String("API_TOKEN").pipe(
        Effect.provide(RuntimeConfig.layerHosted()),
        Effect.provide(
          ConfigProvider.layer(
            ConfigProvider.fromUnknown({
              [RuntimeConfig.PlatformRuntimeKey.configPath]: `${directory}/missing.json`,
            }),
          ),
        ),
        Effect.flip,
      );

      expect(missingPath).toMatchObject({ code: "CONFIG_PATH_MISSING" });
      expect(missingPath.cause).toMatchObject({ _tag: "SchemaError" });
      expect(unreadableFile).toMatchObject({ code: "CONFIG_FILE_UNREADABLE" });
      expect(unreadableFile.cause).toMatchObject({ _tag: "PlatformError" });
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("rejects malformed JSON", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const directory = yield* fs.makeTempDirectoryScoped();
      const configPath = `${directory}/config.json`;
      yield* fs.writeFileString(configPath, `{"API_TOKEN":"token",`);

      const error = yield* Config.String("API_TOKEN").pipe(
        Effect.provide(RuntimeConfig.layerHosted()),
        Effect.provide(
          ConfigProvider.layer(
            ConfigProvider.fromUnknown({
              [RuntimeConfig.PlatformRuntimeKey.configPath]: configPath,
            }),
          ),
        ),
        Effect.flip,
      );

      expect(error).toMatchObject({ code: "CONFIG_JSON_INVALID" });
      expect(error.cause).toMatchObject({ _tag: "SchemaError" });
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("loads the JSON file and lets environment values override individual keys", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const directory = yield* fs.makeTempDirectoryScoped();
      const configPath = `${directory}/config.json`;
      yield* fs.writeFileString(
        configPath,
        JSON.stringify({ API_TOKEN: "file-token", API_PORT: 8080, API_ENABLED: true }),
      );

      const config = yield* Config.all({
        token: Config.Redacted("API_TOKEN"),
        port: Config.Number("API_PORT"),
        enabled: Config.Boolean("API_ENABLED"),
      }).pipe(
        Effect.provide(RuntimeConfig.layerHosted()),
        Effect.provide(
          ConfigProvider.layer(
            ConfigProvider.fromUnknown({
              [RuntimeConfig.PlatformRuntimeKey.configPath]: configPath,
              API_TOKEN: "env-token",
            }),
          ),
        ),
      );

      expect(Redacted.value(config.token)).toBe("env-token");
      expect(config.port).toBe(8080);
      expect(config.enabled).toBe(true);
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("does not hide an invalid environment override with a valid file value", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const directory = yield* fs.makeTempDirectoryScoped();
      const configPath = `${directory}/config.json`;
      yield* fs.writeFileString(configPath, JSON.stringify({ API_PORT: 8080 }));

      const result = yield* Config.Number("API_PORT").pipe(
        Effect.provide(RuntimeConfig.layerHosted()),
        Effect.provide(
          ConfigProvider.layer(
            ConfigProvider.fromUnknown({
              [RuntimeConfig.PlatformRuntimeKey.configPath]: configPath,
              API_PORT: "not-a-number",
            }),
          ),
        ),
        Effect.exit,
      );

      expect(Exit.isFailure(result)).toBe(true);
    }).pipe(Effect.provide(NodeServices.layer)),
  );
});

import { describe, expect, it } from "@effect/vitest";
import { ConfigProvider, Effect, Exit, Option, Redacted, Schema } from "effect";

import * as Manifest from "../src/manifest";
import * as RuntimeConfig from "../src/runtime-config";

describe("connector manifests", () => {
  it("preserves resource descriptions in serializable metadata", () => {
    const manifest: Manifest.ConnectorManifest = Manifest.define({
      name: "producer-test",
      title: "Test Producer",
      config: [],
      resources: [
        { name: "items", description: "Items in an account.", capabilities: ["backfill"] },
      ],
    });

    expect(JSON.parse(JSON.stringify(manifest)).resources).toEqual([
      { name: "items", description: "Items in an account.", capabilities: ["backfill"] },
    ]);
  });

  it.effect("builds runtime config and serializable specs together", () => {
    const def = Manifest.defineConfig({
      token: Manifest.secret({ runtimeKey: "API_TOKEN", description: "API token" }),
      baseUrl: Manifest.string({ runtimeKey: "API_BASE_URL", default: "https://example.test" }),
      optionalRegion: Manifest.string({ runtimeKey: "API_REGION", required: false, default: "us" }),
      optionalOrg: Manifest.optional(Manifest.string({ runtimeKey: "ORG_ID" })),
      mode: Manifest.select({ runtimeKey: "MODE", values: ["test", "live"], default: "test" }),
    });

    return Effect.gen(function* () {
      const value = yield* def.config;

      expect({
        value: {
          token: Redacted.value(value.token),
          baseUrl: value.baseUrl,
          optionalRegion: value.optionalRegion,
          optionalOrgIsNone: Option.isNone(value.optionalOrg),
          mode: value.mode,
        },
        spec: def.spec,
      }).toMatchInlineSnapshot(`
        {
          "spec": [
            {
              "description": "API token",
              "name": "token",
              "required": true,
              "runtimeKey": "API_TOKEN",
              "secret": true,
              "type": "string",
            },
            {
              "default": "https://example.test",
              "name": "baseUrl",
              "required": true,
              "runtimeKey": "API_BASE_URL",
              "secret": false,
              "type": "string",
            },
            {
              "default": "us",
              "name": "optionalRegion",
              "required": false,
              "runtimeKey": "API_REGION",
              "secret": false,
              "type": "string",
            },
            {
              "name": "optionalOrg",
              "required": false,
              "runtimeKey": "ORG_ID",
              "secret": false,
              "type": "string",
            },
            {
              "default": "test",
              "name": "mode",
              "required": true,
              "runtimeKey": "MODE",
              "secret": false,
              "type": "select",
              "values": [
                "test",
                "live",
              ],
            },
          ],
          "value": {
            "baseUrl": "https://example.test",
            "mode": "test",
            "optionalOrgIsNone": true,
            "optionalRegion": "us",
            "token": "secret",
          },
        }
      `);
    }).pipe(
      Effect.provide(
        ConfigProvider.layer(
          ConfigProvider.fromUnknown({
            API_TOKEN: "secret",
          }),
        ),
      ),
    );
  });

  it.effect("enforces the manifest constraints when loading runtime config", () => {
    const def = Manifest.defineConfig({
      token: Manifest.secret({ runtimeKey: "API_TOKEN" }),
      baseUrl: Manifest.string({ runtimeKey: "API_BASE_URL" }),
      retryLimit: Manifest.number({ runtimeKey: "RETRY_LIMIT" }),
    });
    const load = (input: Record<string, unknown>) =>
      def.config.pipe(
        Effect.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(input))),
        Effect.exit,
      );

    return Effect.gen(function* () {
      const emptySecret = yield* load({
        API_TOKEN: "",
        API_BASE_URL: "https://example.test",
        RETRY_LIMIT: 3,
      });
      const emptyString = yield* load({
        API_TOKEN: "secret",
        API_BASE_URL: "",
        RETRY_LIMIT: 3,
      });
      const infiniteNumber = yield* load({
        API_TOKEN: "secret",
        API_BASE_URL: "https://example.test",
        RETRY_LIMIT: "Infinity",
      });

      expect(Exit.isFailure(emptySecret)).toBe(true);
      expect(Exit.isFailure(emptyString)).toBe(true);
      expect(Exit.isFailure(infiniteNumber)).toBe(true);
    });
  });

  it.effect("applies numeric constraints to runtime and form config", () => {
    const def = Manifest.defineConfig({
      retryLimit: Manifest.number({
        runtimeKey: "RETRY_LIMIT",
        default: 5,
        integer: true,
        minimum: 0,
      }),
      timeoutSeconds: Manifest.number({
        runtimeKey: "TIMEOUT_SECONDS",
        default: 120,
        integer: true,
        minimum: 1,
      }),
    });
    const manifest = Manifest.define({
      name: "producer-test",
      title: "Test Producer",
      config: def.spec,
      resources: [],
    });
    const loadRuntime = (input: Record<string, unknown>) =>
      def.config.pipe(
        Effect.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(input))),
        Effect.exit,
      );
    const loadForm = (input: unknown) => Manifest.decodeConfig(manifest, input).pipe(Effect.exit);

    return Effect.gen(function* () {
      const defaults = yield* def.config;
      const runtimeValid = yield* loadRuntime({ RETRY_LIMIT: "2", TIMEOUT_SECONDS: "30" });
      const runtimeDecimal = yield* loadRuntime({ RETRY_LIMIT: "1.5" });
      const runtimeNegative = yield* loadRuntime({ RETRY_LIMIT: "-1" });
      const formValid = yield* Manifest.decodeConfig(manifest, {
        retryLimit: "0",
        timeoutSeconds: "30",
      });
      const formDecimal = yield* loadForm({ retryLimit: "1.5", timeoutSeconds: "30" });
      const formZeroTimeout = yield* loadForm({ retryLimit: "1", timeoutSeconds: "0" });

      expect(defaults).toEqual({ retryLimit: 5, timeoutSeconds: 120 });
      expect(runtimeValid).toEqual(Exit.succeed({ retryLimit: 2, timeoutSeconds: 30 }));
      expect(formValid).toEqual({ retryLimit: 0, timeoutSeconds: 30 });
      expect(Exit.isFailure(runtimeDecimal)).toBe(true);
      expect(Exit.isFailure(runtimeNegative)).toBe(true);
      expect(Exit.isFailure(formDecimal)).toBe(true);
      expect(Exit.isFailure(formZeroTimeout)).toBe(true);
      expect(def.spec[0]).toMatchObject({
        name: "retryLimit",
        integer: true,
        minimum: 0,
      });
      expect(def.spec[1]).toMatchObject({
        name: "timeoutSeconds",
        integer: true,
        minimum: 1,
      });
    }).pipe(Effect.provide(ConfigProvider.layer(ConfigProvider.fromUnknown({}))));
  });

  it("rejects numeric defaults outside their declared constraints", () => {
    expect(() =>
      Manifest.number({
        runtimeKey: "RETRY_LIMIT",
        default: -1,
        integer: true,
        minimum: 0,
      }),
    ).toThrow();
    expect(() =>
      Manifest.number({
        runtimeKey: "RETRY_LIMIT",
        default: 1.5,
        integer: true,
      }),
    ).toThrow();
  });

  it("rejects connector config that claims shared platform runtime keys", () => {
    for (const runtimeKey of Object.values(RuntimeConfig.PlatformRuntimeKey)) {
      expect(() => Manifest.defineConfig({ value: Manifest.string({ runtimeKey }) })).toThrow(
        "platform-owned",
      );
    }

    expect(() =>
      Manifest.defineConfig({
        first: Manifest.string({ runtimeKey: "connector-key" }),
        second: Manifest.string({ runtimeKey: "connector-key" }),
      }),
    ).not.toThrow();
  });

  const formManifest = Manifest.define({
    name: "producer-test",
    title: "Test Producer",
    config: [
      {
        name: "token",
        runtimeKey: "API_TOKEN",
        type: "string",
        required: true,
        secret: true,
      },
      {
        name: "optionalSecret",
        runtimeKey: "OPTIONAL_SECRET",
        type: "string",
        required: false,
        secret: true,
      },
      {
        name: "optionalOrg",
        runtimeKey: "ORG_ID",
        type: "string",
        required: false,
        secret: false,
      },
      {
        name: "port",
        runtimeKey: "PORT",
        type: "number",
        required: true,
        secret: false,
      },
      {
        name: "enabled",
        runtimeKey: "ENABLED",
        type: "boolean",
        required: true,
        secret: false,
      },
      {
        name: "mode",
        runtimeKey: "MODE",
        type: "select",
        required: true,
        secret: false,
        values: ["test", "live"],
      },
      {
        name: "apiBaseUrl",
        runtimeKey: "API_BASE_URL",
        type: "string",
        required: false,
        secret: false,
        default: "https://example.test",
      },
    ],
    resources: [{ name: "items", capabilities: ["backfill"] }],
  });

  const decodeConfig = (input: unknown) =>
    Schema.decodeUnknownEffect(Manifest.configSchema(formManifest))(input);

  it.effect("decodes form-shaped connector config values", () =>
    Effect.gen(function* () {
      const value = yield* decodeConfig({
        token: "abc",
        optionalOrg: "",
        optionalSecret: "",
        port: "8080",
        enabled: true,
        mode: "live",
      });

      expect(value).toMatchInlineSnapshot(`
        {
          "enabled": true,
          "mode": "live",
          "optionalOrg": undefined,
          "optionalSecret": undefined,
          "port": 8080,
          "token": "abc",
        }
      `);
    }),
  );

  it.effect("decodes JSON-shaped connector config values", () =>
    Effect.gen(function* () {
      const value = yield* decodeConfig({
        token: "abc",
        port: 8080,
        enabled: true,
        mode: "live",
      });

      expect(value).toMatchInlineSnapshot(`
        {
          "enabled": true,
          "mode": "live",
          "port": 8080,
          "token": "abc",
        }
      `);
    }),
  );

  it.effect("applies defaults and maps logical form fields to runtime keys", () =>
    Effect.gen(function* () {
      const values = yield* Manifest.decodeConfig(formManifest, {
        token: "abc",
        port: 8080,
        enabled: false,
        mode: "live",
      });

      expect(Manifest.toRuntimeDocument(formManifest, values)).toEqual({
        API_TOKEN: "abc",
        PORT: 8080,
        ENABLED: false,
        MODE: "live",
        API_BASE_URL: "https://example.test",
      });
    }),
  );

  it.effect("applies defaults when optional form controls are empty", () =>
    Effect.gen(function* () {
      const values = yield* Manifest.decodeConfig(formManifest, {
        token: "abc",
        port: 8080,
        enabled: false,
        mode: "live",
        apiBaseUrl: "",
      });

      expect(values.apiBaseUrl).toBe("https://example.test");
    }),
  );

  it.effect("rejects form fields that are not declared by the manifest", () =>
    Effect.gen(function* () {
      const result = yield* Manifest.decodeConfig(formManifest, {
        token: "abc",
        port: 8080,
        enabled: true,
        mode: "live",
        injected: "unexpected",
      }).pipe(Effect.exit);

      expect(Exit.isFailure(result)).toBe(true);
    }),
  );

  it.effect("rejects an empty required string", () =>
    Effect.gen(function* () {
      const result = yield* Effect.exit(
        decodeConfig({ token: "", port: "8080", enabled: true, mode: "live" }),
      );
      expect(Exit.isFailure(result)).toBe(true);
    }),
  );

  it.effect("rejects an empty number", () =>
    Effect.gen(function* () {
      const result = yield* Effect.exit(
        decodeConfig({ token: "abc", port: "", enabled: true, mode: "live" }),
      );
      expect(Exit.isFailure(result)).toBe(true);
    }),
  );

  it.effect("rejects an invalid number", () =>
    Effect.gen(function* () {
      const result = yield* Effect.exit(
        decodeConfig({ token: "abc", port: "abc", enabled: true, mode: "live" }),
      );
      expect(Exit.isFailure(result)).toBe(true);
    }),
  );

  it.effect("rejects an invalid select literal", () =>
    Effect.gen(function* () {
      const result = yield* Effect.exit(
        decodeConfig({ token: "abc", port: "8080", enabled: true, mode: "sandbox" }),
      );
      expect(Exit.isFailure(result)).toBe(true);
    }),
  );

  it.effect("exposes a standard-schema compatible validator", () =>
    Effect.gen(function* () {
      const standardSchema = Schema.toStandardSchemaV1(Manifest.configSchema(formManifest));
      const validResult = yield* Effect.promise(() =>
        Promise.resolve(
          standardSchema["~standard"].validate({
            token: "abc",
            port: "8080",
            enabled: true,
            mode: "live",
          }),
        ),
      );
      const invalidResult = yield* Effect.promise(() =>
        Promise.resolve(
          standardSchema["~standard"].validate({
            token: "abc",
            port: "",
            enabled: true,
            mode: "live",
          }),
        ),
      );

      expect(validResult).toMatchInlineSnapshot(`
        {
          "value": {
            "enabled": true,
            "mode": "live",
            "port": 8080,
            "token": "abc",
          },
        }
      `);
      expect("issues" in invalidResult).toBe(true);
    }),
  );
});

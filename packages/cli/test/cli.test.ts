import { describe, expect, it } from "@effect/vitest";
import { TestEngine } from "@useairfoil/testing";
import { Effect } from "effect";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";

const cliPath = fileURLToPath(new URL("../src/index.ts", import.meta.url));
const cwd = fileURLToPath(new URL("..", import.meta.url));

const execute = (args: ReadonlyArray<string>) =>
  Effect.tryPromise({
    try: () =>
      new Promise<string>((resolve, reject) => {
        execFile(
          process.execPath,
          ["--import", "tsx", cliPath, ...args],
          { cwd, env: { ...process.env, NODE_NO_WARNINGS: "1" } },
          (error, stdout, stderr) => {
            if (error !== null) {
              reject(new Error(`${error.message}\n${stderr}`));
              return;
            }

            resolve(stdout);
          },
        );
      }),
    catch: (error) => error,
  });

describe("airfoil CLI", () => {
  it.effect("manages catalogs, namespaces, and tables", () =>
    Effect.gen(function* () {
      const engine = yield* TestEngine.Instance;
      const uri = yield* engine.uri;
      const icebergRestUri = yield* engine.icebergRestUri;
      const catalog = "cli-integration";
      const namespace = "analytics.events";
      const table = `${namespace}.clicks`;

      const run = (args: ReadonlyArray<string>) =>
        execute(["--uri", uri, "--output", "json", ...args]).pipe(
          Effect.map((stdout) => JSON.parse(stdout) as unknown),
        );

      // Create catalog.
      const createdCatalog = yield* run([
        "catalog",
        "create",
        catalog,
        "--rest",
        JSON.stringify({ uri: icebergRestUri, warehouse: "s3://default-catalog" }),
      ]);

      expect(createdCatalog).toEqual({ id: catalog });

      // Get catalog.
      expect(yield* run(["catalog", "get", catalog])).toMatchObject({
        id: catalog,
      });

      // Create namespace.
      expect(yield* run(["namespace", "create", namespace, "--catalog", catalog])).toMatchObject({
        namespace: ["analytics", "events"],
      });

      // Get namespace.
      expect(yield* run(["namespace", "get", namespace, "--catalog", catalog])).toMatchObject({
        namespace: ["analytics", "events"],
      });

      // List namespaces.
      expect(yield* run(["namespace", "list", "--catalog", catalog])).toMatchObject({
        namespaces: expect.arrayContaining([{ namespace: ["analytics", "events"] }]),
      });

      // Create table.
      expect(
        yield* run([
          "table",
          "create",
          table,
          "--catalog",
          catalog,
          "--schema",
          JSON.stringify([{ id: 1, name: "id", type: "long", required: true }]),
        ]),
      ).toMatchObject({ namespace: ["analytics", "events"], name: "clicks" });

      // Get table.
      expect(yield* run(["table", "get", table, "--catalog", catalog])).toMatchObject({
        namespace: ["analytics", "events"],
        name: "clicks",
      });

      // List tables.
      const identifier = { namespace: ["analytics", "events"], name: "clicks" };
      expect(yield* run(["table", "list", namespace, "--catalog", catalog])).toMatchObject({
        tables: expect.arrayContaining([identifier]),
      });
      expect(yield* run(["table", "list", "--all", "--catalog", catalog])).toMatchObject({
        tables: expect.arrayContaining([identifier]),
      });

      // Delete table.
      expect(yield* run(["table", "delete", table, "--catalog", catalog])).toEqual(identifier);

      // Delete namespace.
      expect(yield* run(["namespace", "delete", namespace, "--catalog", catalog])).toEqual({
        namespace: ["analytics", "events"],
      });

      // Delete catalog.
      expect(yield* run(["catalog", "delete", catalog])).toEqual({ id: catalog });
    }).pipe(Effect.provide(TestEngine.container), Effect.scoped),
  );
});

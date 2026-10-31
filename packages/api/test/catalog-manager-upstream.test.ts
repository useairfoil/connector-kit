import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { FetchHttpClient } from "effect/http";
import { createServer, type RequestListener } from "node:http";

import { CatalogManager } from "../src";

const server = (handler: RequestListener) =>
  Effect.acquireRelease(
    Effect.tryPromise(async () => {
      const instance = createServer(handler);
      await new Promise<void>((resolve, reject) => {
        instance.once("error", reject);
        instance.listen(0, "127.0.0.1", resolve);
      });
      const address = instance.address();
      if (address === null || typeof address === "string")
        throw new Error("Missing server address");
      return { instance, url: `http://127.0.0.1:${address.port}` };
    }),
    ({ instance }) =>
      Effect.promise(() => new Promise<void>((resolve) => instance.close(() => resolve()))),
  );

describe("registered upstream catalog", () => {
  it.effect("loads upstream config with warehouse and configured HTTP credentials", () =>
    Effect.gen(function* () {
      const requests: string[] = [];
      const upstream = yield* server((request, response) => {
        requests.push(request.url ?? "");
        expect(request.headers.authorization).toBe("Bearer synthetic-token");
        expect(request.headers["x-catalog-test"]).toBe("synthetic");
        response.setHeader("content-type", "application/json");
        response.end(JSON.stringify({ defaults: {}, overrides: {} }));
      });
      const engine = yield* server((request, response) => {
        if (request.method === "POST" && request.url === "/catalogs") {
          response.writeHead(201);
          response.end();
          return;
        }
        expect(request.url).toBe("/catalogs/analytics");
        response.setHeader("content-type", "application/json");
        response.end(
          JSON.stringify({
            id: "analytics",
            rest: {
              uri: upstream.url,
              warehouse: "warehouse",
              properties: {
                token: "synthetic-token",
                "header.X-Catalog-Test": "synthetic",
              },
            },
          }),
        );
      });
      const manager = yield* CatalogManager.make({ baseUrl: engine.url });
      expect(
        yield* manager.createCatalog({ id: "analytics", rest: { uri: upstream.url } }),
      ).toBeUndefined();
      const catalog = yield* manager.getIcebergCatalog("analytics");
      yield* catalog.loadConfig();
      expect(requests).toEqual(["/v1/config?warehouse=warehouse"]);
    }).pipe(Effect.provide(FetchHttpClient.layer), Effect.scoped),
  );
});

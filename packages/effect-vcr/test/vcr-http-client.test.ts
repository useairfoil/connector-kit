import { NodeServices } from "@effect/platform-node";
import { describe, expect, it } from "@effect/vitest";
import { ConfigProvider, Effect, Exit, Layer } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse, UrlParams } from "effect/http";

import type { CassetteFile, VcrConfig, VcrEntry } from "../src/types";

import { CassetteStore } from "../src/cassette-store";
import { buildRequestKey } from "../src/sanitize";
import { layer } from "../src/vcr-http-client";
import { makeFailingClient, makeLiveClient, mockCassetteStoreLayer } from "./helpers";

describe("record mode", () => {
  it.effect("stores a cassette entry", () => {
    const config: VcrConfig = {
      vcrName: "test-vcr",
      cassetteName: "record-basic",
      mode: "record",
    };

    const { layer: storeLayer, cassettes } = mockCassetteStoreLayer();
    const live = makeLiveClient("ok");

    const liveLayer = Layer.succeed(HttpClient.HttpClient)(live);
    const vcrLayer = layer(config).pipe(
      Layer.provide(Layer.mergeAll(storeLayer, liveLayer, NodeServices.layer)),
    );

    return Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient;
      const response = yield* client.get("https://example.com/");
      const text = yield* response.text;

      expect(text).toBe("ok");
      const file = cassettes.get("record-basic.cassette");
      const cassette = file?.exports.default;
      expect(cassette).toBeDefined();
      expect(Object.keys(cassette!.entries)).toHaveLength(1);
      const entry = Object.values(cassette!.entries)[0];
      expect(entry.response.body).toBe("ok");
    }).pipe(Effect.provide(vcrLayer));
  });
});

describe("query params", () => {
  it.effect("records and replays requests that only differ in their params", () => {
    const { layer: storeLayer, cassettes } = mockCassetteStoreLayer();
    const echo = HttpClient.make((request) =>
      Effect.succeed(
        HttpClientResponse.fromWeb(
          request,
          new Response(UrlParams.toString(request.urlParams), {
            headers: { "content-type": "text/plain" },
          }),
        ),
      ),
    );
    const vcrLayer = (mode: VcrConfig["mode"], live: HttpClient.HttpClient) =>
      layer({ cassetteName: "query-params", mode }).pipe(
        Layer.provide(
          Layer.mergeAll(
            storeLayer,
            Layer.succeed(HttpClient.HttpClient)(live),
            NodeServices.layer,
          ),
        ),
      );
    const getBoth = Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient;
      const get = (type: string) =>
        client
          .execute(
            HttpClientRequest.get("https://example.com/events").pipe(
              HttpClientRequest.setUrlParams([["types[]", type]]),
            ),
          )
          .pipe(Effect.flatMap((response) => response.text));
      return [yield* get("a"), yield* get("b")];
    });

    return Effect.gen(function* () {
      const recorded = yield* getBoth.pipe(Effect.provide(vcrLayer("record", echo)));
      const replayed = yield* getBoth.pipe(Effect.provide(vcrLayer("replay", makeFailingClient())));
      const urls = Object.values(
        cassettes.get("query-params.cassette")?.exports.default?.entries ?? {},
      ).map((entry) => entry.request.url);

      expect({ recorded, replayed, urls }).toMatchInlineSnapshot(`
        {
          "recorded": [
            "types%5B%5D=a",
            "types%5B%5D=b",
          ],
          "replayed": [
            "types%5B%5D=a",
            "types%5B%5D=b",
          ],
          "urls": [
            "https://example.com/events?types%5B%5D=a",
            "https://example.com/events?types%5B%5D=b",
          ],
        }
      `);
    });
  });

  it.effect("leaves redacted params out of the cassette and out of matching", () => {
    const { layer: storeLayer, cassettes } = mockCassetteStoreLayer();
    const vcrLayer = (mode: VcrConfig["mode"], live: HttpClient.HttpClient) =>
      layer({
        cassetteName: "redacted-params",
        mode,
        redact: { requestQueryParams: ["account"] },
      }).pipe(
        Layer.provide(
          Layer.mergeAll(
            storeLayer,
            Layer.succeed(HttpClient.HttpClient)(live),
            NodeServices.layer,
          ),
        ),
      );
    const get = (params: ReadonlyArray<readonly [string, string]>) =>
      Effect.gen(function* () {
        const client = yield* HttpClient.HttpClient;
        const response = yield* client.execute(
          HttpClientRequest.get("https://example.com/items").pipe(
            HttpClientRequest.setUrlParams(params),
          ),
        );
        return yield* response.text;
      });

    return Effect.gen(function* () {
      yield* get([
        ["page", "1"],
        ["account", "acct_secret"],
      ]).pipe(Effect.provide(vcrLayer("record", makeLiveClient("ok"))));
      const replayed = yield* Effect.all([
        get([
          ["page", "1"],
          ["account", "acct_other"],
        ]),
        get([["page", "1"]]),
      ]).pipe(Effect.provide(vcrLayer("replay", makeFailingClient())));
      const urls = Object.values(
        cassettes.get("redacted-params.cassette")?.exports.default?.entries ?? {},
      ).map((entry) => entry.request.url);

      expect({ replayed, urls }).toMatchInlineSnapshot(`
        {
          "replayed": [
            "ok",
            "ok",
          ],
          "urls": [
            "https://example.com/items?page=1",
          ],
        }
      `);
    });
  });
});

describe("concurrent recording", () => {
  it.effect("keeps every entry when requests record at the same time", () => {
    const { layer: baseStore, cassettes } = mockCassetteStoreLayer();
    // Yields between load and save, like a real file store, so writes could interleave.
    const slowStore = Layer.effect(CassetteStore)(
      CassetteStore.pipe(
        Effect.map((store) => ({
          ...store,
          loadOrInit: (path: string) =>
            Effect.yieldNow.pipe(Effect.andThen(store.loadOrInit(path))),
          save: (path: string, file: CassetteFile) =>
            Effect.yieldNow.pipe(Effect.andThen(store.save(path, file))),
        })),
      ),
    ).pipe(Layer.provide(baseStore));
    const vcrLayer = layer({ cassetteName: "concurrent", mode: "record" }).pipe(
      Layer.provide(
        Layer.mergeAll(
          slowStore,
          Layer.succeed(HttpClient.HttpClient)(makeLiveClient("ok")),
          NodeServices.layer,
        ),
      ),
    );

    return Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient;
      yield* Effect.forEach(
        Array.from({ length: 10 }, (_, index) => index),
        (index) => client.get(`https://example.com/items/${index}`),
        { concurrency: "unbounded" },
      );

      expect(
        Object.keys(cassettes.get("concurrent.cassette")?.exports.default?.entries ?? {}).sort(),
      ).toMatchInlineSnapshot(`
        [
          "{"body":"","headers":{},"method":"GET","url":"https://example.com/items/0"}",
          "{"body":"","headers":{},"method":"GET","url":"https://example.com/items/1"}",
          "{"body":"","headers":{},"method":"GET","url":"https://example.com/items/2"}",
          "{"body":"","headers":{},"method":"GET","url":"https://example.com/items/3"}",
          "{"body":"","headers":{},"method":"GET","url":"https://example.com/items/4"}",
          "{"body":"","headers":{},"method":"GET","url":"https://example.com/items/5"}",
          "{"body":"","headers":{},"method":"GET","url":"https://example.com/items/6"}",
          "{"body":"","headers":{},"method":"GET","url":"https://example.com/items/7"}",
          "{"body":"","headers":{},"method":"GET","url":"https://example.com/items/8"}",
          "{"body":"","headers":{},"method":"GET","url":"https://example.com/items/9"}",
        ]
      `);
    }).pipe(Effect.provide(vcrLayer));
  });
});

describe("replay mode", () => {
  for (const status of [200, 204, 205, 304]) {
    it.effect(`replays a stored ${status} response without the live client`, () => {
      const config: VcrConfig = {
        cassetteName: "replay-basic",
        mode: "replay",
      };
      const { layer: storeLayer, cassettes } = mockCassetteStoreLayer();
      const client = makeFailingClient();

      const entry: VcrEntry = {
        request: {
          method: "GET",
          url: "https://example.com/",
          headers: {},
          body: "",
        },
        response: {
          status,
          headers: { "content-type": "text/plain" },
          body: status === 200 ? "replayed" : "",
        },
      };

      const liveLayer = Layer.succeed(HttpClient.HttpClient)(client);
      const vcrLayer = layer(config).pipe(
        Layer.provide(Layer.mergeAll(storeLayer, liveLayer, NodeServices.layer)),
      );

      return Effect.gen(function* () {
        const requestKey = yield* buildRequestKey(
          { method: "GET", url: "https://example.com/", headers: {}, body: "" },
          {},
        );
        cassettes.set("replay-basic.cassette", {
          exports: {
            default: {
              meta: { createdAt: "2024-01-01T00:00:00.000Z", version: "1" },
              entries: { [requestKey]: entry },
            },
          },
        });

        const client = yield* HttpClient.HttpClient;
        const response = yield* client.get("https://example.com/");
        const text = yield* response.text;

        expect(response.status).toBe(status);
        expect(text).toBe(status === 200 ? "replayed" : "");
      }).pipe(Effect.provide(vcrLayer));
    });
  }
});

describe("auto mode", () => {
  it.effect("replays when cassette exists", () => {
    const config: VcrConfig = {
      cassetteName: "auto-replay",
      mode: "auto",
    };
    const { layer: storeLayer, cassettes } = mockCassetteStoreLayer();
    const client = makeFailingClient();
    const liveLayer = Layer.succeed(HttpClient.HttpClient)(client);
    const vcrLayer = layer(config).pipe(
      Layer.provide(Layer.mergeAll(storeLayer, liveLayer, NodeServices.layer)),
    );

    return Effect.gen(function* () {
      const requestKey = yield* buildRequestKey(
        { method: "GET", url: "https://example.com/", headers: {}, body: "" },
        {},
      );

      cassettes.set("auto-replay.cassette", {
        exports: {
          default: {
            meta: { createdAt: "2024-01-01T00:00:00.000Z", version: "1" },
            entries: {
              [requestKey]: {
                request: {
                  method: "GET",
                  url: "https://example.com/",
                  headers: {},
                  body: "",
                },
                response: { status: 200, headers: {}, body: "auto-replay" },
              },
            },
          },
        },
      });

      const client = yield* HttpClient.HttpClient;
      const response = yield* client.get("https://example.com/");
      const text = yield* response.text;

      expect(text).toBe("auto-replay");
    }).pipe(Effect.provide(vcrLayer));
  });
});

describe("record with redaction", () => {
  it.effect("removes sensitive data from stored cassette", () => {
    const config: VcrConfig = {
      cassetteName: "redact-ignore",
      mode: "record",
      redact: {
        requestHeaders: ["authorization"],
        requestBodyKeys: ["token"],
      },
      matchIgnore: {
        requestBodyKeys: ["timestamp"],
      },
    };
    const { layer: storeLayer, cassettes } = mockCassetteStoreLayer();
    const client = makeLiveClient("ok");

    const request = HttpClientRequest.post("https://example.com/").pipe(
      HttpClientRequest.setHeader("Authorization", "secret"),
      HttpClientRequest.bodyText(
        JSON.stringify({ token: "secret", timestamp: "1", keep: "yes" }),
        "application/json",
      ),
    );

    const liveLayer = Layer.succeed(HttpClient.HttpClient)(client);
    const vcrLayer = layer(config).pipe(
      Layer.provide(Layer.mergeAll(storeLayer, liveLayer, NodeServices.layer)),
    );

    return Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient;
      yield* client.execute(request);

      const file = cassettes.get("redact-ignore.cassette");
      const cassette = file?.exports.default;
      expect(cassette).toBeDefined();
      const entry = Object.values(cassette!.entries)[0];
      expect(entry.request.headers?.authorization).toBeUndefined();
      expect(entry.request.body).toContain("keep");
      expect(entry.request.body).not.toContain("token");
    }).pipe(Effect.provide(vcrLayer));
  });

  it.effect("stores replayable placeholders without leaking request values into keys", () => {
    const cassetteName = "redact-replacements";
    const config: VcrConfig = {
      cassetteName,
      redact: {
        requestBodyReplacements: {
          client_id: "client-id-placeholder",
          client_secret: "client-secret-placeholder",
        },
        responseBodyReplacements: {
          access_token: "access-token-placeholder",
        },
      },
    };
    const { layer: storeLayer, cassettes } = mockCassetteStoreLayer();
    const recordLayer = layer({ ...config, mode: "record" }).pipe(
      Layer.provide(
        Layer.mergeAll(
          storeLayer,
          Layer.succeed(HttpClient.HttpClient)(
            makeLiveClient(JSON.stringify({ access_token: "real-access-token" })),
          ),
          NodeServices.layer,
        ),
      ),
    );
    const replayLayer = layer({ ...config, mode: "replay" }).pipe(
      Layer.provide(
        Layer.mergeAll(
          storeLayer,
          Layer.succeed(HttpClient.HttpClient)(makeFailingClient()),
          NodeServices.layer,
        ),
      ),
    );
    const tokenRequest = (clientId: string, clientSecret: string) =>
      HttpClientRequest.post("https://example.com/token").pipe(
        HttpClientRequest.bodyUrlParams({
          grant_type: "client_credentials",
          client_id: clientId,
          client_secret: clientSecret,
        }),
      );

    return Effect.gen(function* () {
      yield* Effect.gen(function* () {
        const client = yield* HttpClient.HttpClient;
        yield* client.execute(tokenRequest("real-client-id", "real-client-secret"));
      }).pipe(Effect.provide(recordLayer));

      const file = cassettes.get(`${cassetteName}.cassette`);
      const cassetteText = JSON.stringify(file);
      expect(cassetteText).not.toContain("real-client-id");
      expect(cassetteText).not.toContain("real-client-secret");
      expect(cassetteText).not.toContain("real-access-token");

      expect(file).toBeDefined();
      if (!file) return;
      const entry = Object.values(file.exports.default.entries)[0];
      expect(entry).toBeDefined();
      if (!entry) return;
      expect(new URLSearchParams(entry.request.body).get("client_secret")).toBe(
        "client-secret-placeholder",
      );
      expect(entry.request.headers?.["content-length"]).toBeUndefined();
      expect(JSON.parse(entry.response.body)).toEqual({
        access_token: "access-token-placeholder",
      });

      const replayedToken = yield* Effect.gen(function* () {
        const client = yield* HttpClient.HttpClient;
        const response = yield* client.execute(
          tokenRequest("different-client-id", "different-client-secret"),
        );
        return yield* response.json;
      }).pipe(Effect.provide(replayLayer));

      expect(replayedToken).toEqual({ access_token: "access-token-placeholder" });
    });
  });
});

describe("auto mode in CI", () => {
  it.effect("fails when cassette is missing", () => {
    const config: VcrConfig = {
      cassetteName: "auto-ci-miss",
      mode: "auto",
    };
    const { layer: storeLayer } = mockCassetteStoreLayer();
    const client = makeLiveClient("ok");

    const liveLayer = Layer.succeed(HttpClient.HttpClient)(client);
    const vcrLayer = layer(config).pipe(
      Layer.provide(Layer.mergeAll(storeLayer, liveLayer, NodeServices.layer)),
    );

    return Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient;
      const result = yield* Effect.exit(client.get("https://example.com/"));

      expect(Exit.isFailure(result)).toBe(true);
    }).pipe(
      Effect.provide(
        vcrLayer.pipe(
          Layer.provide(ConfigProvider.layer(ConfigProvider.fromUnknown({ CI: true }))),
        ),
      ),
    );
  });
});

describe("ACK_DISABLE_VCR with vcr name", () => {
  it.effect("bypasses VCR in replay mode when vcrName is disabled", () => {
    const config: VcrConfig = {
      vcrName: "my-test",
      cassetteName: "context-disable",
      mode: "replay",
    };
    const { layer: storeLayer } = mockCassetteStoreLayer();
    const client = makeLiveClient("live-response");

    const liveLayer = Layer.succeed(HttpClient.HttpClient)(client);
    const vcrLayer = layer(config).pipe(
      Layer.provide(Layer.mergeAll(storeLayer, liveLayer, NodeServices.layer)),
    );

    return Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient;
      const response = yield* client.get("https://example.com/");
      const text = yield* response.text;

      expect(text).toBe("live-response");
    }).pipe(
      Effect.provide(
        vcrLayer.pipe(
          Layer.provide(
            ConfigProvider.layer(ConfigProvider.fromUnknown({ ACK_DISABLE_VCR: "my-test" })),
          ),
        ),
      ),
    );
  });

  it.effect("keeps VCR replay behavior when vcrName is not disabled", () => {
    const config: VcrConfig = {
      vcrName: "not-my-test",
      cassetteName: "context-missing",
      mode: "replay",
    };
    const { layer: storeLayer } = mockCassetteStoreLayer();
    const live = makeLiveClient("live-response");

    const liveLayer = Layer.succeed(HttpClient.HttpClient)(live);
    const vcrLayer = layer(config).pipe(
      Layer.provide(Layer.mergeAll(storeLayer, liveLayer, NodeServices.layer)),
    );

    return Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient;
      const result = yield* Effect.exit(client.get("https://example.com/"));

      expect(Exit.isFailure(result)).toBe(true);
    }).pipe(
      Effect.provide(
        vcrLayer.pipe(
          Layer.provide(
            ConfigProvider.layer(ConfigProvider.fromUnknown({ ACK_DISABLE_VCR: "my-test" })),
          ),
        ),
      ),
    );
  });
});

describe("ACK_DISABLE_VCR with '*'", () => {
  it.effect("bypasses VCR in replay mode when vcrName specified", () => {
    const config: VcrConfig = {
      vcrName: "my-test",
      cassetteName: "context-disable",
      mode: "replay",
    };
    const { layer: storeLayer } = mockCassetteStoreLayer();
    const client = makeLiveClient("live-response");

    const liveLayer = Layer.succeed(HttpClient.HttpClient)(client);
    const vcrLayer = layer(config).pipe(
      Layer.provide(Layer.mergeAll(storeLayer, liveLayer, NodeServices.layer)),
    );

    return Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient;
      const response = yield* client.get("https://example.com/");
      const text = yield* response.text;

      expect(text).toBe("live-response");
    }).pipe(
      Effect.provide(
        vcrLayer.pipe(
          Layer.provide(ConfigProvider.layer(ConfigProvider.fromUnknown({ ACK_DISABLE_VCR: "*" }))),
        ),
      ),
    );
  });

  it.effect("bypasses VCR in replay mode when vcrName is undefined", () => {
    const config: VcrConfig = {
      cassetteName: "context-disable",
      mode: "replay",
    };
    const { layer: storeLayer } = mockCassetteStoreLayer();
    const client = makeLiveClient("live-response");

    const liveLayer = Layer.succeed(HttpClient.HttpClient)(client);
    const vcrLayer = layer(config).pipe(
      Layer.provide(Layer.mergeAll(storeLayer, liveLayer, NodeServices.layer)),
    );

    return Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient;
      const response = yield* client.get("https://example.com/");
      const text = yield* response.text;

      expect(text).toBe("live-response");
    }).pipe(
      Effect.provide(
        vcrLayer.pipe(
          Layer.provide(ConfigProvider.layer(ConfigProvider.fromUnknown({ ACK_DISABLE_VCR: "*" }))),
        ),
      ),
    );
  });
});

import { NodeHttpServer, NodeServices } from "@effect/platform-node";
import { describe, expect, it } from "@effect/vitest";
import { ConfigProvider, Effect, FileSystem, Layer, Ref, Schema } from "effect";
import { Command } from "effect/cli";
import { HttpClient, HttpClientRequest, HttpRouter } from "effect/http";
import { createHmac, timingSafeEqual } from "node:crypto";

import { Iceberg, Resource } from "../src";
import { makeCheckCommand } from "../src/connector-app/check-command";
import { ConnectorError } from "../src/errors";
import * as Webhook from "../src/webhook";

describe("connector onboarding", () => {
  it.effect("checks only bound resources and closes their dependencies", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const directory = yield* fs.makeTempDirectoryScoped();
      const configPath = `${directory}/config.json`;
      yield* fs.writeFileString(configPath, "{}");

      const checked = yield* Ref.make<string[]>([]);
      const released = yield* Ref.make(false);
      const row = Schema.Struct({ id: Schema.String, version: Schema.String }).pipe(
        Iceberg.identifier("id"),
      );
      const resources = ["selected", "unselected"].map((name) =>
        Resource.entity({
          name,
          rowSchema: row,
          version: "version",
          check: Ref.update(checked, (names) => [...names, name]),
        }),
      );
      const source = Effect.acquireRelease(Effect.succeed(resources), () =>
        Ref.set(released, true),
      );
      yield* Command.runWith(makeCheckCommand(source), { version: "test" })([]).pipe(
        Effect.provide(
          ConfigProvider.layer(
            ConfigProvider.fromUnknown({
              AIRFOIL_CONFIG_PATH: configPath,
              AIRFOIL_TABLE_BINDINGS: JSON.stringify({
                selected: { namespace: ["test"], name: "selected" },
              }),
            }),
          ),
        ),
      );
      expect(yield* Ref.get(checked)).toEqual(["selected"]);
      expect(yield* Ref.get(released)).toBe(true);
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.live("authenticates and discards verification events without calling resource handlers", () =>
    Effect.gen(function* () {
      const reported = yield* Ref.make(0);
      const body = JSON.stringify({ value: "synthetic-event" });
      const secret = "synthetic-test-signing-key";
      const signature = createHmac("sha256", secret).update(body).digest("hex");
      const route = Webhook.route({
        path: "/events",
        ackMode: "after-ingest",
        schema: Schema.Struct({ value: Schema.String }),
        verify: ({ request, rawBody }) =>
          Effect.gen(function* () {
            const expected = createHmac("sha256", secret).update(rawBody).digest();
            const provided = Buffer.from(request.headers["test-signature"] ?? "", "hex");
            if (provided.length !== expected.length || !timingSafeEqual(expected, provided))
              return yield* new ConnectorError({ message: "Invalid signature" });
            return true;
          }),
        handler: () => Effect.die(new Error("Verification must not run the ingestion handler")),
      });
      const routes = yield* Webhook.verificationRouter(
        [route],
        Ref.getAndUpdate(reported, (value) => value + 1).pipe(
          Effect.flatMap((attempt) =>
            attempt === 0
              ? Effect.fail(new ConnectorError({ message: "Notification unavailable" }))
              : Effect.void,
          ),
        ),
      );
      yield* Layer.build(HttpRouter.serve(routes, { disableLogger: true }));
      const send = (value: string) =>
        HttpClient.execute(
          HttpClientRequest.post("/events").pipe(
            HttpClientRequest.setHeader("test-signature", value),
            HttpClientRequest.bodyText(body),
          ),
        );
      expect((yield* send("invalid")).status).toBe(401);
      expect(yield* Ref.get(reported)).toBe(0);
      expect((yield* send(signature)).status).toBe(503);

      const responses = yield* Effect.all([send(signature), send(signature)], { concurrency: 2 });
      expect(responses.map((response) => response.status)).toEqual([200, 200]);
      expect(yield* Ref.get(reported)).toBe(2);
    }).pipe(Effect.provide(NodeHttpServer.layerTest)),
  );
});

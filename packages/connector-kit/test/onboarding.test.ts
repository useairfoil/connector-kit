import { NodeHttpServer, NodeServices } from "@effect/platform-node";
import { describe, expect, it } from "@effect/vitest";
import { ConfigProvider, Console, Effect, FileSystem, Layer, Ref, Schema } from "effect";
import { Command } from "effect/cli";
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
  HttpRouter,
} from "effect/http";
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
      const output: unknown[] = [];
      yield* Command.runWith(makeCheckCommand(source), { version: "test" })([]).pipe(
        Effect.provideService(Console.Console, {
          ...globalThis.console,
          log: (message) => output.push(JSON.parse(message)),
        }),
        Effect.provide(FetchHttpClient.layer),
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
      expect(output).toEqual([
        {
          version: 1,
          event: { _tag: "check_completed", resources: [{ resource: "selected", status: "ok" }] },
        },
      ]);
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("reports failed checks over HTTP and still fails the command", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const directory = yield* fs.makeTempDirectoryScoped();
      const configPath = `${directory}/config.json`;
      const notifierUrl = "https://operator.example.test/connector-notifications";
      yield* fs.writeFileString(configPath, "{}");

      const resource = Resource.entity({
        name: "selected",
        rowSchema: Schema.Struct({ id: Schema.String, version: Schema.String }).pipe(
          Iceberg.identifier("id"),
        ),
        version: "version",
        check: Effect.fail(new ConnectorError({ message: "Provider rejected the connection" })),
      });
      const report = yield* Ref.make<unknown>(undefined);
      const client = HttpClient.make((request) =>
        Effect.gen(function* () {
          const callback = yield* HttpClientRequest.toWeb(request).pipe(Effect.orDie);
          expect(callback.url).toBe(notifierUrl);
          yield* Ref.set(report, yield* Effect.promise(() => callback.json()));
          return HttpClientResponse.fromWeb(request, new Response(null, { status: 204 }));
        }),
      );

      const result = yield* Command.runWith(makeCheckCommand(Effect.succeed([resource])), {
        version: "test",
      })([]).pipe(
        Effect.provideService(HttpClient.HttpClient, client),
        Effect.provide(
          ConfigProvider.layer(
            ConfigProvider.fromUnknown({
              AIRFOIL_NOTIFIER_URL: notifierUrl,
              AIRFOIL_CONFIG_PATH: configPath,
              AIRFOIL_TABLE_BINDINGS: JSON.stringify({
                selected: { namespace: ["test"], name: "selected" },
              }),
              AIRFOIL_NOTIFICATION_ATTEMPT: "test-attempt",
            }),
          ),
        ),
        Effect.result,
      );

      expect(yield* Ref.get(report)).toEqual({
        version: 1,
        attempt: "test-attempt",
        event: {
          _tag: "check_completed",
          resources: [{ resource: "selected", status: "check_failed" }],
        },
      });
      expect(result._tag).toBe("Failure");
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

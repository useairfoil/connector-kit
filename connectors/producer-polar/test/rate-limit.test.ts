import { describe, expect, it } from "@effect/vitest";
import { Effect, Fiber, Layer, Option, Redacted, Ref, Schema } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";
import { TestClock } from "effect/testing";

import { PolarApiClient } from "../src/index";

describe("producer-polar rate limiting", () => {
  it.effect("gives up on a persistent 429", () =>
    Effect.gen(function* () {
      const callCount = yield* Ref.make(0);
      const client = HttpClient.make((request) =>
        Ref.update(callCount, (n) => n + 1).pipe(
          Effect.as(
            HttpClientResponse.fromWeb(
              request,
              new Response("{}", {
                status: 429,
                headers: { "content-type": "application/json", "retry-after": "1" },
              }),
            ),
          ),
        ),
      );
      const apiLayer = PolarApiClient.layer({
        accessToken: Redacted.make("test-token"),
        apiBaseUrl: "https://api.polar.sh/v1",
        organizationId: Option.none(),
      }).pipe(Layer.provide(Layer.succeed(HttpClient.HttpClient)(client)));

      const fiber = yield* Effect.gen(function* () {
        const api = yield* PolarApiClient.PolarApiClient;
        return yield* api.fetchJson(Schema.Struct({}), "customers/");
      }).pipe(Effect.provide(apiLayer), Effect.exit, Effect.forkDetach);

      yield* TestClock.adjust("1 minute");
      const exit = yield* Fiber.join(fiber);

      expect(exit._tag).toBe("Failure");
      // One request and five retries.
      expect(yield* Ref.get(callCount)).toBe(6);
    }),
  );
});

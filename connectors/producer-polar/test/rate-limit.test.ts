import { describe, expect, it } from "@effect/vitest";
import { Effect, Fiber, Layer, Option, Redacted, Ref, Schema } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";
import { TestClock } from "effect/testing";

import { PolarApiClient } from "../src/index";

const fetchWith = (limitedCalls: number, retryAfter: string) =>
  Effect.gen(function* () {
    const callCount = yield* Ref.make(0);
    const client = HttpClient.make((request) =>
      Ref.updateAndGet(callCount, (n) => n + 1).pipe(
        Effect.map((n) =>
          HttpClientResponse.fromWeb(
            request,
            new Response("{}", {
              status: n <= limitedCalls ? 429 : 200,
              headers: { "content-type": "application/json", "retry-after": retryAfter },
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
    return { callCount, fiber };
  });

describe("producer-polar rate limiting", () => {
  it.effect("gives up on a persistent 429", () =>
    Effect.gen(function* () {
      const { callCount, fiber } = yield* fetchWith(Infinity, "1");

      yield* TestClock.adjust("1 minute");
      const exit = yield* Fiber.join(fiber);

      expect(exit._tag).toBe("Failure");
      // One request and five retries.
      expect(yield* Ref.get(callCount)).toBe(6);
    }),
  );

  it.effect("waits for a Retry-After longer than the request timeout", () =>
    Effect.gen(function* () {
      const { callCount, fiber } = yield* fetchWith(1, "150");

      yield* TestClock.adjust("149 seconds");
      expect(yield* Ref.get(callCount)).toBe(1);
      yield* TestClock.adjust("1 second");
      expect((yield* Fiber.join(fiber))._tag).toBe("Success");
    }),
  );
});

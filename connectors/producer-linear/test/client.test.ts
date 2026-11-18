import { describe, expect, it } from "@effect/vitest";
import { Array as Arr, Effect, Fiber, Layer, Metric, Option, Redacted, Ref, Schema } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";
import { TestClock } from "effect/testing";

import { LinearClient } from "../src/index";

type FakeResponse = {
  readonly status: number;
  readonly body: unknown;
  readonly headers?: Record<string, string>;
};

const ok = { status: 200, body: { data: { viewer: { id: "user-1" } } } };

/** Repeats the last response when the sequence runs out. */
const queryWith = (responses: Arr.NonEmptyReadonlyArray<FakeResponse>) =>
  Effect.gen(function* () {
    const calls = yield* Ref.make<ReadonlyArray<string>>([]);
    const http = HttpClient.make((request) =>
      Effect.gen(function* () {
        const sent = yield* Ref.updateAndGet(calls, (list) => [
          ...list,
          `${request.method} ${request.url} ${request.headers.authorization ?? ""}`,
        ]);
        const { status, body, headers } = responses[sent.length - 1] ?? Arr.lastNonEmpty(responses);
        return HttpClientResponse.fromWeb(
          request,
          new Response(JSON.stringify(body), {
            status,
            headers: { "content-type": "application/json", ...headers },
          }),
        );
      }),
    );

    const result = yield* Effect.gen(function* () {
      const client = yield* LinearClient.LinearClient;
      return yield* client.find(
        Schema.Struct({ viewer: Schema.Struct({ id: Schema.String }) }),
        "query Viewer { viewer { id } }",
      );
    }).pipe(
      Effect.match({
        onFailure: (error) => error.message,
        onSuccess: Option.match({ onNone: () => "not found", onSome: ({ viewer }) => viewer.id }),
      }),
      Effect.provide(
        LinearClient.layer({ apiKey: Redacted.make("lin_api_test") }).pipe(
          Layer.provide(Layer.succeed(HttpClient.HttpClient)(http)),
        ),
      ),
    );

    return { result, calls: yield* Ref.get(calls) };
  }).pipe(Effect.provideService(Metric.MetricRegistry, new Map()));

const graphqlError = (status: number, message: string, code: string) => ({
  status,
  body: { errors: [{ message, extensions: { code } }], data: null },
});

describe("client", () => {
  it.live("sends the key as it is and retries server errors", () =>
    Effect.gen(function* () {
      expect({
        ok: yield* queryWith([ok]),
        retriedOnce: yield* queryWith([{ status: 503, body: {} }, ok]),
      }).toMatchInlineSnapshot(`
        {
          "ok": {
            "calls": [
              "POST https://api.linear.app/graphql lin_api_test",
            ],
            "result": "user-1",
          },
          "retriedOnce": {
            "calls": [
              "POST https://api.linear.app/graphql lin_api_test",
              "POST https://api.linear.app/graphql lin_api_test",
            ],
            "result": "user-1",
          },
        }
      `);
    }),
  );

  it.effect("waits and tries again when the rate limit is used up", () =>
    Effect.gen(function* () {
      const fiber = yield* Effect.forkChild(
        queryWith([graphqlError(400, "Rate limit exceeded", "RATELIMITED"), ok]),
      );
      yield* TestClock.adjust("1 minute");
      const { result, calls } = yield* Fiber.join(fiber);
      expect({ result, calls: calls.length }).toMatchInlineSnapshot(`
        {
          "calls": 2,
          "result": "user-1",
        }
      `);
    }),
  );

  it.effect("waits for a Retry-After longer than the request timeout", () =>
    Effect.gen(function* () {
      const limited = graphqlError(429, "Rate limit exceeded", "RATELIMITED");
      const fiber = yield* Effect.forkChild(
        queryWith([{ ...limited, headers: { "retry-after": "150" } }, ok]),
      );
      yield* TestClock.adjust("150 seconds");
      const { result, calls } = yield* Fiber.join(fiber);
      expect({ result, calls: calls.length }).toMatchInlineSnapshot(`
        {
          "calls": 2,
          "result": "user-1",
        }
      `);
    }),
  );

  it.effect("fails on GraphQL errors, and finds nothing for a missing entity", () =>
    Effect.gen(function* () {
      expect({
        error: (yield* queryWith([graphqlError(200, "Argument Validation Error", "INVALID_INPUT")]))
          .result,
        badKey: (yield* queryWith([
          graphqlError(401, "Authentication required, not authenticated", "AUTHENTICATION_ERROR"),
        ])).result,
        missing: (yield* queryWith([graphqlError(200, "Entity not found: Comment", "INPUT_ERROR")]))
          .result,
      }).toMatchInlineSnapshot(`
        {
          "badKey": "Linear rejected the API key",
          "error": "Linear API returned 200 for Viewer: Argument Validation Error",
          "missing": "not found",
        }
      `);
    }),
  );
});

import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";

import { TestEngine } from "../src";

describe("EngineContainer", () => {
  it.effect(
    "should start engine container successfully",
    () =>
      Effect.gen(function* () {
        const engine = yield* TestEngine.Instance;
        const uri = yield* engine.uri;
        const icebergRestUri = yield* engine.icebergRestUri;

        expect(uri).toMatch(/^http:\/\/\S+:\d+$/);
        expect(icebergRestUri).toMatch(/^http:\/\/\S+:\d+$/);
      }).pipe(Effect.provide(TestEngine.container), Effect.scoped),
    { timeout: 120_000 },
  );
});

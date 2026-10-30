import { describe, expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { KeyValueStore } from "effect/persistence";

import { layerMemory, StateStore } from "../src/state-store";
import { connectorInstanceKeyPrefix } from "../src/state-store/keys";
import { layerKeyValueStore } from "../src/state-store/layer-key-value-store";

it("keeps the platform connector instance ID visible in the state prefix", () => {
  expect(connectorInstanceKeyPrefix("team-acme-shopify")).toBe(
    "connector-instance:team-acme-shopify:",
  );
});

// A `KeyValueStore` whose every operation fails, so we can assert `StateStore` wraps
// the resulting `KeyValueStoreError` into a `ConnectorError` with useful context.
const layerFailingKeyValue = Layer.succeed(KeyValueStore.KeyValueStore)(
  KeyValueStore.make({
    get: () =>
      Effect.fail(new KeyValueStore.KeyValueStoreError({ method: "get", message: "boom" })),
    getUint8Array: () =>
      Effect.fail(
        new KeyValueStore.KeyValueStoreError({ method: "getUint8Array", message: "boom" }),
      ),
    set: () =>
      Effect.fail(new KeyValueStore.KeyValueStoreError({ method: "set", message: "boom" })),
    remove: () =>
      Effect.fail(new KeyValueStore.KeyValueStoreError({ method: "remove", message: "boom" })),
    clear: Effect.fail(new KeyValueStore.KeyValueStoreError({ method: "clear", message: "boom" })),
    size: Effect.fail(new KeyValueStore.KeyValueStoreError({ method: "size", message: "boom" })),
    keys: Effect.fail(new KeyValueStore.KeyValueStoreError({ method: "keys", message: "boom" })),
  }),
);

describe("state store error handling", () => {
  it.effect("wraps a failing KeyValueStore.get into a ConnectorError with resource context", () =>
    Effect.gen(function* () {
      const error = yield* StateStore.pipe(
        Effect.flatMap((store) => store.getResourceState("products")),
        Effect.flip,
      );

      expect(error.message).toContain("Failed to read state for resource products");
      expect(error.cause).toBeInstanceOf(KeyValueStore.KeyValueStoreError);
    }).pipe(Effect.provide(layerKeyValueStore.pipe(Layer.provide(layerFailingKeyValue)))),
  );

  it.effect("wraps a failing KeyValueStore.set into a ConnectorError with resource context", () =>
    Effect.gen(function* () {
      const error = yield* StateStore.pipe(
        Effect.flatMap((store) =>
          store.setBackfillState("products", { cutoff: "x", completed: true }),
        ),
        Effect.flip,
      );

      expect(error.message).toContain("Failed to write state for resource products");
      expect(error.cause).toBeInstanceOf(KeyValueStore.KeyValueStoreError);
    }).pipe(Effect.provide(layerKeyValueStore.pipe(Layer.provide(layerFailingKeyValue)))),
  );
});

describe("state store state components", () => {
  it.effect("updates checkpoints independently and clears errors by source", () =>
    Effect.gen(function* () {
      const store = yield* StateStore;

      yield* Effect.all(
        [
          store.setBackfillState("products", {
            cutoff: "2026-07-17T00:00:00.000Z",
            pageCursor: "page-2",
            completed: false,
            lastSuccessAt: "2026-07-17T00:01:00.000Z",
          }),
          store.setChangesState("products", {
            cursor: 42,
            lastSuccessAt: "2026-07-17T00:02:00.000Z",
          }),
        ],
        { concurrency: "unbounded" },
      );
      yield* store.setResourceError("products", "changes", "fetch");

      const failed = yield* store.getResourceState("products");
      expect(failed).toMatchObject({
        backfill: {
          pageCursor: "page-2",
          completed: false,
          lastSuccessAt: "2026-07-17T00:01:00.000Z",
        },
        changes: { cursor: 42, lastSuccessAt: "2026-07-17T00:02:00.000Z" },
        lastError: {
          source: "changes",
          operation: "fetch",
          code: "fetch_failed",
          message: "Changes fetch failed",
        },
      });

      yield* store.setBackfillState("products", {
        cutoff: "2026-07-17T00:00:00.000Z",
        completed: true,
      });
      yield* store.clearResourceError("products", "backfill");

      expect(yield* store.getResourceState("products")).toMatchObject({
        lastError: {
          source: "changes",
          operation: "fetch",
          code: "fetch_failed",
          message: "Changes fetch failed",
        },
      });

      yield* store.clearResourceError("products", "changes");

      expect(yield* store.getResourceState("products")).toEqual({
        backfill: {
          cutoff: "2026-07-17T00:00:00.000Z",
          completed: true,
        },
        changes: { cursor: 42, lastSuccessAt: "2026-07-17T00:02:00.000Z" },
      });
      expect(yield* store.getResourceState("orders")).toBeUndefined();
    }).pipe(Effect.provide(layerMemory)),
  );
});

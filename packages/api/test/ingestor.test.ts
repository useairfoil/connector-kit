import { describe, expect, it } from "@effect/vitest";
import {
  Any,
  type FlightData,
  type PutResult,
  PutResult as PutResultMessage,
} from "@useairfoil/flight";
import { tableFromArrays } from "apache-arrow";
import { Effect, Exit, Fiber, Queue, Stream } from "effect";

import { IngestorError } from "../src/ingestor";
import { make } from "../src/ingestor/make";

const encodeMetadata = (requestId: number) =>
  new TextEncoder().encode(JSON.stringify({ request_id: requestId }));

const decodeMetadata = (data: FlightData) => JSON.parse(new TextDecoder().decode(data.appMetadata));

const nextRequest = (iterator: AsyncIterator<FlightData>) =>
  Effect.promise(() => iterator.next()).pipe(
    Effect.flatMap((result) =>
      result.done
        ? Effect.die(new Error("Request stream ended unexpectedly"))
        : Effect.succeed(result.value),
    ),
  );

describe("Ingestor", () => {
  it.effect("sends the schema first and correlates reversed acknowledgements", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const responses = yield* Queue.unbounded<PutResult>();
        let requests: AsyncIterable<FlightData> | undefined;
        const ingestor = yield* make(
          {
            doPut: (input) => {
              requests = input;
              return Stream.toAsyncIterable(Stream.fromQueue(responses));
            },
          },
          { catalog: "catalog", namespace: ["analytics"], table: "events" },
        );
        if (requests === undefined) return yield* Effect.die(new Error("doPut was not started"));

        const iterator = requests[Symbol.asyncIterator]();
        const firstBatch = tableFromArrays({ id: [1] }).batches[0]!;
        const secondBatch = tableFromArrays({ id: [2] }).batches[0]!;

        const firstPush = yield* Effect.forkChild(ingestor.push(firstBatch));
        const schema = yield* nextRequest(iterator);
        const first = yield* nextRequest(iterator);
        const secondPush = yield* Effect.forkChild(ingestor.push(secondBatch));
        const second = yield* nextRequest(iterator);

        expect(decodeMetadata(schema)).toEqual({
          request_id: 0,
          catalog: "catalog",
          namespace: ["analytics"],
          table_name: "events",
        });
        expect(schema.flightDescriptor?.type).toBe(2);
        expect(Any.decode(schema.flightDescriptor!.cmd).typeUrl).toBe("airfoil.v1.Ingest");
        expect(decodeMetadata(first)).toEqual({ request_id: 1 });
        expect(decodeMetadata(second)).toEqual({ request_id: 2 });

        yield* Queue.offer(responses, PutResultMessage.create({ appMetadata: encodeMetadata(2) }));
        expect(Exit.isSuccess(yield* Fiber.await(secondPush))).toBe(true);

        yield* Queue.offer(responses, PutResultMessage.create({ appMetadata: encodeMetadata(1) }));
        expect(Exit.isSuccess(yield* Fiber.await(firstPush))).toBe(true);
      }),
    ),
  );

  it.effect("cancels the call when the scope closes", () =>
    Effect.gen(function* () {
      let signal: AbortSignal | undefined;
      const reading = Promise.withResolvers<void>();
      // Like a gRPC call, the read only ends when the call is cancelled.
      async function* responses(): AsyncGenerator<PutResult> {
        reading.resolve();
        yield await new Promise<PutResult>((_, reject) =>
          signal?.addEventListener("abort", reject),
        );
      }

      yield* Effect.gen(function* () {
        yield* make(
          {
            doPut: (_requests, options) => {
              signal = options?.signal;
              return responses();
            },
          },
          { catalog: "catalog", namespace: [], table: "events" },
        );
        yield* Effect.promise(() => reading.promise);
      }).pipe(Effect.scoped);

      expect(signal?.aborted).toMatchInlineSnapshot(`true`);
    }),
  );

  it.effect("fails a pending push when the response stream fails", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const responses = yield* Queue.unbounded<PutResult, Error>();
        let requests: AsyncIterable<FlightData> | undefined;
        const ingestor = yield* make(
          {
            doPut: (input) => {
              requests = input;
              return Stream.toAsyncIterable(Stream.fromQueue(responses));
            },
          },
          { catalog: "catalog", namespace: [], table: "events" },
        );
        if (requests === undefined) return yield* Effect.die(new Error("doPut was not started"));

        const iterator = requests[Symbol.asyncIterator]();
        const push = yield* Effect.forkChild(
          ingestor.push(tableFromArrays({ id: [1] }).batches[0]!),
        );
        yield* nextRequest(iterator);
        yield* nextRequest(iterator);
        yield* Queue.fail(responses, new Error("connection lost"));

        const error = yield* Effect.flip(Fiber.join(push));
        expect(error).toBeInstanceOf(IngestorError);
      }),
    ),
  );
});

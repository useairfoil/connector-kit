import { expect, it } from "@effect/vitest";
import { tableFromArrays } from "apache-arrow";
import { Effect, Stream } from "effect";

import { decodeFlightDataStream } from "../src/arrow-utils";
import { FlightDataEncoder, FlightDescriptor } from "../src/index";

it.effect("closes the Flight source when the consumer stops early", () =>
  Effect.gen(function* () {
    const table = tableFromArrays({ id: [1, 2] });
    let closed = false;
    async function* source() {
      try {
        yield FlightDataEncoder.encodeSchema(table.schema, {
          flightDescriptor: FlightDescriptor.create(),
        });
        for (let i = 0; i < 2; i++) {
          yield* FlightDataEncoder.encodeBatch(table.batches[0]);
        }
      } finally {
        closed = true;
      }
    }

    const batches = yield* Stream.fromAsyncIterable(
      decodeFlightDataStream(source(), { expectedSchema: table.schema }),
      (cause) => cause,
    ).pipe(Stream.take(1), Stream.runCollect);

    expect(batches).toHaveLength(1);
    expect(batches[0].batch.getChild("id")?.toArray()).toEqual(new Float64Array([1, 2]));
    expect(closed).toBe(true);
  }),
);

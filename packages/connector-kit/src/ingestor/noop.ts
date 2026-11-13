import { Effect, Layer } from "effect";

import { Ingestor } from "./service";

/** Accepts batches without writing them downstream. */
export const layerNoop = Layer.succeed(Ingestor)({
  // Nothing is encoded, so there are no bytes to count.
  ingest: ({ batch }) => Effect.succeed({ rows: batch.rows.length, bytes: 0 }),
});

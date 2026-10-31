import { Effect, Layer } from "effect";

import { Ingestor } from "./service";

/** Logs batches without sending them over Arrow Flight. */
export const layerConsole = Layer.succeed(Ingestor)({
  ingest: ({ resource, source, batch }) =>
    Effect.logInfo(`[ingestor] -> Source: ${source} | Resource: ${resource}`).pipe(
      Effect.annotateLogs({ rows: batch.rows.length, cursor: batch.cursor, source }),
      // Nothing is encoded, so there are no bytes to count.
      Effect.as({ rows: batch.rows.length, bytes: 0 }),
    ),
});

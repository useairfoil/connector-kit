import { Effect, Metric } from "effect";

import type { ResourceBatch } from "../core/types";

import * as Metrics from "../metrics";
import { Attr, EventAttr, EventName, SpanName, addCurrentSpanEvent } from "../telemetry";
import { Ingestor, type IngestSource } from "./service";

export const ingestBatch = Effect.fnUntraced(function* (options: {
  readonly connector?: string;
  readonly resource: string;
  readonly source: IngestSource;
  readonly batch: ResourceBatch;
}) {
  const metricAttributes = Metrics.withResourceAttributes({
    connector: options.connector ?? "unknown",
    resource: options.resource,
    source: options.source,
  });
  const batchOutcome = (outcome: "success" | "error") =>
    Metric.withAttributes(Metrics.batches, {
      ...metricAttributes,
      [Attr.batchOutcome]: outcome,
    });

  const ingestor = yield* Ingestor;

  const ingest = ingestor.ingest(options).pipe(
    Effect.tap(() => Effect.annotateCurrentSpan({ [Attr.ingestionSuccess]: true })),
    Effect.tapError(() =>
      Effect.annotateCurrentSpan({
        [Attr.ingestionSuccess]: false,
        [Attr.errorPhase]: "ingest",
      }),
    ),
  );

  // onError keeps the failure, so the engine still sees it and skips the checkpoint.
  const result = yield* Effect.withSpan(ingest, SpanName.ingest, { kind: "producer" }).pipe(
    Effect.trackDuration(Metric.withAttributes(Metrics.ingestDuration, metricAttributes)),
    Effect.onError(() => Metric.update(batchOutcome("error"), 1)),
  );

  yield* Effect.logInfo("batch ingested").pipe(
    Effect.annotateLogs({
      source: options.source,
      resource: options.resource,
      rows: options.batch.rows.length,
      cursor: options.batch.cursor,
    }),
  );

  yield* Metric.update(batchOutcome("success"), 1);
  yield* Metric.update(
    Metric.withAttributes(Metrics.rowsIngested, metricAttributes),
    options.batch.rows.length,
  );
  yield* Metric.update(
    Metric.withAttributes(Metrics.batchSize, metricAttributes),
    options.batch.rows.length,
  );

  if (options.batch.cursor !== undefined) {
    yield* addCurrentSpanEvent(EventName.batchCheckpoint, {
      [EventAttr.batchCursor]: options.batch.cursor,
    });
  }

  return result;
});

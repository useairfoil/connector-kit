import {
  Any,
  type ArrowFlightClientService,
  FlightDataEncoder,
  FlightDescriptor,
  FlightDescriptor_DescriptorType,
  type PutResult,
  type RecordBatch,
} from "@useairfoil/flight";
import { Deferred, Effect, Queue, Ref, Schema, Scope, Semaphore, Stream } from "effect";

import type { Ingestor, IngestorOptions } from "./service";

import { IngestorError } from "./error";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const Acknowledgement = Schema.Struct({
  request_id: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
});

const encodeJson = (value: unknown, message: string) =>
  Effect.try({
    try: () => textEncoder.encode(JSON.stringify(value)),
    catch: (cause) => new IngestorError({ message, cause }),
  });

const decodeAcknowledgement = (result: PutResult) =>
  Effect.try({
    try: () => JSON.parse(textDecoder.decode(result.appMetadata)),
    catch: (cause) =>
      new IngestorError({ message: "Ingestion acknowledgement was not valid JSON", cause }),
  }).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(Acknowledgement)),
    Effect.mapError((cause) =>
      cause instanceof IngestorError
        ? cause
        : new IngestorError({ message: "Ingestion acknowledgement was malformed", cause }),
    ),
  );

/** Internal constructor used to inject a Flight client in tests. */
export const make = Effect.fnUntraced(function* (
  client: Pick<ArrowFlightClientService, "doPut">,
  options: IngestorOptions,
): Effect.fn.Return<Ingestor, IngestorError, Scope.Scope> {
  const requests = yield* Queue.unbounded<ReturnType<typeof FlightDataEncoder.encodeSchema>>();
  const scope = yield* Scope.Scope;
  yield* Scope.addFinalizer(scope, Queue.shutdown(requests));

  const requestIterable = yield* Stream.toAsyncIterableEffect(Stream.fromQueue(requests));

  const pending = yield* Ref.make(new Map<number, Deferred.Deferred<void, IngestorError>>());
  const nextRequestId = yield* Ref.make(1);
  const schemaSent = yield* Ref.make(false);
  const terminalError = yield* Ref.make<IngestorError | undefined>(undefined);
  // Keeps the first schema and request registration ordered across concurrent pushes.
  const lock = yield* Semaphore.make(1);

  const failPending = (error: IngestorError) =>
    lock.withPermit(
      Effect.gen(function* () {
        yield* Ref.set(terminalError, error);
        const deferreds = yield* Ref.getAndSet(pending, new Map());
        yield* Effect.forEach(deferreds.values(), (deferred) => Deferred.fail(deferred, error), {
          discard: true,
        });
      }),
    );

  const acknowledge = Effect.fnUntraced(function* (result: PutResult) {
    const { request_id: requestId } = yield* decodeAcknowledgement(result);
    if (requestId === 0) return;

    const deferred = yield* Ref.modify(pending, (current) => {
      const found = current.get(requestId);
      if (found === undefined) return [undefined, current] as const;

      const updated = new Map(current);
      updated.delete(requestId);
      return [found, updated] as const;
    });

    if (deferred !== undefined) yield* Deferred.succeed(deferred, undefined);
  });

  const controller = new AbortController();
  const responseIterable = yield* Effect.try({
    try: () => client.doPut(requestIterable, { signal: controller.signal }),
    catch: (cause) => new IngestorError({ message: "Failed to start ingestion stream", cause }),
  });

  const consumeResponses = Stream.fromAsyncIterable(
    responseIterable,
    (cause) => new IngestorError({ message: "Ingestion response stream failed", cause }),
  ).pipe(Stream.runForEach(acknowledge));

  yield* Effect.forkScoped(
    consumeResponses.pipe(
      Effect.matchEffect({
        onFailure: failPending,
        onSuccess: () =>
          failPending(
            new IngestorError({ message: "Ingestion response stream ended prematurely" }),
          ),
      }),
    ),
  );
  // Finalizers run in reverse, so this cancels the call before the reader stops.
  // Stopping the reader waits for its pending read, which only ends with the call.
  yield* Scope.addFinalizer(
    scope,
    Effect.sync(() => controller.abort()),
  );

  const push = Effect.fnUntraced(function* (batch: RecordBatch) {
    const deferred = yield* lock.withPermit(
      Effect.gen(function* () {
        const terminal = yield* Ref.get(terminalError);
        if (terminal !== undefined) return yield* Effect.fail(terminal);

        if (!(yield* Ref.get(schemaSent))) {
          const appMetadata = yield* encodeJson(
            {
              request_id: 0,
              catalog: options.catalog,
              namespace: options.namespace,
              table_name: options.table,
            },
            "Failed to encode ingestion schema metadata",
          );
          const descriptor = FlightDescriptor.create({
            type: FlightDescriptor_DescriptorType.CMD,
            cmd: Any.encode(
              Any.create({ typeUrl: "airfoil.v1.Ingest", value: new Uint8Array() }),
            ).finish(),
          });
          const schema = yield* Effect.try({
            try: () =>
              FlightDataEncoder.encodeSchema(batch.schema, {
                flightDescriptor: descriptor,
                appMetadata,
              }),
            catch: (cause) =>
              new IngestorError({ message: "Failed to encode ingestion schema", cause }),
          });
          yield* Queue.offer(requests, schema);
          yield* Ref.set(schemaSent, true);
        }

        const requestId = yield* Ref.getAndUpdate(nextRequestId, (current) => current + 1);
        const appMetadata = yield* encodeJson(
          { request_id: requestId },
          "Failed to encode ingestion batch metadata",
        );
        const messages = yield* Effect.try({
          try: () =>
            FlightDataEncoder.encodeBatch(batch, {
              appMetadata: () => appMetadata,
            }),
          catch: (cause) =>
            new IngestorError({ message: "Failed to encode ingestion batch", cause }),
        });
        const acknowledgement = yield* Deferred.make<void, IngestorError>();
        yield* Ref.update(pending, (current) => new Map(current).set(requestId, acknowledgement));
        yield* Effect.forEach(messages, (message) => Queue.offer(requests, message), {
          discard: true,
        });
        return acknowledgement;
      }),
    );

    yield* Deferred.await(deferred);
  });

  return { push };
});

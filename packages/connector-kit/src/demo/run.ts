import { Faker, base, en } from "@faker-js/faker";
import { Array as Arr, Effect, Option, Schema, Stream } from "effect";
import humanFormat from "human-format";

import type { DemoDefinition, DemoTable } from "./definition";

import { ConnectorError } from "../errors";
import { ingestBatch } from "../ingestor/instrumented";
import { Ingestor, type IngestResult } from "../ingestor/service";
import { compileRow, type DemoContext } from "./generate";

export type RunOptions = {
  /** Stop once this many Arrow bytes are written. */
  readonly bytes: number;
  /** Omit for random data on each run. */
  readonly seed?: number;
  /** The time data is made around. Same seed, time and tables give the same rows. */
  readonly now: Date;
  /** Maximum rows per ingestion batch. Defaults to 500. Must be a positive integer. */
  readonly batchSize?: number;
  /** Groups per chunk. Overrides the demo's. */
  readonly groupsPerChunk?: number;
};

export type DemoTotals = IngestResult & {
  readonly tables: Readonly<Record<string, IngestResult>>;
};

const empty: DemoTotals = { rows: 0, bytes: 0, tables: {} };

const sum = (results: ReadonlyArray<IngestResult>): IngestResult => ({
  rows: results.reduce((total, result) => total + result.rows, 0),
  bytes: results.reduce((total, result) => total + result.bytes, 0),
});

const add = (totals: DemoTotals, written: ReadonlyArray<readonly [string, IngestResult]>) =>
  written.reduce<DemoTotals>(
    (current, [name, result]) => ({
      rows: current.rows + result.rows,
      bytes: current.bytes + result.bytes,
      tables: {
        ...current.tables,
        [name]: {
          rows: (current.tables[name]?.rows ?? 0) + result.rows,
          bytes: (current.tables[name]?.bytes ?? 0) + result.bytes,
        },
      },
    }),
    totals,
  );

/**
 * Writes the setup rows, then groups, until it reaches the size or the demo's
 * count. It can go over the size by one chunk. Only bound tables are
 * written; keys still point to the others.
 */
export const run = Effect.fnUntraced(function* (demo: DemoDefinition, options: RunOptions) {
  const ingestor = yield* Ingestor;
  // Wide rows may need a lower batch size to fit the engine's limits.
  const batchSize = yield* Schema.decodeUnknownEffect(Schema.Int.check(Schema.isGreaterThan(0)))(
    options.batchSize ?? 500,
  ).pipe(
    Effect.mapError((cause) => new ConnectorError({ message: "Invalid demo batch size", cause })),
  );

  const bound = (table: DemoTable) =>
    ingestor.resourceNames === undefined || ingestor.resourceNames.includes(table.name);

  // A fresh Faker per run keeps explicit seeds repeatable.
  const faker = new Faker({ locale: [en, base] });
  faker.seed(options.seed);
  const context: DemoContext = { faker, now: options.now };

  const prepare = (tables: ReadonlyArray<DemoTable>) =>
    Effect.forEach(tables.filter(bound), (table) =>
      compileRow(table.rowSchema).pipe(
        Effect.map((fill) => ({
          table,
          fill,
          decode: Schema.decodeUnknownEffect(Schema.toType(table.rowSchema)),
        })),
      ),
    );

  const write = (
    tables: Effect.Success<ReturnType<typeof prepare>>,
    rowsOf: (name: string) => ReadonlyArray<object>,
  ) =>
    Effect.gen(function* () {
      // Fill rows in table order before concurrent writes, keeping Faker deterministic.
      const prepared = yield* Effect.forEach(tables, ({ table, fill, decode }) =>
        Effect.forEach(rowsOf(table.name), (row) =>
          decode(fill(context, row)).pipe(
            Effect.mapError(
              (cause) =>
                new ConnectorError({ message: `Invalid demo row for ${table.name}`, cause }),
            ),
          ),
        ).pipe(Effect.map((rows) => ({ table, rows }))),
      );

      // Share durable flushes with bounded parallel writes.
      return yield* Effect.forEach(
        prepared,
        ({ table, rows }) =>
          Effect.forEach(
            Arr.chunksOf(rows, batchSize),
            (rows) =>
              ingestBatch({
                connector: demo.name,
                resource: table.name,
                source: "demo",
                batch: { rows },
              }),
            { concurrency: 8 },
          ).pipe(Effect.map((results) => [table.name, sum(results)] as const)),
        { concurrency: 4 },
      );
    });

  const setupTables = yield* prepare(demo.setup.tables);
  const groupTables = yield* prepare(demo.group.tables);

  const setup = demo.setup.rows(context);
  const afterSetup = add(empty, yield* write(setupTables, (name) => setup[name] ?? []));

  const totals =
    afterSetup.bytes >= options.bytes || groupTables.length === 0
      ? afterSetup
      : yield* Stream.range(0, (demo.group.count ?? Infinity) - 1).pipe(
          Stream.grouped(options.groupsPerChunk ?? demo.group.groupsPerChunk ?? 1000),
          Stream.mapEffect((indexes) => {
            const groups = indexes.map((index) => demo.group.rows(index, context));
            return write(groupTables, (name) => groups.flatMap((group) => group[name] ?? []));
          }),
          Stream.scan(() => afterSetup, add),
          Stream.takeUntil((current) => current.bytes >= options.bytes),
          Stream.tap((current) =>
            Effect.logInfo("demo progress").pipe(
              Effect.annotateLogs({ rows: current.rows, size: humanFormat.bytes(current.bytes) }),
            ),
          ),
          Stream.runLast,
          Effect.map(Option.getOrElse(() => afterSetup)),
        );

  if (totals.bytes < options.bytes) {
    yield* Effect.logWarning(
      "The selected tables ran out of rows, so the run wrote less than the size asked for",
    ).pipe(
      Effect.annotateLogs({
        size: humanFormat.bytes(totals.bytes),
        target: humanFormat.bytes(options.bytes),
      }),
    );
  }

  yield* Effect.logInfo("demo done").pipe(
    Effect.annotateLogs({
      rows: totals.rows,
      size: humanFormat.bytes(totals.bytes),
      tables: Object.fromEntries(
        Object.entries(totals.tables).map(([name, result]) => [
          name,
          { rows: result.rows, size: humanFormat.bytes(result.bytes) },
        ]),
      ),
    }),
  );

  return totals;
});

import { describe, expect, it } from "@effect/vitest";
import { Faker, base, en } from "@faker-js/faker";
import { Effect, Layer, Option, Ref, Schema } from "effect";

import { parseSize } from "../src/connector-app/demo";
import * as Demo from "../src/demo";
import { compileRow } from "../src/demo/generate";
import * as Iceberg from "../src/iceberg";
import { compileTable } from "../src/iceberg/table";
import { makeRowEncoder } from "../src/ingestor/arrow";
import { Ingestor, type IngestOptions } from "../src/ingestor/service";

const now = new Date("2026-10-01T00:00:00.000Z");

const contextOf = (seed: number): Demo.DemoContext => {
  const faker = new Faker({ locale: [en, base] });
  faker.seed(seed);

  return { faker, now };
};

const Row = Schema.Struct({
  id: Schema.String,
  version: Schema.Date,
  state: Schema.Literals(["open", "closed"]),
  count: Schema.Int,
  score: Schema.Finite,
  total: Schema.BigInt,
  note: Schema.NullOr(Schema.String),
  extra: Schema.optional(Schema.Boolean),
  details: Schema.Struct({
    tags: Schema.Array(Schema.String),
    labels: Schema.ReadonlyMap(Schema.String, Schema.Int),
  }),
  _deleted: Schema.optional(Schema.Boolean),
}).pipe(Iceberg.identifier("id"));

describe("demo rows", () => {
  it.effect("fill rows the row schema and the Arrow encoder accept", () =>
    Effect.gen(function* () {
      const fill = yield* compileRow(Row);
      const { schema } = yield* compileTable(Row);
      const encode = yield* makeRowEncoder(schema, "version");
      const context = contextOf(1);
      const rows = Array.from({ length: 200 }, (_, index) => fill(context, { id: `row_${index}` }));

      const decoded = yield* Effect.forEach(rows, (row) =>
        Schema.decodeUnknownEffect(Schema.toType(Row))(row),
      );

      const batch = yield* encode(decoded);
      expect(batch.numRows).toBe(200);
      expect(rows.some((row) => "_deleted" in row)).toBe(false);
    }),
  );

  it.effect("keep the row's own values and leave optional fields out", () =>
    Effect.gen(function* () {
      const fill = yield* compileRow(Row);
      const row = fill(contextOf(1), { id: "row_1", note: null, state: "closed" });
      expect([row.id, row.note, row.state]).toEqual(["row_1", null, "closed"]);
      expect(["extra", "_deleted"].filter((name) => name in row)).toEqual([]);
    }),
  );

  it.effect("repeat with the same seed and time", () =>
    Effect.gen(function* () {
      const fill = yield* compileRow(Row);
      expect(fill(contextOf(7), {})).toEqual(fill(contextOf(7), {}));

      expect(fill(contextOf(7), {})).toMatchInlineSnapshot(`
        {
          "count": 679,
          "details": {
            "labels": Map {
              "over hmph" => 472,
              "brr secrecy warped" => 40,
            },
            "tags": [
              "inspection",
              "genuine",
              "mmm bah",
            ],
          },
          "id": "bleak",
          "note": "eek",
          "score": 803.74,
          "state": "open",
          "total": 38094n,
          "version": 2025-04-14T23:03:03.353Z,
        }
      `);
    }),
  );

  it.effect("fail on a schema they can't fill, with its path", () =>
    Effect.gen(function* () {
      const error = yield* compileRow(
        Schema.Struct({ value: Schema.Union([Schema.String, Schema.Int]) }),
      ).pipe(Effect.flip);

      expect(error.message).toMatchInlineSnapshot(
        `"$.value: a union of several types is not supported in demo data"`,
      );
    }),
  );
});

describe("demo sizes", () => {
  it("parse binary units", () => {
    expect([parseSize("512KiB"), parseSize("128MiB"), parseSize("1GiB")]).toEqual([
      Option.some(512 * 1024),
      Option.some(128 * 1024 ** 2),
      Option.some(1024 ** 3),
    ]);

    expect([parseSize("0MiB"), parseSize("1MB"), parseSize("1.5GiB")]).toEqual([
      Option.none(),
      Option.none(),
      Option.none(),
    ]);
    expect(parseSize(`${Number.MAX_SAFE_INTEGER}GiB`)).toEqual(Option.none());
  });
});

const Plan = Schema.Struct({
  id: Schema.String,
  version: Schema.Date,
}).pipe(Iceberg.identifier("id"));

const Account = Schema.Struct({
  id: Schema.String,
  version: Schema.Date,
  plan: Schema.NonEmptyString,
}).pipe(Iceberg.identifier("id"));

const plans = Demo.table({ name: "plans", rowSchema: Plan, version: "version" });
const accounts = Demo.table({ name: "accounts", rowSchema: Account, version: "version" });
const events = Demo.table({ name: "events", rowSchema: Plan, version: "version" });

const demo = Demo.define({
  name: "test",
  setup: {
    tables: [plans],
    rows: () => ({ plans: [{ id: "plan_0" }] }),
  },
  group: {
    tables: [accounts, events],
    rows: (index) => ({
      accounts: [{ id: `acct_${index}`, plan: "plan_0" }],
      // Only later groups have events, so early chunks can be empty.
      events: index >= 4 ? [{ id: `evt_${index}` }] : [],
    }),
  },
});

// Every row counts as 100 bytes.
const recordingIngestor = (resourceNames?: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const written = yield* Ref.make<ReadonlyArray<IngestOptions>>([]);

    const layer = Layer.succeed(Ingestor)({
      resourceNames,
      ingest: (options) =>
        Ref.update(written, (all) => [...all, options]).pipe(
          Effect.as({ rows: options.batch.rows.length, bytes: options.batch.rows.length * 100 }),
        ),
    });

    return { written, layer };
  });

const runWith = (
  options: { readonly bytes: number; readonly resourceNames?: ReadonlyArray<string> },
  selected: Demo.DemoDefinition = demo,
) =>
  Effect.gen(function* () {
    const { written, layer } = yield* recordingIngestor(options.resourceNames);

    const totals = yield* Demo.run(selected, {
      bytes: options.bytes,
      seed: 1,
      now,
      groupsPerChunk: 2,
    }).pipe(Effect.provide(layer));

    const batches = (yield* Ref.get(written)).map(
      ({ resource, source, batch }) => `${source} ${resource} ${batch.rows.length}`,
    );

    return { totals, batches };
  });

describe("demo run", () => {
  it.effect("writes setup rows first, then chunks until the size", () =>
    Effect.gen(function* () {
      // Setup is 100 bytes, then chunks of 2 groups add 200, 200 and 400.
      const { totals, batches } = yield* runWith({ bytes: 700 });
      expect(totals.bytes).toBe(900);

      expect(batches).toMatchInlineSnapshot(`
        [
          "demo plans 1",
          "demo accounts 2",
          "demo accounts 2",
          "demo accounts 2",
          "demo events 2",
        ]
      `);
    }),
  );

  it.effect("stops after setup rows when they reach the size", () =>
    Effect.gen(function* () {
      const { totals, batches } = yield* runWith({ bytes: 100 });
      expect(totals.bytes).toBe(100);
      expect(batches).toEqual(["demo plans 1"]);
    }),
  );

  it.effect("writes setup tables once when no group table is bound", () =>
    Effect.gen(function* () {
      const { totals, batches } = yield* runWith({ bytes: 1024 ** 2, resourceNames: ["plans"] });
      expect(totals.bytes).toBe(100);
      expect(batches).toEqual(["demo plans 1"]);
    }),
  );

  it.effect("keeps going past chunks with no rows for the bound tables", () =>
    Effect.gen(function* () {
      const { totals, batches } = yield* runWith({ bytes: 300, resourceNames: ["events"] });
      expect(totals.bytes).toBe(400);

      expect(batches).toMatchInlineSnapshot(`
        [
          "demo events 2",
          "demo events 2",
        ]
      `);
    }),
  );

  it.effect("stops after the last group when the demo has a count", () =>
    Effect.gen(function* () {
      const limited = Demo.define({ ...demo, group: { ...demo.group, count: 3 } });
      const { totals, batches } = yield* runWith({ bytes: 1024 ** 2 }, limited);
      expect(totals.bytes).toBe(400);
      expect(batches).toEqual(["demo plans 1", "demo accounts 2", "demo accounts 1"]);
    }),
  );

  it.effect("splits big tables into batches of 500 rows", () =>
    Effect.gen(function* () {
      const big = Demo.define({
        ...demo,
        setup: {
          tables: [plans],
          rows: () => ({ plans: Array.from({ length: 1200 }, (_, n) => ({ id: `plan_${n}` })) }),
        },
      });

      const { batches } = yield* runWith({ bytes: 1, resourceNames: ["plans"] }, big);
      expect(batches).toEqual(["demo plans 500", "demo plans 500", "demo plans 200"]);
    }),
  );

  it.effect("fails when a demo row breaks the row schema", () =>
    Effect.gen(function* () {
      const broken = Demo.define({
        ...demo,
        group: {
          tables: [accounts],
          rows: () => ({ accounts: [{ id: "acct", plan: "" }] }),
        },
      });

      const error = yield* runWith({ bytes: 1000 }, broken).pipe(Effect.flip);
      expect(error.message).toBe("Invalid demo row for accounts");
    }),
  );
});

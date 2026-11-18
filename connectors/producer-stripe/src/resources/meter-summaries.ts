import { ConnectorError, Cursor, Fetch, Resource } from "@useairfoil/connector-kit";
import { DateTime, Duration, Effect, Option, Schema } from "effect";

import type { StripeClientService } from "../client/client";

import { MeterSummaryObjectSchema, MeterSummarySchema } from "../schemas/meter-summaries";
import { startingAfter } from "./shared";

// Only subscriptions bill usage, so summaries are read for their metered items.
const SubscriptionSchema = Schema.Struct({
  id: Schema.String,
  customer: Schema.String,
  created: Schema.Int,
  ended_at: Schema.NullOr(Schema.Int),
  items: Schema.Struct({
    data: Schema.Array(
      Schema.Struct({
        price: Schema.Struct({
          recurring: Schema.NullOr(
            Schema.Struct({ meter: Schema.optional(Schema.NullOr(Schema.String)) }),
          ),
        }),
      }),
    ),
  }),
});
const Subscription = Schema.Struct({
  id: Schema.String,
  customer: Schema.String,
  created: Schema.Int,
  ended: Schema.NullOr(Schema.Int),
  meters: Schema.Array(Schema.String),
});
const Position = Schema.Struct({
  subscription: Schema.optional(Subscription),
  subscriptionAfter: Schema.optional(Schema.String),
  meter: Schema.optional(Schema.Int),
  from: Schema.optional(Schema.Int),
  after: Schema.optional(Schema.String),
});
const PageCursor = Schema.fromJsonString(Position);
const ChangesCursor = Schema.fromJsonString(
  Schema.Struct({
    through: Schema.Int,
    pending: Schema.optional(Schema.Struct({ through: Schema.Int, position: Position })),
  }),
);

const decodeCursor = <A>(schema: Schema.Decoder<A>, cursor: string) =>
  Schema.decodeUnknownEffect(schema)(cursor).pipe(
    Effect.mapError(
      (cause) => new ConnectorError({ message: "Invalid Stripe meter summary cursor", cause }),
    ),
  );

const day = 86_400;
const window = 30 * day;
// Stripe accepts meter events up to 35 days old, so changes read the last 36 days again.
const lateUsage = 36 * day;
const startOfDay = (seconds: number) => Math.floor(seconds / day) * day;
const dayOf = (time: string) =>
  startOfDay(Math.floor(DateTime.toEpochMillis(DateTime.makeUnsafe(time)) / 1000));

export const makeMeterSummaries = (client: StripeClientService) => {
  const readSubscription = (cutoff: number, after?: string) =>
    client
      .list(SubscriptionSchema, "subscriptions", [
        ["limit", "1"],
        ["status", "all"],
        ["created[lte]", String(cutoff)],
        ...startingAfter(Option.fromNullishOr(after)),
      ])
      .pipe(
        Effect.map(
          ({ items }) =>
            items.map(({ id, customer, created, ended_at, items }) => ({
              id,
              customer,
              created,
              ended: ended_at,
              meters: [...new Set(items.data.flatMap(({ price }) => price.recurring?.meter ?? []))],
            }))[0],
        ),
      );
  const readSummaries = (
    meter: string,
    customer: string,
    from: number,
    through: number,
    limit: number,
    after?: string,
  ) =>
    client.list(MeterSummaryObjectSchema, `billing/meters/${meter}/event_summaries`, [
      ["customer", customer],
      ["start_time", String(from)],
      ["end_time", String(through)],
      ["value_grouping_window", "day"],
      ["limit", String(limit)],
      ...startingAfter(Option.fromNullishOr(after)),
    ]);

  const readPage = (state: typeof Position.Type, through: number, fromDay: number) =>
    Effect.gen(function* () {
      const subscription =
        state.subscription ?? (yield* readSubscription(through, state.subscriptionAfter));
      if (!subscription) return { rows: [] };
      const index = state.meter ?? 0;
      const meter = subscription.meters[index];
      const nextMeter =
        index + 1 < subscription.meters.length
          ? { subscription, meter: index + 1 }
          : { subscriptionAfter: subscription.id };
      if (meter === undefined) return { rows: [], next: nextMeter };

      // Ended subscriptions get no new usage.
      const until =
        subscription.ended === null
          ? through
          : Math.min(through, startOfDay(subscription.ended) + day);
      const from = state.from ?? Math.max(fromDay, startOfDay(subscription.created));
      if (from >= until) return { rows: [], next: nextMeter };
      const end = Math.min(from + window, until);
      const page = yield* readSummaries(meter, subscription.customer, from, end, 100, state.after);
      const after = page.items.at(-1)?.id;
      const next = page.hasMore
        ? { subscription, meter: index, from, after }
        : end < until
          ? { subscription, meter: index, from: end }
          : nextMeter;
      return {
        rows: page.items.map((item) => ({
          ...item,
          key: `${meter}:${subscription.customer}:${item.id}`,
          customer: subscription.customer,
          version: page.fetchedAt,
        })),
        next,
      };
    });

  return Resource.entity({
    name: "meter_summaries",
    rowSchema: MeterSummarySchema,
    version: "version",
    check: Effect.gen(function* () {
      const through = startOfDay(Math.floor(DateTime.toEpochMillis(yield* DateTime.now) / 1000));
      const subscription = yield* readSubscription(through);
      const meter = subscription?.meters[0];
      if (subscription && meter) {
        yield* readSummaries(meter, subscription.customer, through - day, through, 1);
      }
    }),
    backfill: Fetch.page({
      cutoff: Cursor.isoDateTime(),
      pageCursor: Cursor.string(),
      fetch: ({ cutoff, pageCursor }) =>
        Effect.gen(function* () {
          const through = dayOf(String(cutoff));
          const state =
            typeof pageCursor === "string" ? yield* decodeCursor(PageCursor, pageCursor) : {};
          const { rows, next } = yield* readPage(state, through, 0);
          return {
            rows,
            hasMore: next !== undefined,
            nextPageCursor: next && Schema.encodeSync(PageCursor)(next),
          };
        }),
    }),
    changes: Fetch.changes({
      cursor: Cursor.string(),
      interval: Duration.hours(1),
      fetch: ({ cursor }) =>
        Effect.gen(function* () {
          const value = String(cursor);
          const state: typeof ChangesCursor.Type = value.startsWith("{")
            ? yield* decodeCursor(ChangesCursor, value)
            : { through: dayOf(value) };
          const now = DateTime.toEpochMillis(yield* DateTime.now);
          const through = state.pending?.through ?? startOfDay(now / 1000);
          if (!state.pending && through <= state.through) {
            return { rows: [], cursor: value, hasMore: false };
          }
          const { rows, next } = yield* readPage(
            state.pending?.position ?? {},
            through,
            state.through - lateUsage,
          );
          return {
            rows,
            hasMore: next !== undefined,
            cursor: Schema.encodeSync(ChangesCursor)(
              next
                ? {
                    through: state.through,
                    pending: { through, position: next },
                  }
                : { through },
            ),
          };
        }),
    }),
  });
};

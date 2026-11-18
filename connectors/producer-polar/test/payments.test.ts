import { expect, it } from "@effect/vitest";
import { ConnectorError } from "@useairfoil/connector-kit";
import { ConfigProvider, Effect, Schema } from "effect";
import { TestClock } from "effect/testing";

import type { PolarApiClientService } from "../src/api";

import { PolarApiClient, PolarConnector } from "../src/index";

it.effect("rechecks a pending payment outside the new-payment window", () =>
  Effect.gen(function* () {
    const cutoff = "2026-10-03T11:00:00.000Z";
    yield* TestClock.setTime(Date.parse(cutoff));
    const pending = {
      id: "pay1",
      created_at: "2026-10-01T11:00:00.000Z",
      modified_at: null,
      amount: 1500,
      currency: "usd",
      status: "pending",
      processor: "stripe",
      method: "card",
      trigger: "purchase",
      decline_reason: null,
      decline_message: null,
      organization_id: "org1",
      order_id: "order1",
      checkout_id: "checkout1",
    };
    const resolved = { ...pending, status: "succeeded", modified_at: cutoff };
    const requests: string[] = [];
    const decode = <A>(schema: Schema.Decoder<A>, fixture: unknown) =>
      Schema.decodeUnknownEffect(schema)(fixture).pipe(
        Effect.mapError(
          (cause) => new ConnectorError({ message: "Invalid payment fixture", cause }),
        ),
      );
    const api: PolarApiClientService = {
      fetchList: (schema) =>
        decode(schema, pending).pipe(
          Effect.map((row) => ({ items: [row], pagination: { total_count: 1, max_page: 1 } })),
        ),
      fetchJson: (schema, path) =>
        Effect.sync(() => requests.push(path)).pipe(Effect.andThen(decode(schema, resolved))),
    };
    const connector = yield* PolarConnector.PolarConfigDef.config.pipe(
      Effect.flatMap(PolarConnector.make),
      Effect.provideService(PolarApiClient.PolarApiClient, api),
      Effect.provide(
        ConfigProvider.layer(
          ConfigProvider.fromUnknown({
            POLAR_ACCESS_TOKEN: "test",
            POLAR_API_BASE_URL: "https://sandbox-api.polar.sh/v1/",
            POLAR_WEBHOOK_SECRET: "secret",
          }),
        ),
      ),
    );
    const changes = connector.resources.find(({ name }) => name === "payments")?.changes;
    if (!changes) return yield* new ConnectorError({ message: "Missing payment changes" });
    const seed = yield* changes.fetch({ cursor: cutoff });
    yield* TestClock.setTime(Date.parse(cutoff) + 600_000);
    const updated = yield* changes.fetch({ cursor: seed.cursor });

    expect(updated.rows).toMatchObject([
      { id: pending.id, status: "succeeded", order_id: "order1", version: new Date(cutoff) },
    ]);
    expect(requests).toEqual(["payments/pay1"]);
  }),
);

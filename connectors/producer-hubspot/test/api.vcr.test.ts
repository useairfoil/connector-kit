import { NodeServices } from "@effect/platform-node";
import { describe, expect, it } from "@effect/vitest";
import { ConnectorApp } from "@useairfoil/connector-kit";
import { FileSystemCassetteStore, VcrHttpClient } from "@useairfoil/effect-vcr";
import { ConfigProvider, Effect, Layer, Option } from "effect";
import { FetchHttpClient } from "effect/http";
import { existsSync } from "node:fs";

import { HubSpotConnector, manifest } from "../src/index";

// Recording needs a test account. Skip until there is a cassette or a token.
const canRun =
  existsSync(new URL("./__cassettes__/api.vcr.test.cassette", import.meta.url)) ||
  process.env.HUBSPOT_ACCESS_TOKEN !== undefined;

const configLayer = ConfigProvider.layer(
  ConfigProvider.fromEnv().pipe(
    ConfigProvider.orElse(ConfigProvider.fromUnknown({ HUBSPOT_ACCESS_TOKEN: "pat-replay" })),
  ),
);

const connectorLayer = HubSpotConnector.layerConfig(HubSpotConnector.HubSpotConfigDef.config).pipe(
  Layer.provide(
    VcrHttpClient.layer({
      vcrName: "producer-hubspot",
      // The `Authorization` header is redacted by default. Owner and user
      // details belong to a real HubSpot user, who also attends the test meetings.
      redact: {
        responseHeaders: ["set-cookie"],
        responseBodyReplacements: {
          firstName: "Jo",
          lastName: "Owner",
          email: "owner@example.com",
          hs_all_attendee_emails: "ada@acme.example.com;owner@example.com",
          hs_email: "owner@example.com",
          hs_given_name: "Jo",
          hs_family_name: "Owner",
        },
      },
    }).pipe(
      Layer.provide(FileSystemCassetteStore.layer()),
      Layer.provide(Layer.merge(NodeServices.layer, FetchHttpClient.layer)),
    ),
  ),
  Layer.provide(configLayer),
);

const cutoff = "2026-10-12T00:00:00.000Z";

// Every pass is already running, so each request is the same on replay.
const crmCursor = JSON.stringify({
  recent: { from: "2026-10-11T21:00:00.000Z", until: "2026-10-11T22:00:00.000Z" },
  archive: { last: "2026-10-11T00:00:00.000Z", startedAt: cutoff },
  refresh: { last: "2026-10-11T00:00:00.000Z", startedAt: cutoff },
});

// Custom object types start from the CRM cursor on their first run.
const customObjectsCursor = JSON.stringify({ types: {}, initial: crmCursor });

const recordedResources = manifest.resources.filter(
  ({ name }) =>
    ![
      "commerce_links",
      "peer_links",
      "segment_memberships",
      "marketing_events",
      "marketing_event_participation",
      "deal_property_history",

      "projects",
      "appointments",
      "courses",
      "listings",
      "services",
    ].includes(name),
);

describe.skipIf(!canRun)("HubSpot API (vcr)", () => {
  // Live clock: the rate limiter waits on it, so recording takes minutes.
  it.live(
    "checks, backfills, and reads changes for every resource",
    () =>
      Effect.gen(function* () {
        const check = yield* ConnectorApp.check(HubSpotConnector.HubSpotConnector, connectorLayer, {
          resources: recordedResources.map((resource) => resource.name),
        });
        const connector = yield* HubSpotConnector.HubSpotConnector.pipe(
          Effect.provide(connectorLayer),
        );

        const results: Record<string, unknown> = {};
        for (const resource of connector.resources.filter(({ name }) =>
          recordedResources.some((resource) => resource.name === name),
        )) {
          const backfill = yield* Effect.fromOption(Option.fromNullishOr(resource.backfill));
          const changes = yield* Effect.fromOption(Option.fromNullishOr(resource.changes));

          let rows = 0;
          let pageCursor: string | undefined;
          for (;;) {
            const page = yield* backfill.fetch({ cutoff, ...(pageCursor ? { pageCursor } : {}) });
            rows += page.rows.length;
            if (!page.hasMore) break;
            pageCursor = String(page.nextPageCursor);
          }
          const changed = yield* changes.fetch({
            cursor: resource.name === "custom_objects" ? customObjectsCursor : crmCursor,
          });
          const deletes = changed.rows.filter((row) => row._deleted === true).length;

          results[resource.name] = {
            backfillRows: rows,
            changedRows: changed.rows.length - deletes,
            deletes,
          };
        }

        expect({ check, results }).toMatchInlineSnapshot(`
          {
            "check": {
              "calls": {
                "_tag": "ok",
              },
              "carts": {
                "_tag": "ok",
              },
              "commerce_payments": {
                "_tag": "ok",
              },
              "communications": {
                "_tag": "ok",
              },
              "companies": {
                "_tag": "ok",
              },
              "contacts": {
                "_tag": "ok",
              },
              "custom_objects": {
                "_tag": "ok",
              },
              "deal_split": {
                "_tag": "ok",
              },
              "deals": {
                "_tag": "ok",
              },
              "discounts": {
                "_tag": "ok",
              },
              "emails": {
                "_tag": "ok",
              },
              "feedback_submissions": {
                "_tag": "ok",
              },
              "fees": {
                "_tag": "ok",
              },
              "goal_targets": {
                "_tag": "ok",
              },
              "invoices": {
                "_tag": "ok",
              },
              "leads": {
                "_tag": "ok",
              },
              "line_items": {
                "_tag": "ok",
              },
              "lists": {
                "_tag": "ok",
              },
              "meetings": {
                "_tag": "ok",
              },
              "notes": {
                "_tag": "ok",
              },
              "orders": {
                "_tag": "ok",
              },
              "owners": {
                "_tag": "ok",
              },
              "pipelines": {
                "_tag": "ok",
              },
              "postal_mail": {
                "_tag": "ok",
              },
              "products": {
                "_tag": "ok",
              },
              "properties": {
                "_tag": "ok",
              },
              "quotes": {
                "_tag": "ok",
              },
              "subscriptions": {
                "_tag": "ok",
              },
              "tasks": {
                "_tag": "ok",
              },
              "taxes": {
                "_tag": "ok",
              },
              "teams": {
                "_tag": "ok",
              },
              "tickets": {
                "_tag": "ok",
              },
              "users": {
                "_tag": "ok",
              },
            },
            "results": {
              "calls": {
                "backfillRows": 3,
                "changedRows": 3,
                "deletes": 0,
              },
              "carts": {
                "backfillRows": 1,
                "changedRows": 1,
                "deletes": 0,
              },
              "commerce_payments": {
                "backfillRows": 0,
                "changedRows": 0,
                "deletes": 0,
              },
              "communications": {
                "backfillRows": 1,
                "changedRows": 1,
                "deletes": 0,
              },
              "companies": {
                "backfillRows": 3,
                "changedRows": 3,
                "deletes": 0,
              },
              "contacts": {
                "backfillRows": 6,
                "changedRows": 6,
                "deletes": 0,
              },
              "custom_objects": {
                "backfillRows": 2,
                "changedRows": 2,
                "deletes": 2,
              },
              "deal_split": {
                "backfillRows": 0,
                "changedRows": 0,
                "deletes": 0,
              },
              "deals": {
                "backfillRows": 2,
                "changedRows": 2,
                "deletes": 0,
              },
              "discounts": {
                "backfillRows": 1,
                "changedRows": 1,
                "deletes": 0,
              },
              "emails": {
                "backfillRows": 3,
                "changedRows": 3,
                "deletes": 0,
              },
              "feedback_submissions": {
                "backfillRows": 0,
                "changedRows": 0,
                "deletes": 0,
              },
              "fees": {
                "backfillRows": 1,
                "changedRows": 1,
                "deletes": 0,
              },
              "goal_targets": {
                "backfillRows": 0,
                "changedRows": 0,
                "deletes": 0,
              },
              "invoices": {
                "backfillRows": 1,
                "changedRows": 1,
                "deletes": 0,
              },
              "leads": {
                "backfillRows": 1,
                "changedRows": 1,
                "deletes": 0,
              },
              "line_items": {
                "backfillRows": 1,
                "changedRows": 1,
                "deletes": 0,
              },
              "lists": {
                "backfillRows": 1,
                "changedRows": 1,
                "deletes": 0,
              },
              "meetings": {
                "backfillRows": 2,
                "changedRows": 3,
                "deletes": 0,
              },
              "notes": {
                "backfillRows": 1,
                "changedRows": 1,
                "deletes": 0,
              },
              "orders": {
                "backfillRows": 1,
                "changedRows": 1,
                "deletes": 0,
              },
              "owners": {
                "backfillRows": 1,
                "changedRows": 1,
                "deletes": 0,
              },
              "pipelines": {
                "backfillRows": 4,
                "changedRows": 4,
                "deletes": 0,
              },
              "postal_mail": {
                "backfillRows": 1,
                "changedRows": 1,
                "deletes": 1,
              },
              "products": {
                "backfillRows": 1,
                "changedRows": 1,
                "deletes": 0,
              },
              "properties": {
                "backfillRows": 3314,
                "changedRows": 3314,
                "deletes": 0,
              },
              "quotes": {
                "backfillRows": 2,
                "changedRows": 2,
                "deletes": 0,
              },
              "subscriptions": {
                "backfillRows": 0,
                "changedRows": 0,
                "deletes": 0,
              },
              "tasks": {
                "backfillRows": 3,
                "changedRows": 3,
                "deletes": 0,
              },
              "taxes": {
                "backfillRows": 1,
                "changedRows": 1,
                "deletes": 0,
              },
              "teams": {
                "backfillRows": 1,
                "changedRows": 1,
                "deletes": 0,
              },
              "tickets": {
                "backfillRows": 1,
                "changedRows": 1,
                "deletes": 0,
              },
              "users": {
                "backfillRows": 4,
                "changedRows": 4,
                "deletes": 0,
              },
            },
          }
        `);
      }),
    5 * 60_000,
  );
});

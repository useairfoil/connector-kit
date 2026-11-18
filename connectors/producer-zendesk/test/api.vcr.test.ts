import { NodeServices } from "@effect/platform-node";
import { describe, expect, it } from "@effect/vitest";
import { ConnectorApp } from "@useairfoil/connector-kit";
import { FileSystemCassetteStore, VcrHttpClient } from "@useairfoil/effect-vcr";
import { ConfigProvider, Effect, Layer, Option } from "effect";
import { FetchHttpClient } from "effect/http";
import { existsSync } from "node:fs";

import { ZendeskConnector, manifest } from "../src/index";

const canRun =
  existsSync(new URL("./__cassettes__/api.vcr.test.cassette", import.meta.url)) ||
  process.env.ZENDESK_CLIENT_SECRET !== undefined;

const configLayer = ConfigProvider.layer(
  ConfigProvider.fromEnv().pipe(
    ConfigProvider.orElse(
      ConfigProvider.fromUnknown({
        ZENDESK_SUBDOMAIN: "stealth-37618",
        ZENDESK_CLIENT_ID: "zendesk-client-id-placeholder",
        ZENDESK_CLIENT_SECRET: "zendesk-client-secret-placeholder",
      }),
    ),
  ),
);

const connectorLayer = ZendeskConnector.layerConfig(ZendeskConnector.ZendeskConfigDef.config).pipe(
  Layer.provide(
    VcrHttpClient.layer({
      vcrName: "producer-zendesk",
      redact: {
        requestBodyReplacements: {
          client_id: "zendesk-client-id-placeholder",
          client_secret: "zendesk-client-secret-placeholder",
        },
        // Polling windows change between recordings.
        requestQueryParams: ["filter[created_at_start]"],
        responseHeaders: ["set-cookie"],
        responseBodyReplacements: {
          access_token: "zendesk-access-token-placeholder",
          email: "user@example.com",
          ip_address: null,
          location: null,
          latitude: null,
          longitude: null,
          client: null,
        },
      },
    }).pipe(
      Layer.provide(FileSystemCassetteStore.layer()),
      Layer.provide(Layer.merge(NodeServices.layer, FetchHttpClient.layer)),
    ),
  ),
  Layer.provide(configLayer),
);

// Before the test data was made, so changes read all of it.
const cutoff = "2026-10-08T21:20:00.000Z";

describe.skipIf(!canRun)("Zendesk API (vcr)", () => {
  // Export calls are spaced out, so this takes over a minute, even in replay.
  it.live(
    "checks, backfills, and reads changes for every resource",
    () =>
      Effect.gen(function* () {
        // Share one token; a second acquisition would replay the redacted token.
        const built = Layer.succeedContext(yield* Layer.build(connectorLayer));
        const check = yield* ConnectorApp.check(ZendeskConnector.ZendeskConnector, built, {
          resources: manifest.resources
            .filter(
              ({ name }) =>
                ![
                  "custom_objects",
                  "custom_object_fields",
                  "custom_object_records",
                  "article_translations",
                  "community_comments",
                  "talk_calls",
                  "talk_legs",
                ].includes(name),
            )
            .map((resource) => resource.name),
        });
        const connector = yield* ZendeskConnector.ZendeskConnector.pipe(Effect.provide(built));

        const results: Record<string, unknown> = {};
        const recordedResources = connector.resources.filter(
          ({ name }) =>
            ![
              "custom_objects",
              "custom_object_fields",
              "custom_object_records",
              "article_translations",
              "community_comments",
              "talk_calls",
              "talk_legs",
            ].includes(name),
        );
        for (const resource of recordedResources) {
          // Memberships have no backfill.
          const backfill = resource.backfill;
          const changes = yield* Effect.fromOption(Option.fromNullishOr(resource.changes));

          let rows = 0;
          let pageCursor: string | undefined;
          while (backfill) {
            const page = yield* backfill.fetch({ cutoff, ...(pageCursor ? { pageCursor } : {}) });
            rows += page.rows.length;
            if (!page.hasMore) break;
            pageCursor = String(page.nextPageCursor);
          }
          const changed = yield* changes.fetch({ cursor: cutoff });
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
              "articles": {
                "_tag": "ok",
              },
              "brands": {
                "_tag": "ok",
              },
              "categories": {
                "_tag": "ok",
              },
              "community_posts": {
                "_tag": "ok",
              },
              "community_topics": {
                "_tag": "ok",
              },
              "csat_surveys": {
                "_tag": "ok",
              },
              "custom_roles": {
                "_tag": "ok",
              },
              "custom_statuses": {
                "_tag": "ok",
              },
              "group_memberships": {
                "_tag": "ok",
              },
              "groups": {
                "_tag": "ok",
              },
              "macros": {
                "_tag": "ok",
              },
              "organization_fields": {
                "_tag": "ok",
              },
              "organization_memberships": {
                "_tag": "ok",
              },
              "organizations": {
                "_tag": "ok",
              },
              "satisfaction_ratings": {
                "_tag": "ok",
              },
              "schedules": {
                "_tag": "ok",
              },
              "sections": {
                "_tag": "ok",
              },
              "sla_policies": {
                "_tag": "ok",
              },
              "survey_responses": {
                "_tag": "ok",
              },
              "talk_lines": {
                "_tag": "ok",
              },
              "ticket_audits": {
                "_tag": "ok",
              },
              "ticket_comments": {
                "_tag": "ok",
              },
              "ticket_field_history": {
                "_tag": "ok",
              },
              "ticket_fields": {
                "_tag": "ok",
              },
              "ticket_forms": {
                "_tag": "ok",
              },
              "ticket_metric_events": {
                "_tag": "ok",
              },
              "tickets": {
                "_tag": "ok",
              },
              "user_fields": {
                "_tag": "ok",
              },
              "users": {
                "_tag": "ok",
              },
            },
            "results": {
              "articles": {
                "backfillRows": 12,
                "changedRows": 1,
                "deletes": 0,
              },
              "brands": {
                "backfillRows": 1,
                "changedRows": 1,
                "deletes": 0,
              },
              "categories": {
                "backfillRows": 1,
                "changedRows": 1,
                "deletes": 0,
              },
              "community_posts": {
                "backfillRows": 5,
                "changedRows": 5,
                "deletes": 0,
              },
              "community_topics": {
                "backfillRows": 2,
                "changedRows": 2,
                "deletes": 0,
              },
              "csat_surveys": {
                "backfillRows": 1,
                "changedRows": 1,
                "deletes": 0,
              },
              "custom_roles": {
                "backfillRows": 4,
                "changedRows": 4,
                "deletes": 0,
              },
              "custom_statuses": {
                "backfillRows": 6,
                "changedRows": 6,
                "deletes": 0,
              },
              "group_memberships": {
                "backfillRows": 0,
                "changedRows": 1,
                "deletes": 0,
              },
              "groups": {
                "backfillRows": 2,
                "changedRows": 2,
                "deletes": 0,
              },
              "macros": {
                "backfillRows": 2,
                "changedRows": 2,
                "deletes": 0,
              },
              "organization_fields": {
                "backfillRows": 1,
                "changedRows": 1,
                "deletes": 0,
              },
              "organization_memberships": {
                "backfillRows": 0,
                "changedRows": 2,
                "deletes": 0,
              },
              "organizations": {
                "backfillRows": 3,
                "changedRows": 1,
                "deletes": 1,
              },
              "satisfaction_ratings": {
                "backfillRows": 6,
                "changedRows": 6,
                "deletes": 0,
              },
              "schedules": {
                "backfillRows": 1,
                "changedRows": 1,
                "deletes": 0,
              },
              "sections": {
                "backfillRows": 6,
                "changedRows": 6,
                "deletes": 0,
              },
              "sla_policies": {
                "backfillRows": 1,
                "changedRows": 1,
                "deletes": 0,
              },
              "survey_responses": {
                "backfillRows": 2,
                "changedRows": 2,
                "deletes": 0,
              },
              "talk_lines": {
                "backfillRows": 2,
                "changedRows": 2,
                "deletes": 0,
              },
              "ticket_audits": {
                "backfillRows": 49,
                "changedRows": 46,
                "deletes": 0,
              },
              "ticket_comments": {
                "backfillRows": 23,
                "changedRows": 22,
                "deletes": 0,
              },
              "ticket_field_history": {
                "backfillRows": 144,
                "changedRows": 126,
                "deletes": 0,
              },
              "ticket_fields": {
                "backfillRows": 25,
                "changedRows": 25,
                "deletes": 0,
              },
              "ticket_forms": {
                "backfillRows": 1,
                "changedRows": 1,
                "deletes": 0,
              },
              "ticket_metric_events": {
                "backfillRows": 144,
                "changedRows": 133,
                "deletes": 0,
              },
              "tickets": {
                "backfillRows": 6,
                "changedRows": 4,
                "deletes": 1,
              },
              "user_fields": {
                "backfillRows": 1,
                "changedRows": 1,
                "deletes": 0,
              },
              "users": {
                "backfillRows": 7,
                "changedRows": 5,
                "deletes": 1,
              },
            },
          }
        `);
      }).pipe(Effect.scoped),
    5 * 60_000,
  );
});

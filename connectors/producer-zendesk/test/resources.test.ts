import { describe, expect, it } from "@effect/vitest";
import { ConnectorApp } from "@useairfoil/connector-kit";
import { Effect, Option, Ref } from "effect";
import { TestClock } from "effect/testing";

import { demo } from "../src/demo";
import { ZendeskConnector, manifest } from "../src/index";
import { tableSchemas } from "../src/tables";
import {
  article,
  comment,
  commentAnswer,
  csatSurvey,
  customStatus,
  group,
  groupMembership,
  identity,
  metricEvent,
  metricSet,
  organization,
  rating,
  ratingAnswer,
  reasonAnswer,
  surveyResponse,
  ticket,
  ticketEvent,
  user,
} from "./fixtures/objects";
import {
  type FakeRequest,
  type FakeZendesk,
  connectorLayer,
  describeRequest,
  makeFakeClient,
  pick,
  plain,
} from "./helpers";

const now = Date.parse("2026-10-08T22:00:00.000Z");
const cutoff = "2026-10-08T21:50:00.000Z";

type ResourceName = (typeof manifest.resources)[number]["name"];

const getChanges = (name: ResourceName, fake: FakeZendesk) =>
  Effect.gen(function* () {
    yield* TestClock.setTime(now);
    const { client, requests } = yield* makeFakeClient(fake);
    const connector = yield* ZendeskConnector.ZendeskConnector.pipe(
      Effect.provide(connectorLayer(client)),
    );
    const resource = yield* Effect.fromOption(
      Option.fromNullishOr(connector.resources.find((item) => item.name === name)),
    );
    const changes = yield* Effect.fromOption(Option.fromNullishOr(resource.changes));
    return {
      resource,
      changes,
      requests: Ref.get(requests).pipe(Effect.map((items) => items.map(describeRequest))),
    };
  });

const getResource = (name: ResourceName, fake: FakeZendesk) =>
  Effect.gen(function* () {
    const { resource, ...rest } = yield* getChanges(name, fake);
    const backfill = yield* Effect.fromOption(Option.fromNullishOr(resource.backfill));
    return { backfill, ...rest };
  });

const cursorPages =
  (key: string, pages: ReadonlyArray<ReadonlyArray<unknown>>, extra = {}) =>
  (request: FakeRequest) => {
    const index = request.params.cursor === undefined ? 0 : Number(request.params.cursor);
    const last = index === pages.length - 1;
    return {
      [key]: pages[index],
      ...extra,
      after_cursor: last ? null : String(index + 1),
      end_of_stream: last,
    };
  };

describe("resources", () => {
  it.effect("matches the manifest and the table schemas", () =>
    Effect.gen(function* () {
      const { client } = yield* makeFakeClient(() => undefined);
      const connector = yield* ZendeskConnector.ZendeskConnector.pipe(
        Effect.provide(connectorLayer(client)),
      );

      expect(connector.resources.map((item) => item.name)).toEqual(
        manifest.resources.map((item) => item.name),
      );
      for (const resource of connector.resources) {
        expect(tableSchemas[resource.name]).toBe(resource.rowSchema);
      }
      const demoTables = [...demo.setup.tables, ...demo.group.tables];
      expect(demoTables.map((table) => table.name).toSorted()).toEqual(
        Object.keys(tableSchemas).toSorted(),
      );
      for (const table of demoTables) {
        const resource = connector.resources.find((item) => item.name === table.name);
        expect(table.rowSchema).toBe(resource?.rowSchema);
        expect(table.version).toBe(resource?.version);
      }
    }),
  );

  it.effect("checks every resource with read-only calls", () =>
    Effect.gen(function* () {
      yield* TestClock.setTime(now);
      const { client, requests } = yield* makeFakeClient(() => ({
        ...Object.fromEntries(manifest.resources.map((resource) => [resource.name, []] as const)),
        ticket_events: [],
        surveys: [],
        identities: [],
        holidays: [],
        posts: [],
        topics: [],
        lines: [],
        next_page: null,
        after_cursor: null,
        end_time: null,
        end_of_stream: true,
      }));

      const result = yield* ConnectorApp.check(
        ZendeskConnector.ZendeskConnector,
        connectorLayer(client),
        { resources: manifest.resources.map((resource) => resource.name) },
      );

      expect({
        failed: Object.entries(result).filter(([, item]) => item._tag !== "ok"),
        requests: (yield* Ref.get(requests)).map(describeRequest),
      }).toMatchInlineSnapshot(`
        {
          "failed": [
            [
              "talk_calls",
              {
                "_tag": "error",
                "message": "Fixture for /channels/voice/stats/incremental/calls does not decode",
              },
            ],
            [
              "talk_legs",
              {
                "_tag": "error",
                "message": "Fixture for /channels/voice/stats/incremental/legs does not decode",
              },
            ],
          ],
          "requests": [
            "/incremental/tickets/cursor include=metric_sets&start_time=0&per_page=1",
            "/incremental/ticket_events include=comment_events&start_time=0&per_page=1",
            "/incremental/users/cursor include=identities&start_time=0&per_page=1",
            "/incremental/organizations start_time=0&per_page=1",
            "/groups page%5Bsize%5D=100",
            "/brands page%5Bsize%5D=100",
            "/ticket_fields page%5Bsize%5D=100",
            "/ticket_forms page%5Bsize%5D=100",
            "/custom_statuses",
            "/guide/survey_responses page%5Bsize%5D=1",
            "/guide/en-us/surveys page%5Bsize%5D=50",
            "/incremental/ticket_events start_time=0&per_page=1",
            "/incremental/ticket_metric_events start_time=0&per_page=1",
            "/incremental/ticket_events start_time=0&per_page=1",
            "/satisfaction_ratings page%5Bsize%5D=1",
            "/group_memberships page%5Bsize%5D=100",
            "/organization_memberships page%5Bsize%5D=100",
            "/user_fields page%5Bsize%5D=100",
            "/organization_fields page%5Bsize%5D=100",
            "/custom_roles",
            "/slas/policies",
            "/business_hours/schedules",
            "/macros page%5Bsize%5D=100",
            "/help_center/incremental/articles start_time=0&per_page=1",
            "/help_center/incremental/articles start_time=0&per_page=1",
            "/help_center/sections page%5Bsize%5D=100",
            "/help_center/categories page%5Bsize%5D=100",
            "/community/posts page%5Bsize%5D=100",
            "/community/posts page%5Bsize%5D=1",
            "/community/topics page%5Bsize%5D=100",
            "/channels/voice/lines",
            "/channels/voice/stats/incremental/calls start_time=0&per_page=1",
            "/channels/voice/stats/incremental/legs start_time=0&per_page=1",
            "/custom_objects",
            "/custom_objects",
            "/custom_objects",
          ],
        }
      `);
    }),
  );

  it.effect("backfills tickets with metrics until the end of the stream", () =>
    Effect.gen(function* () {
      const { backfill, requests } = yield* getResource(
        "tickets",
        cursorPages(
          "tickets",
          [
            [ticket(1, { generated_timestamp: 1791490000 })],
            [
              ticket(2, { generated_timestamp: 1791496100 }),
              // Past the cutoff.
              ticket(3, { status: "deleted", generated_timestamp: 1791496300 }),
            ],
            [ticket(4)],
          ],
          { metric_sets: [metricSet(2)] },
        ),
      );

      const first = yield* backfill.fetch({ cutoff });
      const second = yield* backfill.fetch({ cutoff, pageCursor: String(first.nextPageCursor) });

      expect({
        first: { hasMore: first.hasMore, next: first.nextPageCursor },
        second: { hasMore: second.hasMore, next: second.nextPageCursor },
        row: plain(second.rows[0]),
        deleted: pick(second.rows, ["id", "_deleted"]),
        requests: yield* requests,
      }).toMatchInlineSnapshot(`
        {
          "deleted": [
            {
              "_deleted": false,
              "id": "2n",
            },
            {
              "_deleted": true,
              "id": "3n",
            },
          ],
          "first": {
            "hasMore": true,
            "next": "1",
          },
          "requests": [
            "/incremental/tickets/cursor include=metric_sets&start_time=0",
            "/incremental/tickets/cursor include=metric_sets&cursor=1",
          ],
          "row": {
            "_deleted": false,
            "assignee_id": "39771704393373n",
            "brand_id": "39771695429277n",
            "created_at": "2026-10-08T21:25:21.000Z",
            "custom_fields": {
              "39771680543389": "topic__billing__invoice__request",
              "39771695973277": "false",
              "39771695973278": "["red","blue"]",
            },
            "custom_status_id": "39771663254173n",
            "description": "Billing question - first message",
            "due_at": null,
            "external_id": null,
            "group_id": "39771663256989n",
            "id": "2n",
            "is_public": true,
            "metrics": {
              "agent_wait_time_in_minutes": {
                "business": "0n",
                "calendar": "0n",
              },
              "assigned_at": "2026-10-08T21:25:21.000Z",
              "assignee_stations": "1n",
              "first_resolution_time_in_minutes": {
                "business": "7n",
                "calendar": "7n",
              },
              "full_resolution_time_in_minutes": {
                "business": "7n",
                "calendar": "7n",
              },
              "group_stations": "1n",
              "initially_assigned_at": "2026-10-08T21:25:21.000Z",
              "latest_comment_added_at": "2026-10-08T21:25:28.000Z",
              "on_hold_time_in_minutes": {
                "business": "0n",
                "calendar": "0n",
              },
              "reopens": "0n",
              "replies": "2n",
              "reply_time_in_minutes": {
                "business": "4n",
                "calendar": "4n",
              },
              "requester_wait_time_in_minutes": {
                "business": "7n",
                "calendar": "7n",
              },
              "solved_at": "2026-10-08T21:25:28.000Z",
              "status_updated_at": "2026-10-08T21:25:28.000Z",
            },
            "organization_id": "39771868840349n",
            "priority": "high",
            "problem_id": null,
            "requester_id": "39771868857245n",
            "satisfaction_rating": {
              "score": "unoffered",
            },
            "status": "solved",
            "subject": "Billing question",
            "submitter_id": "39771868857245n",
            "tags": [
              "billing",
              "vip",
            ],
            "ticket_form_id": "39771663206685n",
            "type": "question",
            "updated_at": "2026-10-08T21:25:28.000Z",
            "version": "2026-10-08T21:48:20.000Z",
            "via": {
              "channel": "api",
            },
          },
          "second": {
            "hasMore": true,
            "next": "2",
          },
        }
      `);
    }),
  );

  it.effect("reads ticket changes from a minute before the cutoff, then by cursor", () =>
    Effect.gen(function* () {
      const { changes, requests } = yield* getResource(
        "tickets",
        cursorPages("tickets", [[ticket(1)], [ticket(2)]]),
      );

      const first = yield* changes.fetch({ cursor: cutoff });
      const second = yield* changes.fetch({ cursor: first.cursor });

      expect({
        first: { rows: first.rows.length, cursor: first.cursor, hasMore: first.hasMore },
        second: { rows: second.rows.length, cursor: second.cursor, hasMore: second.hasMore },
        requests: yield* requests,
      }).toMatchInlineSnapshot(`
        {
          "first": {
            "cursor": "1",
            "hasMore": true,
            "rows": 1,
          },
          "requests": [
            "/incremental/tickets/cursor include=metric_sets&start_time=1791496140",
            "/incremental/tickets/cursor include=metric_sets&cursor=1",
          ],
          "second": {
            "cursor": "1",
            "hasMore": false,
            "rows": 1,
          },
        }
      `);
    }),
  );

  it.effect("deletes users that are no longer active, and adds their identities", () =>
    Effect.gen(function* () {
      const { changes } = yield* getResource(
        "users",
        cursorPages("users", [[user(1), user(2, { active: false, email: null })]], {
          identities: [
            identity(11, 1),
            identity(12, 1, { type: "phone_number", value: "+15555550100", primary: false }),
          ],
        }),
      );

      const { rows } = yield* changes.fetch({ cursor: cutoff });

      expect(plain(rows)).toMatchInlineSnapshot(`
        [
          {
            "created_at": "2026-10-08T21:25:19.000Z",
            "custom_role_id": null,
            "default_group_id": null,
            "email": "ada@acme.example",
            "external_id": null,
            "id": "1n",
            "identities": [
              {
                "id": "11n",
                "primary": true,
                "type": "email",
                "value": "ada@acme.example",
                "verified": false,
              },
              {
                "id": "12n",
                "primary": false,
                "type": "phone_number",
                "value": "+15555550100",
                "verified": false,
              },
            ],
            "last_login_at": null,
            "locale": "en-US",
            "name": "Ada Test",
            "organization_id": "39771868840349n",
            "role": "end-user",
            "suspended": false,
            "tags": [
              "beta",
            ],
            "time_zone": "Asia/Kolkata",
            "updated_at": "2026-10-08T21:25:19.000Z",
            "user_fields": {
              "plan": "pro",
              "seats": "12",
            },
            "verified": false,
            "version": "2026-10-08T21:25:19.000Z",
          },
          {
            "_deleted": true,
            "created_at": "2026-10-08T21:25:19.000Z",
            "custom_role_id": null,
            "default_group_id": null,
            "email": null,
            "external_id": null,
            "id": "2n",
            "identities": [],
            "last_login_at": null,
            "locale": "en-US",
            "name": "Ada Test",
            "organization_id": "39771868840349n",
            "role": "end-user",
            "suspended": false,
            "tags": [
              "beta",
            ],
            "time_zone": "Asia/Kolkata",
            "updated_at": "2026-10-08T21:25:19.000Z",
            "user_fields": {
              "plan": "pro",
              "seats": "12",
            },
            "verified": false,
            "version": "2026-10-08T21:25:19.000Z",
          },
        ]
      `);
    }),
  );

  it.effect("pages organizations by end time, and deletes deleted ones", () =>
    Effect.gen(function* () {
      const { backfill, changes, requests } = yield* getResource("organizations", (request) =>
        request.params.start_time === "0"
          ? { organizations: [organization(1)], end_time: 1791490000, end_of_stream: false }
          : {
              organizations: [
                organization(2, {
                  name: "2_deleted_Globex Test Co",
                  deleted_at: "2026-10-08T21:51:00Z",
                  updated_at: "2026-10-08T21:51:00Z",
                }),
              ],
              end_time: 1791496260,
              end_of_stream: false,
            },
      );

      const first = yield* backfill.fetch({ cutoff });
      const second = yield* backfill.fetch({ cutoff, pageCursor: String(first.nextPageCursor) });
      const changed = yield* changes.fetch({ cursor: "1791496200" });

      expect({
        backfill: [first, second].map((page) => ({
          hasMore: page.hasMore,
          next: page.nextPageCursor,
        })),
        changes: {
          cursor: changed.cursor,
          rows: pick(changed.rows, ["id", "name", "_deleted"]),
        },
        requests: yield* requests,
      }).toMatchInlineSnapshot(`
        {
          "backfill": [
            {
              "hasMore": true,
              "next": "1791490000",
            },
            {
              "hasMore": false,
              "next": undefined,
            },
          ],
          "changes": {
            "cursor": "1791496260",
            "rows": [
              {
                "_deleted": true,
                "id": "2n",
                "name": "2_deleted_Globex Test Co",
              },
            ],
          },
          "requests": [
            "/incremental/organizations start_time=0",
            "/incremental/organizations start_time=1791490000",
            "/incremental/organizations start_time=1791496200",
          ],
        }
      `);
    }),
  );

  it.effect("reads comments from ticket events, and reads a redacted ticket again", () =>
    Effect.gen(function* () {
      const { changes, requests } = yield* getResource("ticket_comments", (request) => {
        if (request.path === "/incremental/ticket_events") {
          return {
            ticket_events: [
              ticketEvent(3, "2026-10-08T21:25:22Z", [
                { ...comment(31, { body: "Card 4111 1111 1111 1111?" }), event_type: "Comment" },
                { id: 1, via: "Web service", status: "open", event_type: "Create" },
              ]),
              // An SLA update has no child events.
              ticketEvent(3, "2026-10-08T21:25:23Z", []),
              ticketEvent(3, "2026-10-08T21:25:40Z", [
                { id: 2, comment_id: "30", event_type: "CommentRedactionEvent" },
              ]),
              // Two redactions on one ticket need only one reread.
              ticketEvent(3, "2026-10-08T21:25:50Z", [
                { id: 2, attachment_id: "311", event_type: "AttachmentRedactionEvent" },
              ]),
              // Ticket 5 was deleted after the redaction, so its comments 404.
              ticketEvent(5, "2026-10-08T21:26:10Z", [
                { id: 3, comment_id: "51", event_type: "CommentRedactionEvent" },
              ]),
            ],
            end_time: 1791494750,
            end_of_stream: true,
          };
        }
        if (request.path === "/tickets/5/comments") return undefined;
        return request.params["page[after]"] === undefined
          ? {
              comments: [comment(30)],
              meta: { has_more: true, after_cursor: "next" },
            }
          : {
              comments: [comment(31, { body: "Card ▇▇▇▇ ▇▇▇▇ ▇▇▇▇ ▇▇▇▇?" })],
              meta: { has_more: false, after_cursor: null },
            };
      });

      const { rows, cursor } = yield* changes.fetch({ cursor: "1791494700" });

      expect({
        cursor,
        rows: pick(rows, ["id", "ticket_id", "version", "body"]),
        requests: yield* requests,
      }).toMatchInlineSnapshot(`
        {
          "cursor": "1791494750",
          "requests": [
            "/incremental/ticket_events include=comment_events&start_time=1791494700",
            "/tickets/3/comments page%5Bsize%5D=100",
            "/tickets/3/comments page%5Bsize%5D=100&page%5Bafter%5D=next",
            "/tickets/5/comments page%5Bsize%5D=100",
          ],
          "rows": [
            {
              "body": "Card 4111 1111 1111 1111?",
              "id": "31n",
              "ticket_id": "3n",
              "version": "2026-10-08T21:25:22.000Z",
            },
            {
              "body": "Thanks Ada, looking into it.",
              "id": "30n",
              "ticket_id": "3n",
              "version": "2026-10-08T21:25:50.000Z",
            },
            {
              "body": "Card ▇▇▇▇ ▇▇▇▇ ▇▇▇▇ ▇▇▇▇?",
              "id": "31n",
              "ticket_id": "3n",
              "version": "2026-10-08T21:25:50.000Z",
            },
          ],
        }
      `);
    }),
  );

  it.effect("records each ticket field change, with custom fields by ID", () =>
    Effect.gen(function* () {
      const { changes, requests } = yield* getResource("ticket_field_history", () => ({
        ticket_events: [
          ticketEvent(3, "2026-10-08T21:25:22Z", [
            {
              id: 11,
              via: "Web form",
              via_reference_id: null,
              status: "open",
              event_type: "Create",
            },
            {
              id: 12,
              via: "Web form",
              via_reference_id: null,
              tags: ["billing"],
              added_tags: ["billing"],
              removed_tags: [],
              event_type: "Create",
            },
            { ...comment(31), event_type: "Comment" },
          ]),
          ticketEvent(3, "2026-10-08T21:25:40Z", [
            {
              id: 13,
              via: "Rule",
              via_reference_id: 39771663297821,
              priority: "urgent",
              rel: "trigger",
              revision_id: 1,
              event_type: "Change",
              previous_value: "high",
            },
            {
              id: 14,
              via: "Intelligent Triage",
              via_reference_id: null,
              custom_ticket_fields: { "39771680543389": "topic__billing__invoice__request" },
              event_type: "Change",
              previous_value: null,
            },
          ]),
        ],
        end_time: 1791494750,
        end_of_stream: true,
      }));

      const { rows } = yield* changes.fetch({ cursor: "1791494700" });

      expect({
        rows: pick(rows, ["id", "field_name", "value", "previous_value", "via"]),
        requests: yield* requests,
      }).toMatchInlineSnapshot(`
        {
          "requests": [
            "/incremental/ticket_events start_time=1791494700",
          ],
          "rows": [
            {
              "field_name": "status",
              "id": "11n",
              "previous_value": null,
              "value": "open",
              "via": "Web form",
            },
            {
              "field_name": "tags",
              "id": "12n",
              "previous_value": null,
              "value": "["billing"]",
              "via": "Web form",
            },
            {
              "field_name": "priority",
              "id": "13n",
              "previous_value": "high",
              "value": "urgent",
              "via": "Rule",
            },
            {
              "field_name": "39771680543389",
              "id": "14n",
              "previous_value": null,
              "value": "topic__billing__invoice__request",
              "via": "Intelligent Triage",
            },
          ],
        }
      `);
    }),
  );

  it.effect("reads metric events with their SLA and status", () =>
    Effect.gen(function* () {
      const { changes } = yield* getResource("ticket_metric_events", () => ({
        ticket_metric_events: [
          metricEvent(1, {
            type: "apply_sla",
            sla: {
              target: 60,
              business_hours: false,
              policy: { id: 39771709039517, title: "Set first reply time", description: null },
              target_in_seconds: 3600,
            },
          }),
          metricEvent(2, { type: "update_status", status: { business: 0, calendar: 4 } }),
          metricEvent(3, { type: "breach", ticket_id: null, deleted: true }),
        ],
        next_page: null,
        count: 3,
        end_time: 1791494750,
        end_of_stream: true,
      }));

      const { rows } = yield* changes.fetch({ cursor: "1791494700" });

      expect(
        pick(rows, ["id", "_deleted", "type", "ticket_id", "sla_policy_id", "status_calendar"]),
      ).toMatchInlineSnapshot(`
        [
          {
            "_deleted": false,
            "id": "1n",
            "sla_policy_id": "39771709039517n",
            "status_calendar": null,
            "ticket_id": "1n",
            "type": "apply_sla",
          },
          {
            "_deleted": false,
            "id": "2n",
            "sla_policy_id": null,
            "status_calendar": "4n",
            "ticket_id": "1n",
            "type": "update_status",
          },
          {
            "_deleted": true,
            "id": "3n",
            "sla_policy_id": null,
            "status_calendar": null,
            "ticket_id": null,
            "type": "breach",
          },
        ]
      `);
    }),
  );

  it.effect("deletes a membership that is gone on the next read", () =>
    Effect.gen(function* () {
      let memberships = [groupMembership(1, 10), groupMembership(2, 20)];
      const { changes } = yield* getChanges("group_memberships", () => ({
        group_memberships: memberships,
        meta: { has_more: false, after_cursor: null },
      }));

      const first = yield* changes.fetch({ cursor: cutoff });
      memberships = [groupMembership(1, 10)];
      const second = yield* changes.fetch({ cursor: first.cursor });

      expect({
        first: pick(first.rows, ["id", "_deleted"]),
        cursor: first.cursor,
        second: pick(second.rows, ["id", "version", "_deleted"]),
      }).toMatchInlineSnapshot(`
        {
          "cursor": "{"ids":["1","2"]}",
          "first": [
            {
              "id": "1n",
            },
            {
              "id": "2n",
            },
          ],
          "second": [
            {
              "id": "1n",
              "version": "2026-10-08T21:13:25.000Z",
            },
            {
              "_deleted": true,
              "id": "2n",
              "version": "2026-10-08T22:00:00.000Z",
            },
          ],
        }
      `);
    }),
  );

  it.effect("reads ratings given since the last run", () =>
    Effect.gen(function* () {
      const { changes, requests } = yield* getResource("satisfaction_ratings", () => ({
        satisfaction_ratings: [rating(1), rating(2, { score: "good", comment: null })],
        meta: { has_more: false, after_cursor: null },
      }));

      const { rows, cursor } = yield* changes.fetch({ cursor: "2026-10-08T21:00:00.000Z" });

      expect({
        cursor,
        rows: pick(rows, ["id", "score", "reason", "version"]),
        requests: yield* requests,
      }).toMatchInlineSnapshot(`
        {
          "cursor": "2026-10-08T22:00:00.000Z",
          "requests": [
            "/satisfaction_ratings page%5Bsize%5D=100&start_time=1791493200",
          ],
          "rows": [
            {
              "id": "1n",
              "reason": null,
              "score": "bad",
              "version": "2026-10-08T21:30:21.000Z",
            },
            {
              "id": "2n",
              "reason": null,
              "score": "good",
              "version": "2026-10-08T21:30:21.000Z",
            },
          ],
        }
      `);
    }),
  );

  it.effect("reads articles until a page has no next page, and keeps the cursor when empty", () =>
    Effect.gen(function* () {
      const { changes } = yield* getResource("articles", (request) =>
        request.params.start_time === "1791494700"
          ? { articles: [article(1)], count: 1, next_page: "next", end_time: 1791494720 }
          : request.params.start_time === "1791494720"
            ? { articles: [article(2)], count: 1, next_page: null, end_time: 1791494750 }
            : { articles: [], count: 0, next_page: null, end_time: 1 },
      );

      const first = yield* changes.fetch({ cursor: "1791494700" });
      const second = yield* changes.fetch({ cursor: first.cursor });
      const third = yield* changes.fetch({ cursor: second.cursor });

      expect({
        first: { ids: pick(first.rows, ["id"]), cursor: first.cursor, hasMore: first.hasMore },
        second: { ids: pick(second.rows, ["id"]), cursor: second.cursor, hasMore: second.hasMore },
        third: { ids: pick(third.rows, ["id"]), cursor: third.cursor, hasMore: third.hasMore },
      }).toMatchInlineSnapshot(`
        {
          "first": {
            "cursor": "1791494720",
            "hasMore": true,
            "ids": [
              {
                "id": "1n",
              },
            ],
          },
          "second": {
            "cursor": "1791494750",
            "hasMore": false,
            "ids": [
              {
                "id": "2n",
              },
            ],
          },
          "third": {
            "cursor": "1791494750",
            "hasMore": false,
            "ids": [],
          },
        }
      `);
    }),
  );

  it.effect("lists the small tables in full", () =>
    Effect.gen(function* () {
      const groups = yield* getResource("groups", (request) =>
        request.params["page[after]"] === undefined
          ? { groups: [group], meta: { has_more: true, after_cursor: "next" } }
          : {
              groups: [{ ...group, id: 2, name: "Billing" }],
              meta: { has_more: false, after_cursor: null },
            },
      );
      const statuses = yield* getResource("custom_statuses", () => ({
        custom_statuses: [customStatus],
        next_page: null,
        previous_page: null,
        count: 1,
      }));

      const groupPage = yield* groups.backfill.fetch({ cutoff });
      const statusPage = yield* statuses.backfill.fetch({ cutoff });

      expect({
        groups: pick(groupPage.rows, ["id", "name"]),
        statuses: plain(statusPage.rows),
        requests: [...(yield* groups.requests), ...(yield* statuses.requests)],
      }).toMatchInlineSnapshot(`
        {
          "groups": [
            {
              "id": "39771663256989n",
              "name": "Support",
            },
            {
              "id": "2n",
              "name": "Billing",
            },
          ],
          "requests": [
            "/groups page%5Bsize%5D=100",
            "/groups page%5Bsize%5D=100&page%5Bafter%5D=next",
            "/custom_statuses",
          ],
          "statuses": [
            {
              "active": true,
              "agent_label": "Solved",
              "created_at": "2026-10-08T21:13:25.000Z",
              "default": true,
              "end_user_label": "Solved",
              "id": "39771663254173n",
              "status_category": "solved",
              "updated_at": "2026-10-08T21:13:25.000Z",
              "version": "2026-10-08T21:13:25.000Z",
            },
          ],
        }
      `);
    }),
  );

  it.effect("reads answered surveys, re-reads the editable window, and names the questions", () =>
    Effect.gen(function* () {
      const responses = yield* getResource("survey_responses", () => ({
        survey_responses: [
          surveyResponse("A", [ratingAnswer(1, "bad"), reasonAnswer, commentAnswer]),
          // The customer changed the rating later.
          surveyResponse("B", [ratingAnswer(5, "good", "2026-10-09T06:19:22.892Z")], "6"),
          // Sent, but not answered.
          surveyResponse("C", [], "2"),
          // Not changed since the last run.
          surveyResponse("D", [ratingAnswer(4, "good", "2026-10-08T20:00:00.000Z")], "4"),
        ],
        meta: { has_more: false, after_cursor: null },
      }));
      const surveys = yield* getResource("csat_surveys", () => ({
        surveys: [csatSurvey],
        meta: { has_more: false, after_cursor: null },
      }));

      const changed = yield* responses.changes.fetch({ cursor: cutoff });
      const survey = yield* surveys.backfill.fetch({ cutoff });

      expect({
        responses: pick(changed.rows, ["id", "version", "ticket_id", "rating", "answers"]),
        survey: plain(survey.rows),
        requests: [...(yield* responses.requests), ...(yield* surveys.requests)],
      }).toMatchInlineSnapshot(`
        {
          "requests": [
            "/guide/survey_responses page%5Bsize%5D=50&sort=id&filter%5Bcreated_at_start%5D=1788990600000",
            "/guide/en-us/surveys page%5Bsize%5D=50",
          ],
          "responses": [
            {
              "answers": [
                {
                  "option_ids": [],
                  "question_id": "01M4FMXA2ZKKW0SW4G3MA6FBV9",
                  "question_type": "rating_scale_numeric",
                  "rating": "1n",
                  "rating_category": "bad",
                  "type": "rating_scale",
                  "updated_at": "2026-10-09T06:18:21.129Z",
                  "value": null,
                },
                {
                  "option_ids": [
                    "01M4FMXA30Z079V8E8P0BM67D9",
                  ],
                  "question_id": "01M4FMXA2ZBXBT4CSMM2QAAEV7",
                  "question_type": "closed_ended",
                  "rating": null,
                  "rating_category": null,
                  "type": "closed_ended",
                  "updated_at": "2026-10-09T06:18:21.129Z",
                  "value": null,
                },
                {
                  "option_ids": [],
                  "question_id": "01M4FMXA30EKPSYPJRYHK3NJPQ",
                  "question_type": "open_ended",
                  "rating": null,
                  "rating_category": null,
                  "type": "open_ended",
                  "updated_at": "2026-10-09T06:18:21.129Z",
                  "value": "Took too long to get a reply.",
                },
              ],
              "id": "A",
              "rating": "1n",
              "ticket_id": "3n",
              "version": "2026-10-09T06:18:21.129Z",
            },
            {
              "answers": [
                {
                  "option_ids": [],
                  "question_id": "01M4FMXA2ZKKW0SW4G3MA6FBV9",
                  "question_type": "rating_scale_numeric",
                  "rating": "5n",
                  "rating_category": "good",
                  "type": "rating_scale",
                  "updated_at": "2026-10-09T06:19:22.892Z",
                  "value": null,
                },
              ],
              "id": "B",
              "rating": "5n",
              "ticket_id": "6n",
              "version": "2026-10-09T06:19:22.892Z",
            },
          ],
          "survey": [
            {
              "created_at": "2026-10-09T06:16:58.492Z",
              "id": "01M4FMXHBW5WHJ6D7BEMA0RZC5",
              "questions": [
                {
                  "headline": "How would you rate the support you received?",
                  "id": "01M4FMXA2ZKKW0SW4G3MA6FBV9",
                  "options": [
                    {
                      "id": null,
                      "label": "Very unsatisfied",
                      "rating": "1n",
                    },
                    {
                      "id": null,
                      "label": "Very satisfied",
                      "rating": "5n",
                    },
                  ],
                  "sub_type": "customer_satisfaction",
                  "type": "rating_scale_numeric",
                },
                {
                  "headline": "Select a reason regarding your experience",
                  "id": "01M4FMXA2ZBXBT4CSMM2QAAEV7",
                  "options": [
                    {
                      "id": "01M4FMXA30Z079V8E8P0BM67D9",
                      "label": "The issue was not resolved",
                      "rating": null,
                    },
                  ],
                  "sub_type": null,
                  "type": "closed_ended",
                },
                {
                  "headline": "Share your thoughts on the support you received",
                  "id": "01M4FMXA30EKPSYPJRYHK3NJPQ",
                  "options": [],
                  "sub_type": null,
                  "type": "open_ended",
                },
              ],
              "state": "enabled",
              "survey_version": "1n",
              "updated_at": "2026-10-09T06:16:58.492Z",
              "version": "2026-10-09T06:16:58.492Z",
            },
          ],
        }
      `);
    }),
  );
});

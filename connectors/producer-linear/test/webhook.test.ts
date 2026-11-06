import { NodeHttpServer } from "@effect/platform-node";
import { describe, expect, it } from "@effect/vitest";
import { Ingestion, StateStore } from "@useairfoil/connector-kit";
import { DateTime, Deferred, Effect, Layer, Ref } from "effect";
import { HttpClient, HttpClientRequest, HttpServerRequest } from "effect/http";
import { TestClock } from "effect/testing";

import { LinearConnector, webhookPath } from "../src/index";
import { historyEntry, issue } from "./fixtures/objects";
import {
  type FakeRequest,
  connectorLayer,
  makeFakeClient,
  makeTestIngestor,
  page,
  pick,
  signPayload,
} from "./helpers";

const now = Date.parse("2026-10-16T12:00:00.000Z");
const archivedIssue = { ...issue, archived_at: "2026-10-16T11:59:00.000Z" };

const fake = ({ operation, variables }: FakeRequest, restored: boolean) =>
  variables.id === undefined
    ? page(`${operation.charAt(0).toLowerCase()}${operation.slice(1)}`, [])
    : operation === "Issue" && variables.id === issue.id
      ? { issue: { ...archivedIssue, archived_at: restored ? null : archivedIssue.archived_at } }
      : operation === "IssueHistory" && variables.id === issue.id
        ? {
            issue: {
              id: issue.id,
              updated_at: issue.updated_at,
              history: page("history", [
                { ...historyEntry, updated_at: archivedIssue.archived_at, archived: !restored },
              ]).history,
            },
          }
        : undefined;

/** Waits for the expected ingests before reading webhook rows. */
const post = (
  body: Record<string, unknown>,
  options: { readonly signature?: string; readonly expected?: number } = {},
) =>
  Effect.gen(function* () {
    yield* TestClock.setTime(now);
    const { client } = yield* makeFakeClient((request) => fake(request, body.action === "restore"));
    const connector = yield* LinearConnector.LinearConnector.pipe(
      Effect.provide(connectorLayer(client)),
    );
    const expected = options.expected ?? 0;
    const { ingestedRef, done, layer } = yield* makeTestIngestor(expected);
    const cutoff = yield* DateTime.now.pipe(Effect.map(DateTime.formatIso));

    return yield* Effect.gen(function* () {
      yield* Effect.forkScoped(
        Ingestion.run(connector, {
          initialCutoff: cutoff,
          webhook: { routes: connector.webhooks ?? [] },
        }),
      );

      const rawBody = JSON.stringify({ ...body, webhookTimestamp: now });
      const http = yield* HttpClient.HttpClient;
      const response = yield* http.execute(
        HttpClientRequest.post(webhookPath).pipe(
          HttpClientRequest.setHeader(
            "linear-signature",
            options.signature ?? signPayload(rawBody),
          ),
          HttpClientRequest.bodyText(rawBody, "application/json"),
        ),
      );
      if (expected > 0) yield* Deferred.await(done);

      const ingested = (yield* Ref.get(ingestedRef)).filter((item) => item.source === "webhook");
      return {
        status: response.status,
        rows: pick(
          ingested.flatMap((item) =>
            item.batch.rows.map((row) => ({ resource: item.resource, ...row })),
          ),
          ["resource", "id", "version", "archived_at", "archived", "_deleted"],
        ),
      };
    }).pipe(
      Effect.provide(Layer.mergeAll(StateStore.layerMemory, layer, NodeHttpServer.layerTest)),
    );
  }).pipe(Effect.scoped);

describe("webhook", () => {
  it.effect("confirms only removal and restore events for supported types", () =>
    Effect.gen(function* () {
      yield* TestClock.setTime(now);
      const { client } = yield* makeFakeClient((request) => fake(request, false));
      const connector = yield* LinearConnector.LinearConnector.pipe(
        Effect.provide(connectorLayer(client)),
      );
      const verify = connector.webhooks?.[0]?.verify;
      if (verify === undefined) throw new Error("Webhook verification is missing");

      const accepts = (action: string, type = "Issue") => {
        const payload = { action, type, webhookTimestamp: now, data: { id: issue.id } };
        const body = JSON.stringify(payload);
        return verify({
          request: HttpServerRequest.fromWeb(
            new Request(`https://hooks.example.test${webhookPath}`, {
              method: "POST",
              headers: { "linear-signature": signPayload(body) },
            }),
          ),
          rawBody: new TextEncoder().encode(body),
          payload,
        });
      };

      expect(yield* accepts("create")).toBe(false);
      expect(yield* accepts("update")).toBe(false);
      expect(yield* accepts("remove", "Unknown")).toBe(false);
      expect(yield* accepts("remove")).toBe(true);
      expect(yield* accepts("restore")).toBe(true);
    }),
  );

  it.effect("refreshes archived and restored issues and history, and deletes missing items", () =>
    Effect.gen(function* () {
      expect({
        archived: yield* post(
          { action: "remove", type: "Issue", data: { id: issue.id } },
          { expected: 2 },
        ),
        restored: yield* post(
          { action: "restore", type: "Issue", data: { id: issue.id } },
          { expected: 2 },
        ),
        deleted: yield* post(
          { action: "remove", type: "Comment", data: { id: "comment-1" } },
          { expected: 1 },
        ),
        deletedIssue: yield* post(
          { action: "remove", type: "Issue", data: { id: "missing-issue" } },
          { expected: 1 },
        ),
      }).toMatchInlineSnapshot(`
        {
          "archived": {
            "rows": [
              {
                "_deleted": false,
                "archived_at": "2026-10-16T11:59:00.000Z",
                "id": "0ba5ba1b-fcc2-423c-ad89-fc7a0bf208a9",
                "resource": "issues",
                "version": "2026-10-16T12:00:00.000Z",
              },
              {
                "archived": true,
                "archived_at": null,
                "id": "ce40998a-5fe2-4a0f-9395-5cb03e2d4b0b",
                "resource": "issue_history",
                "version": "2026-10-16T11:59:00.000Z",
              },
            ],
            "status": 200,
          },
          "deleted": {
            "rows": [
              {
                "_deleted": true,
                "id": "comment-1",
                "resource": "comments",
                "version": "2026-10-16T12:00:00.000Z",
              },
            ],
            "status": 200,
          },
          "deletedIssue": {
            "rows": [
              {
                "_deleted": true,
                "id": "missing-issue",
                "resource": "issues",
                "version": "2026-10-16T12:00:00.000Z",
              },
            ],
            "status": 200,
          },
          "restored": {
            "rows": [
              {
                "_deleted": false,
                "archived_at": null,
                "id": "0ba5ba1b-fcc2-423c-ad89-fc7a0bf208a9",
                "resource": "issues",
                "version": "2026-10-16T12:00:00.000Z",
              },
              {
                "archived": false,
                "archived_at": null,
                "id": "ce40998a-5fe2-4a0f-9395-5cb03e2d4b0b",
                "resource": "issue_history",
                "version": "2026-10-16T11:59:00.000Z",
              },
            ],
            "status": 200,
          },
        }
      `);
    }),
  );

  it.effect("leaves creates and updates to polling, and rejects bad signatures", () =>
    Effect.gen(function* () {
      expect({
        update: yield* post({ action: "update", type: "Issue", data: { id: issue.id } }),
        badSignature: yield* post(
          { action: "remove", type: "Issue", data: { id: issue.id } },
          { signature: "00" },
        ),
      }).toMatchInlineSnapshot(`
        {
          "badSignature": {
            "rows": [],
            "status": 401,
          },
          "update": {
            "rows": [],
            "status": 200,
          },
        }
      `);
    }),
  );
});

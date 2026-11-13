import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { TestClock } from "effect/testing";

import { verifySignature } from "../src/webhook/signature";
import { sign } from "./helpers";

// The example from HubSpot's request validation docs.
const example = {
  method: "POST",
  url: "https://webhook.site/335453f5-94b3-49d9-b684-a55354d4b8df",
  body: '[{"eventId":531833541,"subscriptionId":3923621,"portalId":48807704,"appId":16111050,"occurredAt":1752613920733,"subscriptionType":"contact.creation","attemptNumber":0,"objectId":138017612137,"changeFlag":"CREATED","changeSource":"CRM_UI","sourceId":"userId:76023669"}]',
  timestamp: 1752613922216,
  secret: "cfc68c0b-4b4e-4ef8-b764-95350e4ea479",
  signature: "gbj1XPRvUt0noT7i7fXfTzOD4sLzQmf0VT28ZYq0EYg=",
};

const verify = (overrides: Partial<typeof example> = {}) => {
  const input = { ...example, ...overrides };
  return verifySignature({
    method: input.method,
    url: input.url,
    rawBody: new TextEncoder().encode(input.body),
    signature: input.signature,
    timestamp: String(input.timestamp),
    secret: input.secret,
  }).pipe(Effect.match({ onFailure: (error) => error.message, onSuccess: () => "ok" }));
};

describe("verifySignature", () => {
  it.effect("accepts HubSpot's example and rejects changes to it", () =>
    Effect.gen(function* () {
      yield* TestClock.setTime(example.timestamp + 1000);
      expect({
        example: yield* verify(),
        otherBody: yield* verify({ body: "[]" }),
        otherUrl: yield* verify({ url: "https://webhook.site/other" }),
        otherSecret: yield* verify({ secret: "other" }),
        missing: yield* verify({ signature: "" }),
      }).toMatchInlineSnapshot(`
        {
          "example": "ok",
          "missing": "Invalid HubSpot webhook signature",
          "otherBody": "Invalid HubSpot webhook signature",
          "otherSecret": "Invalid HubSpot webhook signature",
          "otherUrl": "Invalid HubSpot webhook signature",
        }
      `);
    }),
  );

  it.effect("rejects requests older than 5 minutes", () =>
    Effect.gen(function* () {
      yield* TestClock.setTime(example.timestamp + 6 * 60 * 1000);
      expect(yield* verify()).toMatchInlineSnapshot(
        `"HubSpot webhook timestamp is missing or too old"`,
      );
    }),
  );

  it.effect("signs the URL with HubSpot's decoded characters", () =>
    Effect.gen(function* () {
      const timestamp = 1752613922216;
      yield* TestClock.setTime(timestamp);
      const signature = sign({
        method: "POST",
        url: "https://hooks.example.com/webhook?a=b:c",
        body: "[]",
        timestamp,
        secret: example.secret,
      });
      expect(
        yield* verify({
          url: "https://hooks.example.com/webhook?a=b%3Ac",
          body: "[]",
          timestamp,
          signature,
        }),
      ).toMatchInlineSnapshot(`"ok"`);
    }),
  );
});

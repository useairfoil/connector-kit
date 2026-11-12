import { ConnectorError, type ResourceDefinition, Webhook } from "@useairfoil/connector-kit";
import { Effect, Option, Result, Schema } from "effect";
import { HttpServerResponse } from "effect/http";

import { manifest } from "../manifest";
import { Optional, Ref } from "../schemas/shared";
import { verifySignature } from "./signature";

export const webhookPath = manifest.webhook.path;

// The body sits under a key named after the event type.
const EventSchema = Schema.Record(Schema.String, Schema.Unknown);

const EventTypeSchema = Schema.Struct({ event_type: Schema.String });

// Public events carry the object, private ones only `id`. Some put the object
// under a key, such as `incident` on `incident_status_updated_v2`.
const BodySchema = Schema.Struct({
  id: Optional(Schema.String),
  incident: Optional(Ref),
  escalation: Optional(Ref),
  postmortem_document: Optional(Ref),
  schedule: Optional(Ref),
  status_page_incident: Optional(Ref),
});

const TimestampSchema = Schema.NumberFromString;

const decodeError = (cause: Schema.SchemaError) =>
  new ConnectorError({ message: "Invalid incident.io webhook payload", cause });

/** The ID of the record an event is about. */
export const readEventId = (payload: Readonly<Record<string, unknown>>, event: string) =>
  Schema.decodeUnknownEffect(BodySchema)(payload[event]).pipe(
    Effect.mapError(decodeError),
    Effect.map((body) =>
      Option.fromNullishOr(
        body.id ??
          body.incident?.id ??
          body.escalation?.id ??
          body.postmortem_document?.id ??
          body.schedule?.id ??
          body.status_page_incident?.id,
      ),
    ),
  );

export const makeWebhookRoute = (options: {
  readonly secret: string;
  /** Resources by event type, without the `public_` or `private_` prefix. */
  readonly targets: ReadonlyMap<string, ReadonlyArray<ResourceDefinition>>;
}) =>
  Webhook.route({
    path: webhookPath,
    ackMode: "after-enqueue",
    verify: ({ request, rawBody, payload }) =>
      Effect.gen(function* () {
        yield* verifySignature({ rawBody, headers: request.headers, secret: options.secret });
        const { event_type: event } = yield* Schema.decodeUnknownEffect(EventTypeSchema)(
          payload,
        ).pipe(Effect.mapError(decodeError));
        if (!options.targets.has(event.replace(/^(public|private)_/, ""))) return false;

        const id = yield* readEventId(payload, event);
        if (Option.isNone(id))
          return yield* new ConnectorError({ message: "Invalid incident.io webhook payload" });
        yield* Schema.decodeUnknownEffect(TimestampSchema)(
          request.headers["webhook-timestamp"],
        ).pipe(Effect.mapError(decodeError));
        return true;
      }),
    schema: EventSchema,
    handler: ({ request, rawBody, payload, to }) =>
      Effect.gen(function* () {
        const verified = yield* verifySignature({
          rawBody,
          headers: request.headers,
          secret: options.secret,
        }).pipe(Effect.result);
        if (Result.isFailure(verified)) {
          return HttpServerResponse.jsonUnsafe(
            { ok: false, error: verified.failure.message },
            { status: 401 },
          );
        }

        // Other events get a 200 before their body is read, so new event types
        // can't fail the endpoint.
        const { event_type: event } = yield* Schema.decodeUnknownEffect(EventTypeSchema)(
          payload,
        ).pipe(Effect.mapError(decodeError));
        const resources = options.targets.get(event.replace(/^(public|private)_/, ""));
        if (resources === undefined) return HttpServerResponse.jsonUnsafe({ ok: true });
        const id = yield* readEventId(payload, event);
        if (Option.isNone(id)) {
          return yield* new ConnectorError({ message: `incident.io ${event} has no ID` });
        }
        const seconds = yield* Schema.decodeUnknownEffect(TimestampSchema)(
          request.headers["webhook-timestamp"],
        ).pipe(Effect.mapError(decodeError));
        const target = { event, id: id.value, time: new Date(seconds * 1000) };

        yield* Effect.forEach(resources, (resource) => to(resource, target), { discard: true });

        return HttpServerResponse.jsonUnsafe({ ok: true });
      }),
  });

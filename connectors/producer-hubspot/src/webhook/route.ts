import { type ConnectorError, type ResourceDefinition, Webhook } from "@useairfoil/connector-kit";
import { Array as Arr, Effect, Option, Result, Schema } from "effect";
import { HttpServerResponse } from "effect/http";

import type { RecordEvents } from "../resources/crm/webhook";

import { manifest } from "../manifest";
import { type HubSpotEvent, HubSpotEventSchema, WebhookPayloadSchema } from "../schemas/events";
import { webhookEvents } from "./events";
import { verifySignature } from "./signature";

export const webhookPath = manifest.webhook.path;

const decodeEvent = Schema.decodeUnknownOption(HubSpotEventSchema);

const contactTypeId = "0-1";

type RecordEvent = RecordEvents[number] & { readonly typeId: string };

/** What each event asks of the resources. Other events are skipped. */
const recordEvents = (event: HubSpotEvent): ReadonlyArray<RecordEvent> => {
  const objectType = event.objectTypeId;
  const record = (
    typeId: string,
    id: string,
    deleted: boolean,
    linkedTo?: string,
  ): RecordEvent => ({
    typeId,
    id,
    deleted,
    ...(linkedTo === undefined ? {} : { linkedTo }),
  });
  switch (event.subscriptionType) {
    case webhookEvents.contact_privacyDeletion:
      return event.objectId === undefined ? [] : [record(contactTypeId, event.objectId, true)];
    case webhookEvents.object_creation:
    case webhookEvents.object_restore:
    case webhookEvents.object_propertyChange:
      return objectType === undefined || event.objectId === undefined
        ? []
        : [record(objectType, event.objectId, false)];
    case webhookEvents.object_deletion:
      return objectType === undefined || event.objectId === undefined
        ? []
        : [record(objectType, event.objectId, true)];
    case webhookEvents.object_merge: {
      if (objectType === undefined) return [];
      const kept = event.newObjectId ?? event.primaryObjectId;
      return [
        ...(event.mergedObjectIds ?? [])
          .filter((id) => id !== kept)
          .map((id) => record(objectType, id, true)),
        ...(kept === undefined ? [] : [record(objectType, kept, false)]),
      ];
    }
    case webhookEvents.object_associationChange: {
      const { fromObjectTypeId: from, fromObjectId, toObjectTypeId: to, toObjectId } = event;
      return from === undefined ||
        to === undefined ||
        fromObjectId === undefined ||
        toObjectId === undefined
        ? []
        : [record(from, fromObjectId, false, to), record(to, toObjectId, false, from)];
    }
    default:
      return [];
  }
};

export const makeWebhookRoute = (options: {
  readonly secret: string;
  readonly publicUrl: string;
  /** The connector's HubSpot account. Events from other accounts are skipped. */
  readonly portalId: Effect.Effect<number, ConnectorError>;
  /** CRM resources by object type ID, such as `0-1`. */
  readonly targets: ReadonlyMap<string, ResourceDefinition>;
  /** Takes every custom object type, `2-*`. */
  readonly customObjects: ResourceDefinition;
}) => {
  const resourceFor = (typeId: string) =>
    options.targets.get(typeId) ?? (typeId.startsWith("2-") ? options.customObjects : undefined);

  const recordsFor = (payload: ReadonlyArray<unknown>, portalId: number) =>
    payload
      .flatMap((value) => Option.toArray(decodeEvent(value)))
      .filter((event) => event.portalId === portalId)
      .flatMap(recordEvents);

  return Webhook.route({
    path: webhookPath,
    ackMode: "after-enqueue",
    verify: ({ request, rawBody, payload }) =>
      Effect.gen(function* () {
        yield* verifySignature({
          method: request.method,
          url: options.publicUrl,
          rawBody,
          signature: request.headers["x-hubspot-signature-v3"],
          timestamp: request.headers["x-hubspot-request-timestamp"],
          secret: options.secret,
        });
        const portalId = yield* options.portalId;
        return recordsFor(payload, portalId).some(
          (record) => resourceFor(record.typeId) !== undefined,
        );
      }),
    schema: WebhookPayloadSchema,
    handler: ({ request, rawBody, payload, to }) =>
      Effect.gen(function* () {
        const verified = yield* verifySignature({
          method: request.method,
          url: options.publicUrl,
          rawBody,
          signature: request.headers["x-hubspot-signature-v3"],
          timestamp: request.headers["x-hubspot-request-timestamp"],
          secret: options.secret,
        }).pipe(Effect.result);
        if (Result.isFailure(verified)) {
          return HttpServerResponse.jsonUnsafe(
            { ok: false, error: verified.failure.message },
            { status: 401 },
          );
        }

        const portalId = yield* options.portalId;
        const byType = Arr.groupBy(recordsFor(payload, portalId), (event) => event.typeId);
        yield* Effect.forEach(
          Object.entries(byType),
          ([typeId, events]) => {
            const resource = resourceFor(typeId);
            return resource === undefined ? Effect.void : to(resource, events);
          },
          { concurrency: "unbounded", discard: true },
        );

        return HttpServerResponse.jsonUnsafe({ ok: true });
      }),
  });
};

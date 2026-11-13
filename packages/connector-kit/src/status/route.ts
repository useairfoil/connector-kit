import { Cause, Effect, Ref } from "effect";
import { HttpRouter, HttpServerResponse } from "effect/http";

import type { ConnectorDefinition } from "../core/types";
import type { ResourceStatus, StatusUnavailableResponse, WebhookStatus } from "./types";

import { StateStore } from "../state-store";
import { deriveSyncState, normalizeCursor } from "../state-store/state";

export const statusRoute = (
  connector: ConnectorDefinition,
  path: HttpRouter.PathInput = "/status",
  webhooks?: Ref.Ref<ReadonlyArray<WebhookStatus>>,
) =>
  HttpRouter.add(
    "GET",
    path,
    Effect.gen(function* () {
      const store = yield* StateStore;

      const resources = yield* Effect.forEach(
        connector.resources,
        (resource) =>
          store.getResourceState(resource.name).pipe(
            Effect.map(
              (state): ResourceStatus => ({
                name: resource.name,
                state: deriveSyncState(connector, resource, state),
                ...(state?.backfill
                  ? {
                      backfill: {
                        completed: state.backfill.completed,
                        cutoff: normalizeCursor(state.backfill.cutoff),
                        ...(state.backfill.pageCursor !== undefined
                          ? { pageCursor: normalizeCursor(state.backfill.pageCursor) }
                          : {}),
                        ...(state.backfill.lastSuccessAt !== undefined
                          ? { lastSuccessAt: state.backfill.lastSuccessAt }
                          : {}),
                      },
                    }
                  : {}),
                ...(state?.changes
                  ? {
                      changes: {
                        cursor: normalizeCursor(state.changes.cursor),
                        ...(state.changes.lastSuccessAt !== undefined
                          ? { lastSuccessAt: state.changes.lastSuccessAt }
                          : {}),
                      },
                    }
                  : {}),
                ...(state?.lastError ? { lastError: state.lastError } : {}),
              }),
            ),
          ),
        { concurrency: "unbounded" },
      );

      return HttpServerResponse.jsonUnsafe({
        connector: connector.name,
        resources,
        webhooks: webhooks ? yield* Ref.get(webhooks) : [],
      });
    }).pipe(
      Effect.catchCause((cause) =>
        Effect.logWarning(`Status route failed: ${Cause.pretty(cause)}`).pipe(
          Effect.andThen(
            Effect.succeed(
              HttpServerResponse.jsonUnsafe(
                {
                  ok: false,
                  error: "Failed to compute status",
                } satisfies StatusUnavailableResponse,
                { status: 500 },
              ),
            ),
          ),
        ),
      ),
    ),
  );

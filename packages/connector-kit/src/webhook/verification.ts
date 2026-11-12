import { ByteSize, Duration, Effect, Exit, Layer, Ref, Schema } from "effect";
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http";

import type { WebhookRoute } from "../core/types";

/** Rejects invalid requests and discards valid events. Only true results confirm setup. */
export const verificationRouter = <E, R>(
  routes: ReadonlyArray<WebhookRoute>,
  notify: Effect.Effect<void, E, R>,
  rejected: Effect.Effect<void, E, R> = Effect.void,
) =>
  Effect.gen(function* () {
    const reported = yield* Ref.make(false);
    const notification = yield* notify.pipe(
      Effect.tap(() => Ref.set(reported, true)),
      Effect.cachedWithTTL((exit) => (Exit.isSuccess(exit) ? Duration.infinity : Duration.zero)),
    );
    const rejection = yield* rejected.pipe(
      Effect.cachedWithTTL((exit) => (Exit.isSuccess(exit) ? Duration.infinity : Duration.zero)),
    );

    return Layer.mergeAll(
      HttpRouter.add("GET", "/health", Effect.succeed(HttpServerResponse.text("ok"))),
      ...routes.map((route) =>
        HttpRouter.add(
          "POST",
          route.path,
          Effect.gen(function* () {
            const request = yield* HttpServerRequest.HttpServerRequest;
            if (route.verify === undefined) return HttpServerResponse.empty({ status: 503 });

            const body = yield* request.arrayBuffer.pipe(Effect.result);
            if (body._tag === "Failure") return HttpServerResponse.empty({ status: 400 });

            const rawBody = new Uint8Array(body.success);
            const payload = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(route.schema))(
              new TextDecoder().decode(rawBody),
            ).pipe(Effect.result);
            if (payload._tag === "Failure") return HttpServerResponse.empty({ status: 400 });

            const verified = yield* route
              .verify({ request, rawBody, payload: payload.success })
              .pipe(Effect.result);
            if (verified._tag === "Failure") {
              if (!(yield* Ref.get(reported))) yield* rejection.pipe(Effect.ignore);
              return HttpServerResponse.empty({ status: 401 });
            }
            if (!verified.success) return HttpServerResponse.empty({ status: 200 });

            const result = yield* notification.pipe(Effect.result);
            return HttpServerResponse.empty({ status: result._tag === "Failure" ? 503 : 200 });
          }).pipe(Effect.provideService(HttpServerRequest.MaxBodySize, ByteSize.megabytes(1))),
        ),
      ),
    );
  });

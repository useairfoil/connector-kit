import { Config, Console, Context, Effect, Layer, Option, Schedule, Schema } from "effect";
import { Flag } from "effect/cli";
import { HttpClient, HttpClientRequest } from "effect/http";

import { ConnectorError } from "../errors";
import { PlatformRuntimeKey } from "../runtime-config";

const WebhookEvent = Schema.TaggedUnion({
  webhook_verified: {},
  webhook_rejected: {},
});

const CheckEvent = Schema.TaggedStruct("check_completed", {
  resources: Schema.Array(
    Schema.Struct({
      resource: Schema.String,
      status: Schema.Literals(["ok", "check_failed"]),
    }),
  ),
});

export const WebhookNotification = Schema.Struct({
  version: Schema.Literal(1),
  attempt: Schema.NonEmptyString.check(Schema.isMaxLength(120)),
  event: WebhookEvent,
});

type NotificationEvent = typeof WebhookEvent.Type | typeof CheckEvent.Type;

export class Notifier extends Context.Service<
  Notifier,
  { notify: (event: NotificationEvent) => Effect.Effect<void, ConnectorError> }
>()("@useairfoil/connector-kit/Notifier") {}

const consoleNotifier = Layer.succeed(Notifier, {
  notify: (event) => Console.log(JSON.stringify({ version: 1, event })),
});

const httpNotifier = (url: URL) =>
  Layer.effect(
    Notifier,
    Effect.gen(function* () {
      const attempt = yield* Config.NonEmptyString(PlatformRuntimeKey.notificationAttempt);
      const client = HttpClient.filterStatusOk(yield* HttpClient.HttpClient);

      const notify = Effect.fn("Notifier.notify")(
        function* (event: NotificationEvent) {
          const request = yield* HttpClientRequest.post(url.href).pipe(
            HttpClientRequest.bodyJson({ version: 1, attempt, event }),
          );
          yield* client.execute(request);
        },
        Effect.scoped,
        Effect.timeout("5 seconds"),
        Effect.retry({
          times: 3,
          schedule: Schedule.spaced("1 second"),
        }),
        Effect.mapError(() => new ConnectorError({ message: "Connector notification failed" })),
      );

      return { notify };
    }),
  );

export const notifierFlag = Flag.String("notifier").pipe(
  Flag.withSchema(Schema.URLFromString),
  Flag.optional,
);

export const notifierLayer = (url: Option.Option<URL>) =>
  Option.match(url, { onNone: () => consoleNotifier, onSome: httpNotifier });

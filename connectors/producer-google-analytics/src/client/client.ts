import { ConnectorError, Metrics, Telemetry } from "@useairfoil/connector-kit";
import {
  Config,
  Context,
  Data,
  DateTime,
  Duration,
  Effect,
  Exit,
  Layer,
  Redacted,
  Schedule,
  Semaphore,
} from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

import { type GoogleAnalyticsConfig, manifest } from "../manifest";
import { ErrorBodySchema, type RunReportResponse, RunReportResponseSchema } from "../schemas/api";
import * as GoogleAnalyticsAuth from "./auth";

export const DATA_API_VERSION = "v1beta";

const baseUrl = `https://analyticsdata.googleapis.com/${DATA_API_VERSION}`;
const maxRetries = 5;
const retryBaseDelay = Duration.seconds(1);
const requestTimeout = Duration.minutes(2);
// Token quotas refill within the hour, or at midnight Pacific for the daily one.
// Keep waiting; a failed source stays stopped until restart.
const limitRetry = Schedule.min([Schedule.exponential("1 minute"), Schedule.spaced("10 minutes")]);
// A standard property allows 10 requests at once. Leave room for other tools.
const maxConcurrent = 5;

export type ReportRequest = {
  readonly dimensions: ReadonlyArray<string>;
  readonly metrics: ReadonlyArray<string>;
  /** `YYYY-MM-DD` in the property's time zone. */
  readonly startDate: string;
  readonly endDate: string;
  readonly limit: number;
  readonly offset: number;
  /** Reads a daily first-session cohort from day 0 to this day instead. */
  readonly cohortEndOffset?: number | undefined;
};

export type GoogleAnalyticsClientService = {
  /** `name` labels the span and errors, such as the resource name. */
  readonly runReport: (
    name: string,
    request: ReportRequest,
  ) => Effect.Effect<RunReportResponse, ConnectorError>;
  /** The property's time zone. Report dates are days in this zone. */
  readonly timeZone: Effect.Effect<DateTime.TimeZone, ConnectorError>;
};

export class GoogleAnalyticsClient extends Context.Service<
  GoogleAnalyticsClient,
  GoogleAnalyticsClientService
>()("@useairfoil/producer-google-analytics/GoogleAnalyticsClient") {}

class QuotaExhausted extends Data.TaggedError("QuotaExhausted")<{ readonly message: string }> {}

const statusError = (response: HttpClientResponse.HttpClientResponse, name: string) =>
  HttpClientResponse.schemaBodyJson(ErrorBodySchema)(response).pipe(
    Effect.map((body) => body.error),
    Effect.orElseSucceed(() => undefined),
    Effect.flatMap(
      (error): Effect.Effect<never, ConnectorError | QuotaExhausted> =>
        response.status === 429
          ? Effect.fail(
              new QuotaExhausted({
                message: `Google Analytics quota used up for ${name}${error?.message ? `: ${error.message}` : ""}`,
              }),
            )
          : Effect.fail(
              new ConnectorError({
                message: `Google Analytics API returned ${response.status}${error?.status ? ` ${error.status}` : ""} for ${name}${error?.message ? `: ${error.message}` : ""}`,
              }),
            ),
    ),
    Effect.tapError((error) => Telemetry.annotateError("api_status", error)),
  );

export const make = Effect.fnUntraced(function* (
  config: Pick<GoogleAnalyticsConfig, "propertyId">,
) {
  const auth = yield* GoogleAnalyticsAuth.GoogleAnalyticsAuth;
  const semaphore = yield* Semaphore.make(maxConcurrent);
  const client = (yield* HttpClient.HttpClient).pipe(
    HttpClient.mapRequest(HttpClientRequest.acceptJson),
    HttpClient.mapRequestEffect((request) =>
      auth.get.pipe(
        Effect.map((token) => HttpClientRequest.bearerToken(request, Redacted.value(token))),
      ),
    ),
    // Short retries cover 5xx and the concurrent request limit. 5xx count
    // against a small hourly server error quota, so keep the cap.
    HttpClient.retryTransient({
      schedule: Metrics.retrySchedule({
        connector: manifest.name,
        baseDelay: retryBaseDelay,
        times: maxRetries,
      }),
    }),
  );
  const url = `${baseUrl}/properties/${config.propertyId}:runReport`;

  const runReport = (name: string, request: ReportRequest) =>
    Effect.gen(function* () {
      const dateRange = { startDate: request.startDate, endDate: request.endDate };
      const response = yield* client
        .execute(
          HttpClientRequest.post(url).pipe(
            HttpClientRequest.bodyJsonUnsafe({
              // A cohort report takes its days from the cohort, not `dateRanges`.
              ...(request.cohortEndOffset === undefined
                ? { dateRanges: [dateRange] }
                : {
                    cohortSpec: {
                      cohorts: [{ dimension: "firstSessionDate", dateRange }],
                      cohortsRange: {
                        granularity: "DAILY",
                        startOffset: 0,
                        endOffset: request.cohortEndOffset,
                      },
                    },
                  }),
              dimensions: request.dimensions.map((dimension) => ({ name: dimension })),
              metrics: request.metrics.map((metric) => ({ name: metric })),
              // Sort by every dimension so offset pages stay stable.
              orderBys: request.dimensions.map((dimension) => ({
                dimension: { dimensionName: dimension },
              })),
              limit: request.limit,
              offset: request.offset,
            }),
          ),
        )
        .pipe(
          Effect.tapError((error) => Telemetry.annotateError("api_http", error)),
          Effect.mapError(
            (error) =>
              new ConnectorError({
                message: `Google Analytics API request failed for ${name}`,
                cause: error,
              }),
          ),
        );
      return yield* HttpClientResponse.matchStatus(response, {
        "2xx": (ok) =>
          HttpClientResponse.schemaBodyJson(RunReportResponseSchema)(ok).pipe(
            Effect.tapError((error) => Telemetry.annotateError("api_decode", error)),
            Effect.mapError(
              (error) =>
                new ConnectorError({
                  message: `Google Analytics API response for ${name} does not match the schema`,
                  cause: error,
                }),
            ),
          ),
        orElse: (failed) => statusError(failed, name),
      });
    }).pipe(
      Effect.timeoutOrElse({
        duration: requestTimeout,
        orElse: () =>
          Effect.fail(
            new ConnectorError({ message: `Google Analytics API request timed out for ${name}` }),
          ),
      }),
      // The timeout starts once a permit is free, so queue time doesn't count.
      semaphore.withPermits(1),
      Effect.tapErrorTag("QuotaExhausted", (error) =>
        Effect.logWarning(`${error.message}. Waiting to try again.`),
      ),
      Effect.retry({
        schedule: limitRetry,
        while: (error) => error._tag === "QuotaExhausted",
      }),
      Effect.catchTag("QuotaExhausted", (error) =>
        Effect.fail(new ConnectorError({ message: error.message })),
      ),
      Effect.withSpan(Telemetry.SpanName.apiFetch, {
        kind: "client",
        attributes: { [Telemetry.Attr.apiPath]: `runReport:${name}` },
      }),
    );

  // Every report carries the zone; one small report reads it. Failures aren't
  // kept, and the hour picks up a changed zone.
  const timeZone = yield* Effect.cachedWithTTL(
    runReport("time_zone", {
      dimensions: ["date"],
      metrics: ["sessions"],
      startDate: "yesterday",
      endDate: "yesterday",
      limit: 1,
      offset: 0,
    }).pipe(
      Effect.flatMap((response) =>
        DateTime.zoneMakeNamedEffect(response.metadata.timeZone).pipe(
          Effect.mapError(
            (cause) =>
              new ConnectorError({
                message: `Unknown Google Analytics time zone ${response.metadata.timeZone}`,
                cause,
              }),
          ),
        ),
      ),
    ),
    (exit) => (Exit.isSuccess(exit) ? Duration.hours(1) : Duration.zero),
  );

  return GoogleAnalyticsClient.of({ runReport, timeZone });
});

export const layer = (
  config: GoogleAnalyticsConfig,
): Layer.Layer<GoogleAnalyticsClient, never, HttpClient.HttpClient> =>
  Layer.effect(GoogleAnalyticsClient)(make(config)).pipe(
    Layer.provide(GoogleAnalyticsAuth.layer(config)),
  );

export const layerConfig = (
  config: Config.Wrap<GoogleAnalyticsConfig>,
): Layer.Layer<GoogleAnalyticsClient, Config.ConfigError, HttpClient.HttpClient> =>
  Layer.unwrap(Config.unwrap(config).pipe(Effect.map(layer)));

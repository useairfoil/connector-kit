import { Effect, Schedule, type Duration } from "effect";

export type TableRetryOptions = {
  readonly interval: Duration.Input;
  /** Retries after the initial attempt. */
  readonly times: number;
};

/** Retries transient catalog responses at the request boundary. */
export const retryCatalogRequest = <A, E extends { readonly status?: number }, R>(
  request: Effect.Effect<A, E, R>,
  options?: TableRetryOptions,
) =>
  options === undefined
    ? request
    : request.pipe(
        Effect.retry({
          schedule: Schedule.spaced(options.interval),
          times: options.times,
          while: (error) =>
            error.status === 408 ||
            error.status === 429 ||
            (error.status !== undefined && error.status >= 500 && error.status <= 599),
        }),
      );

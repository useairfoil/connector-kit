import { Array as Arr, Config, Data, Effect, Option, Path, Result, Semaphore } from "effect";
import {
  HttpClient,
  HttpClientError,
  type HttpClientRequest,
  HttpClientResponse,
  Url,
} from "effect/http";

import type { Cassette, CassetteFile, VcrConfig, VcrEntry, VcrRequest, VcrResponse } from "./types";

import { CassetteStore, type CassetteStoreService, createEmptyCassette } from "./cassette-store";
import { buildRequestKey, redactRequest, redactResponse } from "./sanitize";
import { getVitestState } from "./vitest-state";

/**
 * Decoder for Uint8Array request bodies when building cassette keys.
 */
const decoder = new TextDecoder();

export class VcrHttpClientError extends Data.TaggedError("VcrHttpClientError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

const toCassetteFileName = (name: string): string =>
  name.endsWith(".cassette") ? name : `${name}.cassette`;

/**
 * Resolve the cassette file name and export key.
 *
 * If explicit cassetteName are provided, use them and default to
 * the "default" export. Otherwise infer from Vitest state:
 * - <file-name>.cassette file name
 * - export key = current test name (describe > test)
 */
const resolveCassetteLocation = Effect.fnUntraced(function* (config: VcrConfig) {
  const path = yield* Path.Path;
  if (config.cassetteName) {
    return {
      name: toCassetteFileName(config.cassetteName),
      exportKey: "default",
    };
  }

  const { testPath, currentTestName } = getVitestState();
  if (!testPath || !currentTestName) {
    return yield* Effect.fail(
      new VcrHttpClientError({
        message:
          "VCR cassette path could not be inferred. Provide cassetteName when not running in Vitest.",
      }),
    );
  }

  const fileName = path.basename(testPath, ".ts");
  const cassetteName = `${fileName}.cassette`;

  return {
    name: cassetteName,
    exportKey: currentTestName,
  };
});

/**
 * Apply defaults for common VCR behavior while preserving explicit overrides.
 */
const normalizeConfig = (config: VcrConfig): VcrConfig => {
  const redactedRequestBodyKeys = Arr.union(
    config.redact?.requestBodyKeys ?? [],
    Object.keys(config.redact?.requestBodyReplacements ?? {}),
  );
  const redactedRequestHeaders = Arr.union(["authorization"], config.redact?.requestHeaders ?? []);

  return {
    vcrName: config.vcrName,
    cassetteName: config.cassetteName,
    mode: config.mode ?? "auto",
    matchIgnore: {
      requestHeaders: Arr.union(redactedRequestHeaders, config.matchIgnore?.requestHeaders ?? []),
      requestBodyKeys: Arr.union(
        redactedRequestBodyKeys,
        config.matchIgnore?.requestBodyKeys ?? [],
      ),
    },
    redact: {
      ...config.redact,
      requestHeaders: redactedRequestHeaders,
    },
    match: config.match,
  };
};

const AckDisableVcrConfig = Config.option(Config.String("ACK_DISABLE_VCR")).pipe(
  Config.map((value) =>
    Option.match(value, {
      onNone: () => new Set<string>(),
      onSome: (raw) =>
        raw === "*"
          ? "*"
          : new Set(
              raw
                .split(",")
                .map((segment) => segment.trim().toLowerCase())
                .filter((segment) => segment.length > 0),
            ),
    }),
  ),
);

const shouldDisableVcr = (name: string | undefined, disabled: "*" | Set<string>): boolean => {
  if (disabled === "*") return true;
  if (!name) return false;
  const normalized = name.trim().toLowerCase();
  return disabled.has(normalized);
};

/**
 * Convert store or replay failures into HttpClient transport errors.
 */
const toRequestError = (
  request: HttpClientRequest.HttpClientRequest,
  cause: unknown,
  description?: string,
) =>
  new HttpClientError.HttpClientError({
    reason: new HttpClientError.TransportError({
      request,
      cause,
      description,
    }),
  });

/**
 * Best-effort JSON serialization for opaque raw bodies.
 */
const tryStringify = Option.liftThrowable((value: unknown) => JSON.stringify(value));

/**
 * Serialize an Effect HttpClientRequest into a cassette request shape.
 *
 * Note: some body variants (Stream, FormData) are not safely serializable
 * without consuming the body, so we store placeholders to avoid breaking
 * live requests.
 */
const toVcrRequest = (request: HttpClientRequest.HttpClientRequest): VcrRequest => {
  const headers: Record<string, string> = { ...request.headers };
  const body = (() => {
    switch (request.body._tag) {
      case "Empty":
        return "";
      case "Uint8Array":
        return decoder.decode(request.body.body);
      case "Raw": {
        const raw = request.body.body as unknown;
        if (typeof raw === "string") return raw;
        if (raw instanceof Uint8Array) return decoder.decode(raw);
        return tryStringify(raw).pipe(Option.getOrElse(() => "[raw]"));
      }
      case "FormData":
        return "[form-data]";
      case "Stream":
        return "[stream]";
    }
  })();

  return {
    method: request.method,
    url: requestUrl(request),
    headers,
    body,
  };
};

/**
 * The URL with its query params, built like `HttpClient` builds it.
 * `request.url` alone leaves out params set with `setUrlParams`.
 */
const requestUrl = (request: HttpClientRequest.HttpClientRequest): string =>
  Result.match(Url.make(request.url, request.urlParams, Option.getOrUndefined(request.hash)), {
    onFailure: () => request.url,
    onSuccess: (url) => url.toString(),
  });

/**
 * Serialize an Effect HttpClientResponse into a cassette response shape.
 */
const toVcrResponse = (
  response: HttpClientResponse.HttpClientResponse,
  body: string,
): VcrResponse => ({
  status: response.status,
  body,
  headers: { ...response.headers },
});

/**
 * Load a cassette and map store errors into HttpClient errors.
 */
const readCassetteFile = (
  store: CassetteStoreService,
  name: string,
  request: HttpClientRequest.HttpClientRequest,
) => store.load(name).pipe(Effect.mapError((error) => toRequestError(request, error)));

/**
 * Load a cassette or initialize a new one if missing.
 */
const loadOrInitCassetteFile = (
  store: CassetteStoreService,
  name: string,
  request: HttpClientRequest.HttpClientRequest,
) => store.loadOrInit(name).pipe(Effect.mapError((error) => toRequestError(request, error)));

/**
 * Persist the updated cassette.
 */
const saveCassetteFile = (
  store: CassetteStoreService,
  name: string,
  cassette: CassetteFile,
  request: HttpClientRequest.HttpClientRequest,
) => store.save(name, cassette).pipe(Effect.mapError((error) => toRequestError(request, error)));

/**
 * Load a named cassette export from the file, or return a fresh empty cassette.
 */
const readCassetteExport = (
  store: CassetteStoreService,
  name: string,
  exportKey: string,
  request: HttpClientRequest.HttpClientRequest,
) =>
  readCassetteFile(store, name, request).pipe(
    Effect.flatMap((file) => {
      const found = file.exports[exportKey];
      if (found) return Effect.succeed(found);
      return createEmptyCassette();
    }),
  );

/**
 * Locate a cassette entry by custom matcher or stable request key.
 */
const findEntry = (
  request: VcrRequest,
  cassette: Cassette,
  config: VcrConfig,
): Effect.Effect<VcrEntry | undefined> => {
  if (config.match) {
    return Effect.succeed(
      Object.values(cassette.entries).find((entry) => config.match?.(request, entry)),
    );
  }
  return buildRequestKey(request, {
    ignoreHeaders: config.matchIgnore?.requestHeaders,
    ignoreQueryParams: config.redact?.requestQueryParams,
    ignoreBodyKeys: config.matchIgnore?.requestBodyKeys,
  }).pipe(Effect.map((key) => cassette.entries[key]));
};

const replayResponse = (
  request: HttpClientRequest.HttpClientRequest,
  entry: VcrEntry,
): HttpClientResponse.HttpClientResponse => {
  const { status, body } = entry.response;
  const web = new Response(status === 204 || status === 205 || status === 304 ? null : body, {
    status,
    headers: entry.response.headers,
  });
  return HttpClientResponse.fromWeb(request, web);
};

/**
 * Replay a response from cassette data using HttpClientResponse.fromWeb.
 */
const replay = (
  store: CassetteStoreService,
  request: HttpClientRequest.HttpClientRequest,
  vcrRequest: VcrRequest,
  config: VcrConfig,
  name: string,
  exportKey: string,
) =>
  readCassetteExport(store, name, exportKey, request).pipe(
    Effect.flatMap((cassette) =>
      findEntry(vcrRequest, cassette, config).pipe(
        Effect.flatMap((entry) => {
          if (!entry) {
            return Effect.fail(
              new HttpClientError.HttpClientError({
                reason: new HttpClientError.TransportError({
                  request,
                  description: `VCR replay missing entry for ${request.method} ${requestUrl(request)}`,
                }),
              }),
            );
          }

          return Effect.succeed(replayResponse(request, entry));
        }),
      ),
    ),
  );

/**
 * Record a live response into the cassette and return the original response.
 */
const record = Effect.fnUntraced(function* (
  writeLock: Semaphore.Semaphore,
  store: CassetteStoreService,
  request: HttpClientRequest.HttpClientRequest,
  vcrRequest: VcrRequest,
  effect: Effect.Effect<HttpClientResponse.HttpClientResponse, HttpClientError.HttpClientError>,
  config: VcrConfig,
  name: string,
  exportKey: string,
): Effect.fn.Return<HttpClientResponse.HttpClientResponse, HttpClientError.HttpClientError> {
  const response = yield* effect;
  const body = yield* response.text;
  const vcrResponse = toVcrResponse(response, body);

  const sanitizedRequest = config.redact
    ? redactRequest(vcrRequest, {
        redactQueryParams: config.redact.requestQueryParams,
        redactHeaders: config.redact.requestHeaders,
        redactBodyKeys: config.redact.requestBodyKeys,
        bodyReplacements: config.redact.requestBodyReplacements,
      })
    : vcrRequest;
  const sanitizedResponse = config.redact
    ? redactResponse(vcrResponse, {
        redactHeaders: config.redact.responseHeaders,
        redactBodyKeys: config.redact.responseBodyKeys,
        bodyReplacements: config.redact.responseBodyReplacements,
      })
    : vcrResponse;

  // Concurrent requests record into the same file, so writes take turns.
  yield* writeLock.withPermits(1)(
    Effect.gen(function* () {
      const file = yield* loadOrInitCassetteFile(store, name, request);
      const cassette = file.exports[exportKey] ?? (yield* createEmptyCassette());
      const key = yield* buildRequestKey(vcrRequest, {
        ignoreHeaders: config.matchIgnore?.requestHeaders,
        ignoreQueryParams: config.redact?.requestQueryParams,
        ignoreBodyKeys: config.matchIgnore?.requestBodyKeys,
      });
      const next: Cassette = {
        ...cassette,
        entries: {
          ...cassette.entries,
          [key]: {
            request: sanitizedRequest,
            response: sanitizedResponse,
          },
        },
      };
      const nextFile: CassetteFile = {
        ...file,
        exports: {
          ...file.exports,
          [exportKey]: next,
        },
      };
      yield* saveCassetteFile(store, name, nextFile, request);
    }),
  );
  return response;
});

/**
 * Build a VCR-aware HttpClient that replays or records per config.
 */
const makeVcrHttpClient = Effect.fnUntraced(function* (config: VcrConfig = {}) {
  const live = yield* HttpClient.HttpClient;
  const normalized = normalizeConfig(config);

  const isCi = yield* Config.Boolean("CI").pipe(Config.withDefault(false));

  const disabledVcrs = yield* AckDisableVcrConfig;
  if (shouldDisableVcr(normalized.vcrName, disabledVcrs)) {
    return live;
  }

  const store = yield* CassetteStore;
  const writeLock = yield* Semaphore.make(1);

  const { name, exportKey } = yield* resolveCassetteLocation(normalized);

  return live.pipe(
    HttpClient.transform(
      Effect.fnUntraced(function* (effect, request) {
        const vcrRequest = toVcrRequest(request);
        if (normalized.mode === "replay") {
          return yield* replay(store, request, vcrRequest, normalized, name, exportKey);
        }

        if (normalized.mode === "record") {
          return yield* record(
            writeLock,
            store,
            request,
            vcrRequest,
            effect,
            normalized,
            name,
            exportKey,
          );
        }

        const available = yield* store
          .exists(name)
          .pipe(Effect.mapError((error) => toRequestError(request, error)));

        if (!available) {
          if (isCi) {
            return yield* Effect.fail(
              new HttpClientError.HttpClientError({
                reason: new HttpClientError.TransportError({
                  request,
                  description: "VCR cassette missing in CI for auto mode",
                }),
              }),
            );
          }

          return yield* record(
            writeLock,
            store,
            request,
            vcrRequest,
            effect,
            normalized,
            name,
            exportKey,
          );
        }

        const cassette = yield* readCassetteExport(store, name, exportKey, request);
        const entry = yield* findEntry(vcrRequest, cassette, normalized);

        if (entry) {
          return replayResponse(request, entry);
        }

        return yield* record(
          writeLock,
          store,
          request,
          vcrRequest,
          effect,
          normalized,
          name,
          exportKey,
        );
      }),
    ),
  );
});

/**
 * Layer that provides a VCR-wrapped HttpClient.
 */
export const layer = (config: VcrConfig = {}) =>
  HttpClient.layerMergedContext(makeVcrHttpClient(config));

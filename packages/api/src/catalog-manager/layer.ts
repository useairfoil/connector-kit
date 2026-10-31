import { IcebergCatalog } from "@useairfoil/effect-iceberg";
import { ArrowFlightClient } from "@useairfoil/flight";
import { Config, Effect, Layer, Schema, Scope } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

import type { CatalogManagerOptions } from "./config";

import { make as makeIngestor } from "../ingestor/make";
import { CatalogManagerError } from "./error";
import { Catalog, type CreateCatalogRequest } from "./schema";
import { CatalogManager, type CatalogManagerService } from "./service";

const ErrorResponse = Schema.Struct({ error: Schema.String });

/** Creates a CatalogManager service from concrete configuration. */
export const make = Effect.fnUntraced(function* (
  config: CatalogManagerOptions,
): Effect.fn.Return<CatalogManagerService, never, HttpClient.HttpClient | Scope.Scope> {
  const baseUrl = config.baseUrl.replace(/\/+$/, "");
  const flightClient = yield* ArrowFlightClient.make({ host: baseUrl });

  const client = (yield* HttpClient.HttpClient).pipe(
    HttpClient.mapRequest(HttpClientRequest.prependUrl(baseUrl)),
    HttpClient.mapRequest(HttpClientRequest.acceptJson),
  );
  const catalogPath = (id: string) => `/catalogs/${encodeURIComponent(id)}`;

  const execute = (request: HttpClientRequest.HttpClientRequest) =>
    client.execute(request).pipe(
      Effect.mapError(
        (cause) => new CatalogManagerError({ message: "Catalog request failed", cause }),
      ),
      Effect.flatMap((response) => {
        if (response.status >= 200 && response.status < 300) return Effect.succeed(response);

        return HttpClientResponse.schemaBodyJson(ErrorResponse)(response).pipe(
          Effect.map((body) => body.error),
          Effect.catch(() => Effect.succeed(`Catalog request failed with HTTP ${response.status}`)),
          Effect.flatMap((message) =>
            Effect.fail(new CatalogManagerError({ message, status: response.status })),
          ),
        );
      }),
    );

  const decodeCatalog = (request: HttpClientRequest.HttpClientRequest) =>
    Effect.scoped(
      execute(request).pipe(
        Effect.flatMap(HttpClientResponse.schemaBodyJson(Catalog)),
        Effect.mapError((cause) =>
          cause instanceof CatalogManagerError
            ? cause
            : new CatalogManagerError({
                message: "Catalog response was not valid JSON",
                cause,
              }),
        ),
      ),
    );

  const getCatalog = (id: string) => decodeCatalog(HttpClientRequest.get(catalogPath(id)));

  return CatalogManager.of({
    ingestor: (options) => makeIngestor(flightClient, options),

    createCatalog: (request: CreateCatalogRequest) =>
      Effect.scoped(
        HttpClientRequest.post("/catalogs").pipe(
          HttpClientRequest.bodyJson(request),
          Effect.mapError(
            (cause) =>
              new CatalogManagerError({ message: "Failed to encode catalog request", cause }),
          ),
          Effect.flatMap(execute),
          Effect.asVoid,
        ),
      ),

    getCatalog,

    deleteCatalog: (id: string) =>
      Effect.scoped(execute(HttpClientRequest.delete(catalogPath(id))).pipe(Effect.as(undefined))),

    getIcebergCatalog: (id: string) =>
      getCatalog(id).pipe(
        Effect.map((catalog) =>
          IcebergCatalog.make({
            baseUrl: catalog.rest.uri,
            warehouse: catalog.rest.warehouse,
            fetch: (input, init) => {
              const headers = new Headers(init?.headers);
              for (const [key, value] of Object.entries(catalog.rest.properties ?? {})) {
                if (key.startsWith("header.")) headers.set(key.slice(7), value);
              }
              const token = catalog.rest.properties?.token;
              if (token !== undefined && !headers.has("Authorization")) {
                headers.set("Authorization", `Bearer ${token}`);
              }
              return fetch(input, { ...init, headers });
            },
          }),
        ),
      ),
  });
});

/** Creates a CatalogManager layer from concrete configuration. */
export const layer = (
  config: CatalogManagerOptions,
): Layer.Layer<CatalogManager, never, HttpClient.HttpClient> =>
  Layer.effect(CatalogManager)(make(config));

/** Creates a CatalogManager layer from Effect Config values. */
export const layerConfig = (
  config: Config.Wrap<CatalogManagerOptions>,
): Layer.Layer<CatalogManager, Config.ConfigError, HttpClient.HttpClient> =>
  Layer.effect(CatalogManager)(Config.unwrap(config).pipe(Effect.flatMap(make)));

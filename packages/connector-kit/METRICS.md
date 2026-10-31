# Connector Metrics And Status

Connector Kit emits standard metrics through Effect metrics. Production runtimes should use `Telemetry.layerOtlp()` with `OTEL_ENABLED=true`, `OTEL_EXPORTER_OTLP_ENDPOINT`, and optional `OTEL_EXPORTER_OTLP_HEADERS`. HTTP runtimes expose shallow process health at `GET /health`, Prometheus text at `GET /metrics`, and durable sync state at `GET /status`. Sandboxes can also merge `Telemetry.layerMetricsConsoleDump()` for periodic log output.

## Metrics

| OTLP name                                  | Prometheus name                            | Type            | Unit        |
| ------------------------------------------ | ------------------------------------------ | --------------- | ----------- |
| `airfoil.connector.batches`                | `airfoil_connector_batches`                | counter         | `{batch}`   |
| `airfoil.connector.rows.ingested`          | `airfoil_connector_rows_ingested`          | counter         | `{row}`     |
| `airfoil.connector.batch.size`             | `airfoil_connector_batch_size`             | histogram       | `{row}`     |
| `airfoil.connector.ingest.duration`        | `airfoil_connector_ingest_duration`        | histogram timer | `ms`        |
| `airfoil.connector.webhook.requests`       | `airfoil_connector_webhook_requests`       | counter         | `{request}` |
| `airfoil.connector.webhook.queue.depth`    | `airfoil_connector_webhook_queue_depth`    | gauge           | `{batch}`   |
| `airfoil.connector.sync.state`             | `airfoil_connector_sync_state`             | gauge           | `1`         |
| `airfoil.connector.last_success.timestamp` | `airfoil_connector_last_success_timestamp` | gauge           | `s`         |
| `airfoil.connector.api.retries`            | `airfoil_connector_api_retries`            | counter         | `{retry}`   |

OTLP attributes use dotted OTel names. Common dimensions are `airfoil.connector.name`, `airfoil.resource.name`, and `airfoil.resource.source`; specialized attributes are `airfoil.batch.outcome`, `airfoil.webhook.path`, `airfoil.webhook.outcome`, `airfoil.connector.sync.state`, and `airfoil.connector.api.retry.reason`. The Prometheus endpoint replaces dots in metric and label names with underscores and does not append `_total`.

Batch `source` is `backfill`, `changes`, `webhook`, or `demo`. Batch `outcome` is `success` or `error`. Webhook `outcome` is `ok`, `read_error`, `invalid_json`, `invalid_payload`, `rejected`, or `handler_error`. Sync `state` is `pending`, `backfilling`, `live`, or `error`.

API retry `reason` is `transport`, `timeout`, `rate_limit`, or `server_error`. The counter increments only when another request will be attempted. Provider-side limiter waits without a failed request are not retries.

Counters are activity since process start, not table population. Use `increase()` or `rate()` and let Prometheus/OTLP consumers handle process restarts.

The last-success gauge is restored from durable state after restart and is `0` until the source commits its first checkpoint. Calculate source freshness in Prometheus:

```promql
time() - airfoil_connector_last_success_timestamp
```

## Sync Status

HTTP connector runtimes expose `GET /status` by default. The response shape is decoded by `Status.StatusResponseSchema`:

```json
{
  "connector": "producer-example",
  "resources": [
    {
      "name": "products",
      "state": "live",
      "backfill": {
        "completed": true,
        "cutoff": "2026-01-01T00:00:00Z",
        "lastSuccessAt": "2026-01-01T00:05:00Z"
      },
      "changes": {
        "cursor": "2026-01-01T00:10:00Z",
        "lastSuccessAt": "2026-01-01T00:10:01Z"
      }
    }
  ]
}
```

`ResourceStatusSchema`, `ResourceErrorSchema`, and `StatusUnavailableResponseSchema` are also exported from `@useairfoil/connector-kit/status` with their derived TypeScript types.

A resource with no persisted state is `pending`; an incomplete backfill is `backfilling`; completed backfill or changes-only resources are `live`. `lastSuccessAt` advances in the same durable write as its checkpoint and only after Wings acknowledges the batch.

Backfill or changes failures set `error` with a structured `lastError`. The error includes `source`, `operation`, a stable `code` and SDK-owned `message`, plus `at`; it never contains the raw Effect cause. Backfill and changes errors are stored independently, and `/status` returns the newer outstanding error when both exist.

When an expected source failure reaches the ingestion engine after any dependency retries, that source is parked until the process restarts. Other resources, webhooks, and HTTP routes keep running. Defects and interruption still terminate the runtime. `GET /health` only proves that the HTTP process is serving requests; provider, Wings, or PostgreSQL failures are reported through status and metrics instead.

## Wings Contract

Import pure connector manifests from first-party producer packages, for example `@useairfoil/producer-polar/manifest`, through a registry. Use `Manifest.decodeConfig(manifest, input)` for canonical server-side validation and `Schema.toStandardSchemaV1(Manifest.configSchema(manifest))` for form resolvers. The schema accepts JSON-shaped config and browser form-shaped values, including stringified numbers/booleans and empty optional fields. Treat `field.required` and `field.default` independently: the canonical decoder treats an empty optional field as omitted and resolves its default, while an optional field without a default remains absent. Store user-facing connector config by manifest field `name`, then use `Manifest.toRuntimeDocument(...)` to map it to `field.runtimeKey` names. Hosted pods mount that complete JSON document read-only and point `AIRFOIL_CONFIG_PATH` at it; they do not receive one environment variable per user field. Secret rendering/redaction comes from `field.secret`, and existing secret values must not be returned to the browser. Platform-owned runtime config such as the engine URL, Iceberg catalog and tables, PostgreSQL bindings, webhook ports, and telemetry remains infrastructure-owned environment/Secret configuration outside the manifest document.

```ts
import * as Manifest from "@useairfoil/connector-kit/manifest";
import { manifest as polarManifest } from "@useairfoil/producer-polar/manifest";
import { Schema } from "effect";

const schema = Schema.toStandardSchemaV1(Manifest.configSchema(polarManifest));
const result = await schema["~standard"].validate(formValues);
```

Poll `GET /status` and decode with `Status.StatusResponseSchema`. Chart ingestion with `increase(airfoil_connector_rows_ingested[...])`, alert on `airfoil_connector_sync_state{airfoil_connector_sync_state="error"} == 1`, and alert on non-`ok` `airfoil_webhook_outcome` values.

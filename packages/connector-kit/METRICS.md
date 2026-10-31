# Connector Metrics And Status

Connector Kit emits standard metrics through Effect metrics.

## Configuration

### Production

Production runtimes should use `Telemetry.layerOtlp()` with `OTEL_ENABLED=true`, `OTEL_EXPORTER_OTLP_ENDPOINT`, and optional `OTEL_EXPORTER_OTLP_HEADERS`.

### Sandbox

Sandboxes can also merge `Telemetry.layerMetricsConsoleDump()` for periodic log output.

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

### Fields

**Batch**

- `source`: `backfill`, `changes`, `webhook`, or `demo`.
- `outcome`: `success` or `error`.

**Webhook**

- `outcome`: `ok`, `read_error`, `invalid_json`, `invalid_payload`, `rejected`, or `handler_error`.

**Sync**

- `state`: `pending`, `backfilling`, `live`, or `error`.

**API retry**

- `reason`: `transport`, `timeout`, `rate_limit`, or `server_error`.

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

For information about the shape of the response, look at `StatusResponseSchema` in
`@useairfoil/connector-kit/status`.

HTTP runtimes expose shallow process health at `GET /health`, Prometheus at `GET /metrics`, and durable sync state at `GET /status`.

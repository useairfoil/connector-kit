import { HashSet } from "effect";

/** Shared runtime keys owned by Airfoil rather than an individual connector. */
export const PlatformRuntimeKey = {
  configPath: "AIRFOIL_CONFIG_PATH",
  httpPort: "AIRFOIL_HTTP_PORT",
  tableBindings: "AIRFOIL_TABLE_BINDINGS",
  connectorInstanceId: "AIRFOIL_CONNECTOR_INSTANCE_ID",
  stateTable: "AIRFOIL_STATE_TABLE",
  postgresConnectionString: "POSTGRES_CONNECTION_STRING",
  engineUri: "ENGINE_URI",
  catalog: "AIRFOIL_CATALOG",
  otelEnabled: "OTEL_ENABLED",
  otelExporterOtlpEndpoint: "OTEL_EXPORTER_OTLP_ENDPOINT",
  otelExporterOtlpHeaders: "OTEL_EXPORTER_OTLP_HEADERS",
  otelServiceName: "OTEL_SERVICE_NAME",
  otelServiceVersion: "OTEL_SERVICE_VERSION",
  otelResourceAttributes: "OTEL_RESOURCE_ATTRIBUTES",
} as const;

/** Defaults for optional platform-owned runtime configuration. */
export const PlatformRuntimeDefault = {
  httpPort: 8080,
  stateTable: "_airfoil_connectors_state",
} as const;

const platformRuntimeKeys = HashSet.fromIterable(Object.values(PlatformRuntimeKey));

/** @internal */
export const isPlatformRuntimeKey = (key: string): boolean => HashSet.has(platformRuntimeKeys, key);

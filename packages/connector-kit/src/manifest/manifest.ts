import type { ConfigFieldSpec } from "./config";

export type ResourceCapability = "backfill" | "changes" | "webhook";

export type WebhookSetup = {
  readonly path: string;
  readonly requirement: "required" | "optional";
  readonly configFields: ReadonlyArray<string>;
  readonly events?: ReadonlyArray<{
    readonly resource: string;
    readonly types: ReadonlyArray<string>;
  }>;
  readonly documentationUrl?: string;
};

/** Browser-safe connector metadata consumed by the platform and runtime adapters. */
export type ConnectorManifest = {
  readonly name: string;
  readonly title: string;
  readonly description?: string;
  readonly config: ReadonlyArray<ConfigFieldSpec>;
  readonly webhook?: WebhookSetup;
  readonly resources: ReadonlyArray<{
    readonly name: string;
    readonly capabilities: ReadonlyArray<ResourceCapability>;
  }>;
};

/**
 * Defines browser-safe connector metadata while preserving literal names and capabilities.
 *
 * @example
 * ```ts
 * const manifest = define({
 *   name: "producer-example",
 *   title: "Example",
 *   config: ExampleConfig.spec,
 *   resources: [{ name: "orders", capabilities: ["backfill"] }],
 * });
 * ```
 */
export const define = <const Manifest extends ConnectorManifest>(manifest: Manifest): Manifest =>
  manifest;

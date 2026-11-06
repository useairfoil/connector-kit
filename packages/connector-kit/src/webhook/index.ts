import type { ResourceDefinition, WebhookRoute, WebhookRouteInput } from "../core/types";

export { router } from "./server";
export { verificationRouter } from "./verification";
export type { WebhookAckMode, WebhookRoute, WebhookRouteContext, WebhookRouteInput } from "./types";

export const route = <const Resources extends ReadonlyArray<ResourceDefinition>, Payload>(
  definition: WebhookRouteInput<Resources, Payload>,
): WebhookRoute<Resources, Payload> => definition;

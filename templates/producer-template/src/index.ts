declare const __COMMIT_SHA__: string | undefined;

export const commitSha = typeof __COMMIT_SHA__ === "undefined" ? undefined : __COMMIT_SHA__;

export * as TemplateApiClient from "./api";
export * as TemplateConnector from "./connector";
export { manifest } from "./manifest";
export type { Post, PostEvent, WebhookPayload } from "./schemas";
export { PostEventSchema, PostSchema, WebhookPayloadSchema } from "./schemas";

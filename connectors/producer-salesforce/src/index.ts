declare const __COMMIT_SHA__: string | undefined;

export const commitSha = typeof __COMMIT_SHA__ === "undefined" ? undefined : __COMMIT_SHA__;

export * as SalesforceClient from "./client/client";
export * as SalesforceConnector from "./connector";
export { manifest, objects } from "./manifest";
export type { ObjectSpec, SalesforceConfig } from "./manifest";
export { ObjectFieldSchema } from "./schemas/object-fields";
export type { ObjectField } from "./schemas/object-fields";
export { CustomObjectSchema, objectSchema } from "./schemas/objects";
export type { CustomObject, ObjectRow } from "./schemas/objects";

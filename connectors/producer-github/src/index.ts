declare const __COMMIT_SHA__: string | undefined;

export const commitSha = typeof __COMMIT_SHA__ === "undefined" ? undefined : __COMMIT_SHA__;

export * as GitHubAuth from "./client/auth";
export * as GitHubClient from "./client/client";
export * as GitHubConnector from "./connector";
export { manifest } from "./manifest";
export type { IssueComment } from "./schemas/issue-comments";
export { IssueCommentObjectSchema, IssueCommentSchema } from "./schemas/issue-comments";
export type { Issue } from "./schemas/issues";
export { IssueObjectSchema, IssueSchema } from "./schemas/issues";
export type { PullRequest } from "./schemas/pull-requests";
export { PullRequestObjectSchema, PullRequestSchema } from "./schemas/pull-requests";
export type { Repository } from "./schemas/repositories";
export { RepositoryObjectSchema, RepositorySchema } from "./schemas/repositories";
export { webhookPath } from "./webhook/route";

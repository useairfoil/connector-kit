import { Iceberg } from "@useairfoil/connector-kit";
import { Effect, Schema, Struct } from "effect";

import { Long, Text, Timestamp, deleted, optionalList, user, version } from "./shared";

export const RepositorySchema = Schema.Struct({
  id: Long.pipe(Schema.annotateKey({ description: "Unique repository ID." })),
  version: version("repository"),
  node_id: Schema.String.pipe(
    Schema.annotateKey({ description: "GraphQL node ID of the repository." }),
  ),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Repository name." })),
  full_name: Schema.String.pipe(
    Schema.annotateKey({ description: "Owner and name, such as octo-org/octo-repo." }),
  ),
  owner: user.pipe(Schema.annotateKey({ description: "Account that owns the repository." })),
  private: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the repository is private." }),
  ),
  visibility: Schema.optionalKey(Schema.String).pipe(
    Schema.annotateKey({ description: "Visibility: public, private, or internal." }),
  ),
  description: Text.pipe(
    Schema.annotateKey({ description: "Repository description. Empty when not set." }),
  ),
  fork: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the repository is a fork." }),
  ),
  archived: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the repository is archived." }),
  ),
  disabled: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the repository is disabled." }),
  ),
  default_branch: Schema.String.pipe(Schema.annotateKey({ description: "Default branch name." })),
  language: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Main language GitHub detected." }),
  ),
  topics: Schema.Array(Schema.String).pipe(
    Schema.annotateKey({ description: "Repository topics." }),
  ),
  html_url: Schema.String.pipe(Schema.annotateKey({ description: "Repository page on GitHub." })),
  created_at: Timestamp.pipe(
    Schema.annotateKey({ description: "Time the repository was created." }),
  ),
  _deleted: deleted("repository"),
})
  .annotate({
    description: "Repositories the GitHub App installation can read.",
  })
  .pipe(Iceberg.identifier("id"));

export type Repository = Schema.Schema.Type<typeof RepositorySchema>;

export const RepositoryObjectSchema = RepositorySchema.mapFields((fields) => ({
  ...Struct.omit(fields, ["version", "topics", "_deleted"]),
  updated_at: Timestamp,
  topics: optionalList(Schema.String),
}));

export type RepositoryObject = Schema.Schema.Type<typeof RepositoryObjectSchema>;

export const RepositoryRefSchema = Schema.Struct({
  id: Schema.Number,
  full_name: Schema.String,
  has_issues: Schema.Boolean,
  // GitHub documents it as optional, defaulting to true.
  has_pull_requests: Schema.Boolean.pipe(Schema.withDecodingDefaultKey(Effect.succeed(true))),
  // In KB. An empty repository has 0, and its git lists return 409.
  size: Schema.Number,
});

export type RepositoryRef = Schema.Schema.Type<typeof RepositoryRefSchema>;

import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, SchemaTransformation } from "effect";

import { Long, Timestamp, user } from "./shared";

export const gitActor = Schema.Struct({
  name: Schema.String.pipe(Schema.annotateKey({ description: "Name in the commit." })),
  date: Timestamp.pipe(Schema.annotateKey({ description: "Time in the commit." })),
});

/**
 * The GitHub account of a commit's author or committer. GitHub sends `null` or
 * `{}` when the email matches no account, and both become `null`.
 */
export const account = Schema.NullOr(Schema.Union([user, Schema.Struct({})])).pipe(
  Schema.decodeTo(
    Schema.NullOr(Schema.toType(user)),
    SchemaTransformation.transform({
      decode: (value) => (value !== null && "id" in value ? value : null),
      encode: (value) => value,
    }),
  ),
);

export const CommitSchema = Schema.Struct({
  key: Schema.String.pipe(
    Schema.annotateKey({ description: "Repository ID and SHA, such as `1406396726:9eb3a7d`." }),
  ),
  version: Schema.Date.pipe(
    Schema.annotateKey({ description: "Commit time. A commit never changes." }),
  ),
  repository_id: Long.pipe(
    Schema.annotateKey({ description: "ID of the repository the commit is in." }),
  ),
  sha: Schema.String.pipe(Schema.annotateKey({ description: "Commit SHA." })),
  node_id: Schema.String.pipe(
    Schema.annotateKey({ description: "GraphQL node ID of the commit." }),
  ),
  message: Schema.String.pipe(Schema.annotateKey({ description: "Commit message." })),
  author: gitActor.pipe(
    Schema.annotateKey({ description: "Author name and time from the commit." }),
  ),
  committer: gitActor.pipe(
    Schema.annotateKey({ description: "Committer name and time from the commit." }),
  ),
  author_user: account.pipe(Schema.annotateKey({ description: "GitHub account of the author." })),
  committer_user: account.pipe(
    Schema.annotateKey({ description: "GitHub account of the committer." }),
  ),
  parents: Schema.Array(Schema.String).pipe(
    Schema.annotateKey({ description: "SHAs of the parent commits." }),
  ),
  verified: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether GitHub verified the commit signature." }),
  ),
  html_url: Schema.String.pipe(Schema.annotateKey({ description: "Commit page on GitHub." })),
})
  .annotate({
    description: "Commits on the default branch of the installation's repositories.",
  })
  .pipe(Iceberg.identifier("key"));

export type Commit = Schema.Schema.Type<typeof CommitSchema>;

export const CommitObjectSchema = Schema.Struct({
  sha: Schema.String,
  node_id: Schema.String,
  commit: Schema.Struct({
    author: gitActor,
    committer: gitActor,
    message: Schema.String,
    verification: Schema.optionalKey(Schema.Struct({ verified: Schema.Boolean })),
  }),
  author: account,
  committer: account,
  parents: Schema.Array(Schema.Struct({ sha: Schema.String })),
  html_url: Schema.String,
});

export type CommitObject = Schema.Schema.Type<typeof CommitObjectSchema>;

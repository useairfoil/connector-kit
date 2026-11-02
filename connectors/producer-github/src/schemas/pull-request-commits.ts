import { Iceberg } from "@useairfoil/connector-kit";
import { Schema } from "effect";

import { account, gitActor } from "./commits";
import { Long } from "./shared";

export const PullRequestCommitSchema = Schema.Struct({
  key: Schema.String.pipe(
    Schema.annotateKey({
      description: "Repository ID, pull request number, and SHA, such as `1406396726:3:9eb3a7d`.",
    }),
  ),
  version: Schema.Date.pipe(
    Schema.annotateKey({ description: "Time GitHub last updated the pull request." }),
  ),
  repository_id: Long.pipe(
    Schema.annotateKey({ description: "ID of the repository the pull request belongs to." }),
  ),
  pull_request_number: Long.pipe(
    Schema.annotateKey({ description: "Pull request number in the repository." }),
  ),
  sha: Schema.String.pipe(Schema.annotateKey({ description: "Commit SHA." })),
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
  html_url: Schema.String.pipe(Schema.annotateKey({ description: "Commit page on GitHub." })),
})
  .annotate({
    description:
      "Commits in pull requests, up to 250 per pull request. Commits removed by a force push stay.",
  })
  .pipe(Iceberg.identifier("key"));

export type PullRequestCommit = Schema.Schema.Type<typeof PullRequestCommitSchema>;

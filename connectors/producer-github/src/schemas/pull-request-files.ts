import * as Iceberg from "@useairfoil/connector-kit/iceberg";
import { Schema, Struct } from "effect";

import { Long, version } from "./shared";

export const PullRequestFileSchema = Schema.Struct({
  key: Schema.String.pipe(
    Schema.annotateKey({ description: "File key for this pull request revision." }),
  ),
  version: version("pull request"),
  repository_id: Long.pipe(Schema.annotateKey({ description: "Repository ID." })),
  pull_request_number: Long.pipe(Schema.annotateKey({ description: "Pull request number." })),
  head_sha: Schema.String.pipe(
    Schema.annotateKey({ description: "Head commit of the file list." }),
  ),
  base_sha: Schema.String.pipe(
    Schema.annotateKey({ description: "Base commit of the file list." }),
  ),
  filename: Schema.String.pipe(Schema.annotateKey({ description: "File path in this revision." })),
  previous_filename: Schema.optionalKey(Schema.String).pipe(
    Schema.annotateKey({ description: "Previous path when the file was renamed." }),
  ),
  sha: Schema.String.pipe(Schema.annotateKey({ description: "Git blob SHA." })),
  status: Schema.String.pipe(Schema.annotateKey({ description: "How this file changed." })),
  additions: Long.pipe(Schema.annotateKey({ description: "Lines added." })),
  deletions: Long.pipe(Schema.annotateKey({ description: "Lines removed." })),
  changes: Long.pipe(Schema.annotateKey({ description: "Total lines changed." })),
  blob_url: Schema.String.pipe(
    Schema.annotateKey({ description: "GitHub URL for this revision." }),
  ),
})
  .annotate({ description: "Files changed in a pull request, by head and base revision." })
  .pipe(Iceberg.identifier("key"));

export type PullRequestFile = typeof PullRequestFileSchema.Type;
export const PullRequestFileObjectSchema = PullRequestFileSchema.mapFields(
  Struct.omit(["key", "version", "repository_id", "pull_request_number", "head_sha", "base_sha"]),
);

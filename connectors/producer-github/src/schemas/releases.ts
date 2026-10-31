import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { Long, Text, Timestamp, deleted, user, version } from "./shared";

const asset = Schema.Struct({
  id: Long.pipe(Schema.annotateKey({ description: "Asset ID." })),
  name: Schema.String.pipe(Schema.annotateKey({ description: "File name." })),
  label: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Label shown instead of the name." }),
  ),
  state: Schema.String.pipe(Schema.annotateKey({ description: "State: uploaded or open." })),
  content_type: Schema.String.pipe(Schema.annotateKey({ description: "Media type of the file." })),
  size: Long.pipe(Schema.annotateKey({ description: "Size in bytes." })),
  download_count: Long.pipe(
    Schema.annotateKey({ description: "Number of downloads when the release last changed." }),
  ),
  created_at: Timestamp.pipe(Schema.annotateKey({ description: "Time the asset was uploaded." })),
  updated_at: Timestamp.pipe(Schema.annotateKey({ description: "Time the asset last changed." })),
  browser_download_url: Schema.String.pipe(Schema.annotateKey({ description: "Download link." })),
});

export const ReleaseSchema = Schema.Struct({
  id: Long.pipe(Schema.annotateKey({ description: "Unique release ID." })),
  version: version("release"),
  node_id: Schema.String.pipe(
    Schema.annotateKey({ description: "GraphQL node ID of the release." }),
  ),
  repository_id: Long.pipe(
    Schema.annotateKey({ description: "ID of the repository the release belongs to." }),
  ),
  tag_name: Schema.String.pipe(Schema.annotateKey({ description: "Tag of the release." })),
  target_commitish: Schema.String.pipe(
    Schema.annotateKey({ description: "Branch or commit the tag was created from." }),
  ),
  name: Text.pipe(Schema.annotateKey({ description: "Release title. Empty when not set." })),
  body: Text.pipe(
    Schema.annotateKey({ description: "Release notes in Markdown. Empty when not set." }),
  ),
  draft: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the release is a draft." }),
  ),
  prerelease: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the release is a pre-release." }),
  ),
  author: user.pipe(Schema.annotateKey({ description: "Account that created the release." })),
  assets: Schema.Array(asset).pipe(
    Schema.annotateKey({ description: "Files attached to the release." }),
  ),
  created_at: Timestamp.pipe(Schema.annotateKey({ description: "Time the release was created." })),
  published_at: Schema.NullOr(Timestamp).pipe(
    Schema.annotateKey({ description: "Time the release was published." }),
  ),
  html_url: Schema.String.pipe(Schema.annotateKey({ description: "Release page on GitHub." })),
  _deleted: deleted("release"),
})
  .annotate({
    description: "Releases in the installation's repositories, with their assets.",
  })
  .pipe(Iceberg.identifier("id"));

export type Release = Schema.Schema.Type<typeof ReleaseSchema>;

export const ReleaseObjectSchema = ReleaseSchema.mapFields((fields) => ({
  ...Struct.omit(fields, ["version", "repository_id", "_deleted"]),
  // Not always set, according to the API schema.
  updated_at: Schema.optionalKey(Schema.NullOr(Timestamp)),
}));

export type ReleaseObject = Schema.Schema.Type<typeof ReleaseObjectSchema>;

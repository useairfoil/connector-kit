import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, SchemaTransformation, Struct } from "effect";

import { Long, OptionalRef, OptionalString, OptionalTimestamp, Ref, common } from "./shared";

export const ReleaseSchema = Schema.Struct({
  ...common("Release"),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Release name." })),
  description: OptionalString.pipe(Schema.annotateKey({ description: "Description." })),
  // `version` is the row version, so the release's own version is renamed.
  release_version: OptionalString.pipe(
    Schema.annotateKey({ description: "Version, such as 1.2.0." }),
  ),
  url: Schema.String.pipe(Schema.annotateKey({ description: "Release URL." })),
  commit_sha: OptionalString.pipe(Schema.annotateKey({ description: "Commit SHA." })),
  pipeline_id: Ref.pipe(Schema.annotateKey({ description: "Release pipeline." })),
  stage_id: Ref.pipe(Schema.annotateKey({ description: "Release stage." })),
  creator_id: OptionalRef.pipe(Schema.annotateKey({ description: "User who made the release." })),
  start_date: OptionalString.pipe(
    Schema.annotateKey({ description: "Start date, as YYYY-MM-DD." }),
  ),
  target_date: OptionalString.pipe(
    Schema.annotateKey({ description: "Target date, as YYYY-MM-DD." }),
  ),
  started_at: OptionalTimestamp.pipe(
    Schema.annotateKey({ description: "Time the release started." }),
  ),
  completed_at: OptionalTimestamp.pipe(
    Schema.annotateKey({ description: "Time the release was completed." }),
  ),
  canceled_at: OptionalTimestamp.pipe(
    Schema.annotateKey({ description: "Time the release was canceled." }),
  ),
  trashed: Schema.NullOr(Schema.Boolean).pipe(
    Schema.annotateKey({ description: "Whether the release is in the trash." }),
  ),
})
  .annotate({ description: "Linear releases. Needs the Business plan." })
  .pipe(Iceberg.identifier("id"));

export type Release = Schema.Schema.Type<typeof ReleaseSchema>;

export const ReleaseObjectSchema = ReleaseSchema.mapFields((fields) =>
  Struct.omit(fields, ["version"]),
);

export const ReleaseNoteSchema = Schema.Struct({
  ...common("Release note"),
  title: OptionalString.pipe(Schema.annotateKey({ description: "Release note title." })),
  content: Schema.NullOr(Schema.Struct({ content: OptionalString })).pipe(
    Schema.decodeTo(
      OptionalString,
      SchemaTransformation.transform({
        decode: (document) => document?.content ?? null,
        encode: (content) => (content === null ? null : { content }),
      }),
    ),
    Schema.annotateKey({ description: "Release note body in markdown." }),
  ),
  url: Schema.String.pipe(Schema.annotateKey({ description: "Release note URL." })),
  pipeline_id: Ref.pipe(Schema.annotateKey({ description: "Release pipeline." })),
  release_ids: Schema.Array(Ref).pipe(
    Schema.annotateKey({ description: "Releases covered by the note." }),
  ),
})
  .annotate({ description: "Linear release notes. Needs the Business plan." })
  .pipe(Iceberg.identifier("id"));

export type ReleaseNote = Schema.Schema.Type<typeof ReleaseNoteSchema>;

export const ReleaseNoteObjectSchema = ReleaseNoteSchema.mapFields((fields) =>
  Struct.omit(fields, ["version"]),
);

export const ReleasePipelineSchema = Schema.Struct({
  ...common("Pipeline"),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Pipeline name." })),
  type: Schema.String.pipe(Schema.annotateKey({ description: "Pipeline type." })),
  is_production: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether it releases to production." }),
  ),
  url: Schema.String.pipe(Schema.annotateKey({ description: "Pipeline URL." })),
  include_path_patterns: Schema.Array(Schema.String).pipe(
    Schema.annotateKey({ description: "File paths that count toward the pipeline." }),
  ),
  approximate_release_count: Long.pipe(
    Schema.annotateKey({ description: "About how many releases it has." }),
  ),
  trashed: Schema.NullOr(Schema.Boolean).pipe(
    Schema.annotateKey({ description: "Whether the pipeline is in the trash." }),
  ),
})
  .annotate({ description: "Linear release pipelines. Needs the Business plan." })
  .pipe(Iceberg.identifier("id"));

export type ReleasePipeline = Schema.Schema.Type<typeof ReleasePipelineSchema>;

export const ReleasePipelineObjectSchema = ReleasePipelineSchema.mapFields((fields) =>
  Struct.omit(fields, ["version"]),
);

export const ReleaseStageSchema = Schema.Struct({
  ...common("Stage"),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Stage name." })),
  type: Schema.String.pipe(Schema.annotateKey({ description: "Stage type." })),
  color: Schema.String.pipe(Schema.annotateKey({ description: "Color, as hex." })),
  position: Schema.Finite.pipe(Schema.annotateKey({ description: "Order in the pipeline." })),
  frozen: Schema.Boolean.pipe(Schema.annotateKey({ description: "Whether the stage is frozen." })),
  pipeline_id: Ref.pipe(Schema.annotateKey({ description: "Release pipeline." })),
})
  .annotate({ description: "Linear release stages. Needs the Business plan." })
  .pipe(Iceberg.identifier("id"));

export type ReleaseStage = Schema.Schema.Type<typeof ReleaseStageSchema>;

export const ReleaseStageObjectSchema = ReleaseStageSchema.mapFields((fields) =>
  Struct.omit(fields, ["version"]),
);

export const IssueToReleaseSchema = Schema.Struct({
  ...common("Link"),
  issue_id: Ref.pipe(Schema.annotateKey({ description: "Issue." })),
  release_id: Ref.pipe(Schema.annotateKey({ description: "Release." })),
})
  .annotate({ description: "Links between Linear issues and releases. Needs the Business plan." })
  .pipe(Iceberg.identifier("id"));

export type IssueToRelease = Schema.Schema.Type<typeof IssueToReleaseSchema>;

export const IssueToReleaseObjectSchema = IssueToReleaseSchema.mapFields((fields) =>
  Struct.omit(fields, ["version"]),
);

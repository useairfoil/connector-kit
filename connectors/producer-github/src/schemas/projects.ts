import * as Iceberg from "@useairfoil/connector-kit/iceberg";
import { Schema, Struct } from "effect";

import { Long, Timestamp, version } from "./shared";

const field = <S extends Schema.Top>(schema: S, description: string) =>
  schema.pipe(Schema.annotateKey({ description }));
const id = field(Long, "GitHub Projects ID.");
const created_at = field(Timestamp, "Time the record was created.");
const updated_at = field(Timestamp, "Time the record last changed.");
const project_id = field(Long, "Project ID.");
const nullableTime = Schema.NullOr(Timestamp);
// Shapes differ by field type, so they are stored as JSON text.
const json = Schema.flip(Schema.fromJsonString(Schema.Json));

export const ProjectSchema = Schema.Struct({
  id,
  version: version("project"),
  organization: field(Schema.String, "GitHub organization login."),
  number: field(Long, "Project number in its organization."),
  title: field(Schema.String, "Title in GitHub."),
  description: field(Schema.NullOr(Schema.String), "Project description."),
  public: field(Schema.Boolean, "Whether the project is public."),
  closed_at: field(nullableTime, "Time the project was closed."),
  deleted_at: field(nullableTime, "Time the project was deleted."),
  created_at,
  updated_at,
})
  .annotate({ description: "Projects in the GitHub App installation's organization." })
  .pipe(Iceberg.identifier("id"));

export type Project = typeof ProjectSchema.Type;
export const ProjectObjectSchema = ProjectSchema.mapFields(
  Struct.omit(["version", "organization"]),
);

export const ProjectFieldSchema = Schema.Struct({
  id,
  version: version("project field"),
  project_id,
  name: field(Schema.String, "Project field name."),
  data_type: field(Schema.String, "Type of value stored by this field."),
  options: field(Schema.optionalKey(json), "Single-select options as JSON."),
  configuration: field(Schema.optionalKey(json), "Iteration configuration as JSON."),
  created_at,
  updated_at,
})
  .annotate({ description: "Field definitions for organization projects." })
  .pipe(Iceberg.identifier("id"));

export type ProjectField = typeof ProjectFieldSchema.Type;
export const ProjectFieldObjectSchema = ProjectFieldSchema.mapFields(
  Struct.omit(["version", "project_id"]),
);

export const ProjectItemSchema = Schema.Struct({
  id,
  version: version("project item"),
  project_id,
  content_type: field(Schema.String, "Kind of item, such as Issue or PullRequest."),
  content: field(
    Schema.optionalKey(
      Schema.NullOr(
        Schema.Struct({
          id: field(Schema.optionalKey(Long), "Linked issue or pull request ID."),
          number: field(Schema.optionalKey(Long), "Issue or pull request number."),
          title: field(Schema.optionalKey(Schema.String), "Title of the linked record."),
        }),
      ),
    ),
    "Details of the linked record.",
  ),
  fields: field(Schema.optionalKey(json), "Project field values as JSON."),
  archived_at: field(nullableTime, "Time the item was archived."),
  created_at,
  updated_at,
})
  .annotate({ description: "Items and field values in organization projects." })
  .pipe(Iceberg.identifier("id"));

export type ProjectItem = typeof ProjectItemSchema.Type;
export const ProjectItemObjectSchema = ProjectItemSchema.mapFields(
  Struct.omit(["version", "project_id"]),
);

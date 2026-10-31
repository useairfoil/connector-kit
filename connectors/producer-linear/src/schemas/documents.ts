import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { OptionalRef, OptionalString, OptionalTimestamp, common, deleted } from "./shared";

export const DocumentSchema = Schema.Struct({
  ...common("Document"),
  _deleted: deleted("document"),
  title: Schema.String.pipe(Schema.annotateKey({ description: "Title." })),
  content: OptionalString.pipe(Schema.annotateKey({ description: "Content in markdown." })),
  url: Schema.String.pipe(Schema.annotateKey({ description: "Document URL." })),
  icon: OptionalString.pipe(Schema.annotateKey({ description: "Icon." })),
  color: OptionalString.pipe(Schema.annotateKey({ description: "Icon color." })),
  creator_id: OptionalRef.pipe(Schema.annotateKey({ description: "User who made the document." })),
  updated_by_id: OptionalRef.pipe(
    Schema.annotateKey({ description: "User who last changed the document." }),
  ),
  project_id: OptionalRef.pipe(Schema.annotateKey({ description: "Project the document is in." })),
  initiative_id: OptionalRef.pipe(
    Schema.annotateKey({ description: "Initiative the document is in." }),
  ),
  issue_id: OptionalRef.pipe(Schema.annotateKey({ description: "Issue the document is in." })),
  cycle_id: OptionalRef.pipe(Schema.annotateKey({ description: "Cycle the document is in." })),
  team_id: OptionalRef.pipe(Schema.annotateKey({ description: "Team the document is in." })),
  parent_document_id: OptionalRef.pipe(Schema.annotateKey({ description: "Parent document." })),
  hidden_at: OptionalTimestamp.pipe(
    Schema.annotateKey({ description: "Time the document was hidden." }),
  ),
  trashed: Schema.NullOr(Schema.Boolean).pipe(
    Schema.annotateKey({ description: "Whether the document is in the trash." }),
  ),
})
  .annotate({ description: "Linear documents, including archived and trashed ones." })
  .pipe(Iceberg.identifier("id"));

export type Document = Schema.Schema.Type<typeof DocumentSchema>;

export const DocumentObjectSchema = DocumentSchema.mapFields((fields) =>
  Struct.omit(fields, ["version", "_deleted"]),
);

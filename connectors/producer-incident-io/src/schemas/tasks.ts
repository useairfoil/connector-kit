import { Iceberg } from "@useairfoil/connector-kit";
import { Schema } from "effect";

import { ActorSchema, ExternalIssueSchema, Optional, Ref, Timestamp, common } from "./shared";

export const PostmortemDocumentSchema = Schema.Struct({
  ...common("Post-mortem document"),
  incident_id: Schema.String.pipe(Schema.annotateKey({ description: "Incident." })),
  title: Schema.String.pipe(Schema.annotateKey({ description: "Document title." })),
  status: Schema.String.pipe(
    Schema.annotateKey({ description: "in_progress, in_review, or completed." }),
  ),
  type: Schema.String.pipe(Schema.annotateKey({ description: "in_app or external." })),
  document_url: Schema.String.pipe(Schema.annotateKey({ description: "Document URL." })),
  exported_urls: Schema.Array(Schema.String).pipe(
    Schema.annotateKey({ description: "URLs of exported copies." }),
  ),
  editor_ids: Schema.Array(Schema.String).pipe(
    Schema.annotateKey({ description: "Users who edited it." }),
  ),
})
  .annotate({ description: "incident.io post-mortem documents, without their text." })
  .pipe(Iceberg.identifier("id"));

export type PostmortemDocument = Schema.Schema.Type<typeof PostmortemDocumentSchema>;

export const PostmortemDocumentObjectSchema = Schema.Struct({
  id: Schema.String,
  created_at: Timestamp,
  updated_at: Timestamp,
  incident_id: Schema.String,
  title: Schema.String,
  status: Schema.String,
  type: Schema.String,
  document_url: Schema.String,
  exported_urls: Schema.Array(Schema.String),
  editors: Schema.Array(Ref),
});

export type PostmortemDocumentObject = Schema.Schema.Type<typeof PostmortemDocumentObjectSchema>;

export const FollowUpSchema = Schema.Struct({
  ...common("Follow-up"),
  incident_id: Schema.String.pipe(Schema.annotateKey({ description: "Incident." })),
  title: Schema.String.pipe(Schema.annotateKey({ description: "Follow-up title." })),
  description: Optional(Schema.String).pipe(
    Schema.annotateKey({ description: "Description in markdown." }),
  ),
  status: Schema.String.pipe(
    Schema.annotateKey({ description: "outstanding, completed, deleted, or not_doing." }),
  ),
  assignee_id: Optional(Schema.String).pipe(Schema.annotateKey({ description: "Assigned user." })),
  assignee_team_id: Optional(Schema.String).pipe(
    Schema.annotateKey({ description: "Assigned team." }),
  ),
  category_id: Optional(Schema.String).pipe(Schema.annotateKey({ description: "Category." })),
  category_name: Optional(Schema.String).pipe(
    Schema.annotateKey({ description: "Category name." }),
  ),
  priority_id: Optional(Schema.String).pipe(Schema.annotateKey({ description: "Priority." })),
  priority_name: Optional(Schema.String).pipe(
    Schema.annotateKey({ description: "Priority name." }),
  ),
  labels: Schema.Array(Schema.String).pipe(Schema.annotateKey({ description: "Labels." })),
  completed_at: Optional(Timestamp).pipe(
    Schema.annotateKey({ description: "Time it was completed." }),
  ),
  creator_user_id: Optional(Schema.String).pipe(
    Schema.annotateKey({ description: "User who created it." }),
  ),
  external_issue_provider: Optional(Schema.String).pipe(
    Schema.annotateKey({ description: "Linked issue tracker." }),
  ),
  external_issue_name: Optional(Schema.String).pipe(
    Schema.annotateKey({ description: "Linked issue name." }),
  ),
  external_issue_permalink: Optional(Schema.String).pipe(
    Schema.annotateKey({ description: "Linked issue URL." }),
  ),
})
  .annotate({ description: "incident.io follow-ups: work to do after an incident." })
  .pipe(Iceberg.identifier("id"));

export type FollowUp = Schema.Schema.Type<typeof FollowUpSchema>;

const NamedRef = Schema.Struct({ id: Schema.String, name: Schema.String });

export const FollowUpObjectSchema = Schema.Struct({
  id: Schema.String,
  created_at: Timestamp,
  updated_at: Timestamp,
  incident_id: Schema.String,
  title: Schema.String,
  description: Optional(Schema.String),
  status: Schema.String,
  assignee: Optional(Ref),
  assignee_team: Optional(Ref),
  category: Optional(NamedRef),
  priority: Optional(NamedRef),
  labels: Schema.Array(Schema.String),
  completed_at: Optional(Timestamp),
  creator: ActorSchema,
  external_issue_reference: Optional(ExternalIssueSchema),
});

export type FollowUpObject = Schema.Schema.Type<typeof FollowUpObjectSchema>;

export const ActionSchema = Schema.Struct({
  ...common("Action"),
  incident_id: Schema.String.pipe(Schema.annotateKey({ description: "Incident." })),
  description: Schema.String.pipe(Schema.annotateKey({ description: "What needs doing." })),
  status: Schema.String.pipe(
    Schema.annotateKey({ description: "outstanding, completed, deleted, or not_doing." }),
  ),
  assignee_id: Optional(Schema.String).pipe(Schema.annotateKey({ description: "Assigned user." })),
  completed_at: Optional(Timestamp).pipe(
    Schema.annotateKey({ description: "Time it was completed." }),
  ),
  creator_user_id: Optional(Schema.String).pipe(
    Schema.annotateKey({ description: "User who created it." }),
  ),
})
  .annotate({ description: "incident.io actions: work done during an incident." })
  .pipe(Iceberg.identifier("id"));

export type Action = Schema.Schema.Type<typeof ActionSchema>;

export const ActionObjectSchema = Schema.Struct({
  id: Schema.String,
  created_at: Timestamp,
  updated_at: Timestamp,
  incident_id: Schema.String,
  description: Schema.String,
  status: Schema.String,
  assignee: Optional(Ref),
  completed_at: Optional(Timestamp),
  creator: ActorSchema,
});

export type ActionObject = Schema.Schema.Type<typeof ActionObjectSchema>;

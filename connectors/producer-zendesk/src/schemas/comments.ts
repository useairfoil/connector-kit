import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { Long, Timestamp } from "./shared";

export const TicketCommentSchema = Schema.Struct({
  id: Long.pipe(Schema.annotateKey({ description: "Comment ID." })),
  version: Schema.Date.pipe(
    Schema.annotateKey({ description: "Time of the ticket update that changed the comment last." }),
  ),
  ticket_id: Long.pipe(Schema.annotateKey({ description: "Ticket the comment is on." })),
  type: Schema.String.pipe(Schema.annotateKey({ description: "Comment or VoiceComment." })),
  author_id: Long.pipe(Schema.annotateKey({ description: "User who wrote the comment." })),
  public: Schema.Boolean.pipe(
    Schema.annotateKey({
      description: "Whether the requester can see it. False for internal notes.",
    }),
  ),
  created_at: Timestamp.pipe(Schema.annotateKey({ description: "Time the comment was added." })),
  via: Schema.Struct({
    channel: Schema.String.pipe(
      Schema.annotateKey({ description: "Channel, such as email, web, or api." }),
    ),
  }).pipe(Schema.annotateKey({ description: "How the comment was added." })),
  body: Schema.String.pipe(
    Schema.annotateKey({ description: "Comment text. Redacted parts are ▇." }),
  ),
  attachments: Schema.Array(
    Schema.Struct({
      id: Long.pipe(Schema.annotateKey({ description: "Attachment ID." })),
      file_name: Schema.String.pipe(Schema.annotateKey({ description: "File name." })),
      content_type: Schema.String.pipe(Schema.annotateKey({ description: "MIME type." })),
      size: Long.pipe(Schema.annotateKey({ description: "Size in bytes." })),
    }),
  ).pipe(Schema.annotateKey({ description: "Attached files. Only their details, not the files." })),
})
  .annotate({ description: "Comments and internal notes on Zendesk tickets." })
  .pipe(Iceberg.identifier("id"));

export type TicketComment = Schema.Schema.Type<typeof TicketCommentSchema>;

export const CommentObjectSchema = TicketCommentSchema.mapFields((fields) =>
  Struct.omit(fields, ["version", "ticket_id"]),
);

export type CommentObject = Schema.Schema.Type<typeof CommentObjectSchema>;

export const isCommentEvent = Schema.is(
  Schema.Struct({ event_type: Schema.Literals(["Comment", "VoiceComment"]) }),
);

export const isRedactionEvent = Schema.is(
  Schema.Struct({
    event_type: Schema.Literals(["CommentRedactionEvent", "AttachmentRedactionEvent"]),
  }),
);

export const TicketEventSchema = Schema.Struct({
  ticket_id: Long,
  created_at: Timestamp,
  child_events: Schema.Array(Schema.Unknown),
});

export type TicketEvent = Schema.Schema.Type<typeof TicketEventSchema>;

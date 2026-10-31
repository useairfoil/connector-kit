import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { Long, Timestamp, version } from "./shared";

export const SatisfactionRatingSchema = Schema.Struct({
  id: Long.pipe(Schema.annotateKey({ description: "Rating ID." })),
  version: version("rating"),
  created_at: Timestamp.pipe(Schema.annotateKey({ description: "Time the rating was given." })),
  updated_at: Timestamp.pipe(
    Schema.annotateKey({ description: "Time the rating was last updated." }),
  ),
  ticket_id: Schema.NullOr(Long).pipe(
    Schema.annotateKey({ description: "Ticket that was rated." }),
  ),
  requester_id: Long.pipe(Schema.annotateKey({ description: "User who rated." })),
  assignee_id: Schema.NullOr(Long).pipe(
    Schema.annotateKey({ description: "Agent on the ticket." }),
  ),
  group_id: Schema.NullOr(Long).pipe(Schema.annotateKey({ description: "Group of the ticket." })),
  score: Schema.String.pipe(
    Schema.annotateKey({ description: "offered, unoffered, good, or bad." }),
  ),
  comment: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Comment with the rating." }),
  ),
  reason: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Reason picked for a bad rating." }),
  ),
  reason_id: Schema.NullOr(Long).pipe(Schema.annotateKey({ description: "ID of the reason." })),
})
  .annotate({
    description:
      "Zendesk satisfaction ratings, from the legacy CSAT. A new score is a new row; the latest per ticket counts.",
  })
  .pipe(Iceberg.identifier("id"));

export type SatisfactionRating = Schema.Schema.Type<typeof SatisfactionRatingSchema>;

export const SatisfactionRatingObjectSchema = SatisfactionRatingSchema.mapFields((fields) => ({
  ...Struct.omit(fields, ["version", "reason", "reason_id"]),
  reason: Schema.optional(fields.reason),
  reason_id: Schema.optional(fields.reason_id),
}));

export type SatisfactionRatingObject = Schema.Schema.Type<typeof SatisfactionRatingObjectSchema>;

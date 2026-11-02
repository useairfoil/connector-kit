import { Iceberg } from "@useairfoil/connector-kit";
import { Effect, Schema, SchemaTransformation } from "effect";

// Keep backfills older than webhook updates.
const initialVersion = "1970-01-01T00:00:00.000Z";

/** Whole numbers stored as Iceberg longs. A key can't be a double. */
const Long = Schema.Int.pipe(
  Schema.decodeTo(
    Schema.BigInt,
    SchemaTransformation.transform({
      decode: (value) => BigInt(value),
      encode: (value) => Number(value),
    }),
  ),
);

export const PostSchema = Schema.Struct({
  id: Long.pipe(Schema.annotateKey({ description: "Post ID." })),
  userId: Long.pipe(Schema.annotateKey({ description: "Author ID." })),
  title: Schema.String.pipe(Schema.annotateKey({ description: "Post title." })),
  body: Schema.String.pipe(Schema.annotateKey({ description: "Post text." })),
  version: Schema.String.pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(initialVersion)),
    Schema.annotateKey({ description: "Time used to order post changes." }),
  ),
  // Rows say `false`, so a restored post comes back. Deletes send `true`.
  _deleted: Schema.Boolean.pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(false)),
    Schema.annotateKey({ description: "Whether the post was deleted." }),
  ),
})
  .annotate({ description: "Posts." })
  .pipe(Iceberg.identifier("id"));

export const PostEventSchema = Schema.Struct({
  type: Schema.Literals(["post.created", "post.updated"]),
  timestamp: Schema.String,
  data: PostSchema,
});

export const PostDeleteEventSchema = Schema.Struct({
  type: Schema.Literals(["post.deleted"]),
  timestamp: Schema.String,
  data: Schema.Struct({ id: Long }),
});

export const WebhookPayloadSchema = Schema.Union([PostEventSchema, PostDeleteEventSchema]);

export type Post = Schema.Schema.Type<typeof PostSchema>;
export type PostEvent = Schema.Schema.Type<typeof PostEventSchema>;
export type WebhookPayload = Schema.Schema.Type<typeof WebhookPayloadSchema>;

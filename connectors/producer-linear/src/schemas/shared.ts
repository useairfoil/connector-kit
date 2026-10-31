import { Schema, SchemaTransformation } from "effect";

export const Timestamp = Schema.DateFromString;

/** Decodes a GraphQL Int as bigint for an Iceberg long. */
export const Long = Schema.Int.pipe(
  Schema.decodeTo(
    Schema.BigInt,
    SchemaTransformation.transform({
      decode: (value) => BigInt(value),
      encode: (value) => Number(value),
    }),
  ),
);

/** Decodes a linked object such as `assignee { id }` as its ID. */
export const Ref = Schema.Struct({ id: Schema.String }).pipe(
  Schema.decodeTo(
    Schema.String,
    SchemaTransformation.transform({
      decode: (ref) => ref.id,
      encode: (id) => ({ id }),
    }),
  ),
);

export const OptionalRef = Schema.NullOr(Ref);

export const OptionalTimestamp = Schema.NullOr(Timestamp);

export const OptionalString = Schema.NullOr(Schema.String);

const RefConnection = Schema.Struct({ nodes: Schema.Array(Schema.Struct({ id: Schema.String })) });

/** Decodes connection nodes as IDs. The query must fetch any extra pages. */
export const RefList = RefConnection.pipe(
  Schema.decodeTo(
    Schema.Array(Schema.String),
    SchemaTransformation.transform<ReadonlyArray<string>, typeof RefConnection.Type>({
      decode: (connection) => connection.nodes.map((node) => node.id),
      encode: (ids) => ({ nodes: ids.map((id) => ({ id })) }),
    }),
  ),
);

/** Rows use updated_at as version; lifecycle webhooks use the webhook time. */
export const common = (object: string) => ({
  id: Schema.String.pipe(Schema.annotateKey({ description: `${object} ID.` })),
  version: Schema.Date.pipe(
    Schema.annotateKey({ description: `Time Linear last changed the ${object.toLowerCase()}.` }),
  ),
  created_at: Timestamp.pipe(
    Schema.annotateKey({ description: `Time the ${object.toLowerCase()} was created.` }),
  ),
  updated_at: Timestamp.pipe(
    Schema.annotateKey({ description: `Time the ${object.toLowerCase()} was last updated.` }),
  ),
  archived_at: Schema.NullOr(Timestamp).pipe(
    Schema.annotateKey({
      description: `Time the ${object.toLowerCase()} was archived or trashed.`,
    }),
  ),
});

export const deleted = (object: string) =>
  Schema.optional(Schema.Boolean).pipe(
    Schema.annotateKey({ description: `Whether the ${object} was deleted in Linear.` }),
  );

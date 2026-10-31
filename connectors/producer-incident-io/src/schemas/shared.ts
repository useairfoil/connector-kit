import { Schema, SchemaTransformation } from "effect";

export const Long = Schema.Int.pipe(
  Schema.decodeTo(
    Schema.BigInt,
    SchemaTransformation.transform({
      decode: (value) => BigInt(value),
      encode: (value) => Number(value),
    }),
  ),
);

export const Timestamp = Schema.DateFromString;

/** The API leaves out or nulls fields it has no value for. */
export const Optional = <S extends Schema.Top>(schema: S) => Schema.optional(Schema.NullOr(schema));

/** Deep config, such as workflow steps, kept as JSON text. Null stays null. */
export const Json = Schema.Unknown.pipe(
  Schema.decodeTo(
    Schema.NullOr(Schema.String),
    SchemaTransformation.transform<string | null, unknown>({
      decode: (value) => (value === null || value === undefined ? null : JSON.stringify(value)),
      encode: (text) => (text === null ? null : JSON.parse(text)),
    }),
  ),
);

/** Rows with `updated_at` use it as the version. */
export const common = (object: string) => ({
  id: Schema.String.pipe(Schema.annotateKey({ description: `${object} ID.` })),
  version: Schema.Date.pipe(
    Schema.annotateKey({
      description: `Time incident.io last updated the ${object.toLowerCase()}.`,
    }),
  ),
  created_at: Timestamp.pipe(
    Schema.annotateKey({ description: `Time the ${object.toLowerCase()} was created.` }),
  ),
  updated_at: Timestamp.pipe(
    Schema.annotateKey({ description: `Time the ${object.toLowerCase()} was last updated.` }),
  ),
});

/** Rows without `updated_at` use the time we read them. */
export const fetchedVersion = Schema.Date.pipe(
  Schema.annotateKey({ description: "Time the connector read the row." }),
);

export const fetched = (object: string) => ({
  id: Schema.String.pipe(Schema.annotateKey({ description: `${object} ID.` })),
  version: fetchedVersion,
});

export const Ref = Schema.Struct({ id: Schema.String });

export const Named = Schema.Struct({ id: Schema.String, name: Schema.String });

/** Who did something: a user, API key, workflow, or alert. */
export const ActorSchema = Schema.Struct({
  user: Optional(Ref),
  api_key: Optional(Ref),
  workflow: Optional(Ref),
  alert: Optional(Ref),
});

export const ExternalIssueSchema = Schema.Struct({
  provider: Schema.String,
  issue_name: Schema.String,
  issue_permalink: Schema.String,
});

export const PaginationMetaSchema = Schema.Struct({ after: Optional(Schema.String) });

/**
 * What the webhook route passes to a resource. Every event reads the record
 * again, so only the ID matters. `time` is the verified `webhook-timestamp`.
 */
export const WebhookTargetSchema = Schema.Struct({
  event: Schema.String,
  id: Schema.String,
  time: Schema.Date,
});

export type WebhookTarget = Schema.Schema.Type<typeof WebhookTargetSchema>;

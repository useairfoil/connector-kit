import { Schema, SchemaTransformation } from "effect";

/** IDs and counts. Connector Kit maps whole numbers to Iceberg longs. */
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

/** Text GitHub can clear, such as a body. */
export const Text = Schema.NullOr(Schema.String).pipe(
  Schema.decodeTo(
    Schema.String,
    SchemaTransformation.transform({
      decode: (value) => value ?? "",
      encode: (value) => value,
    }),
  ),
);

/** `null` becomes an empty list. A webhook can leave the list out. */
export const optionalList = <S extends Schema.Top>(item: S) =>
  Schema.optionalKey(
    Schema.NullOr(Schema.Array(item)).pipe(
      Schema.decodeTo(
        Schema.Array(Schema.toType(item)),
        SchemaTransformation.transform({
          decode: (value) => value ?? [],
          encode: (value) => value,
        }),
      ),
    ),
  );

export const user = Schema.Struct({
  id: Long.pipe(Schema.annotateKey({ description: "GitHub user ID." })),
  login: Schema.String.pipe(Schema.annotateKey({ description: "GitHub username." })),
  type: Schema.String.pipe(
    Schema.annotateKey({ description: "Account type, such as User, Bot, or Organization." }),
  ),
});

export const label = Schema.Struct({
  id: Long.pipe(Schema.annotateKey({ description: "Label ID." })),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Label name." })),
});

export const milestone = Schema.Struct({
  id: Long.pipe(Schema.annotateKey({ description: "Milestone ID." })),
  number: Long.pipe(Schema.annotateKey({ description: "Milestone number in the repository." })),
  title: Schema.String.pipe(Schema.annotateKey({ description: "Milestone title." })),
});

export const version = (object: string) =>
  Schema.Date.pipe(Schema.annotateKey({ description: `Time GitHub last updated the ${object}.` }));

/** For objects without an update time. A newer read wins. */
export const readVersion = (object: string) =>
  Schema.Date.pipe(
    Schema.annotateKey({
      description: `Time the connector read the ${object}. GitHub has no update time for it.`,
    }),
  );

export const deleted = (object: string) =>
  Schema.optional(Schema.Boolean).pipe(
    Schema.annotateKey({ description: `Whether the ${object} was deleted in GitHub.` }),
  );

export const ObjectRefSchema = Schema.Struct({ id: Long });

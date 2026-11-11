import { Schema } from "effect";

import { Long, RecordId, Timestamp } from "./shared";

export const PagingSchema = Schema.optional(
  Schema.Struct({ next: Schema.Struct({ after: Schema.String }) }),
);

export const listPage = <S extends Schema.Top>(item: S) =>
  Schema.Struct({ results: Schema.Array(item), paging: PagingSchema });

/**
 * Property values are strings. An empty one comes back as `null`, and an
 * unknown one is left out.
 */
export const PropertyValuesSchema = Schema.Record(Schema.String, Schema.NullOr(Schema.String));

export const CrmObjectSchema = Schema.Struct({
  id: Schema.String,
  properties: PropertyValuesSchema,
  createdAt: Timestamp,
  updatedAt: Timestamp,
});

export type CrmObject = Schema.Schema.Type<typeof CrmObjectSchema>;

export const ArchivedObjectSchema = Schema.Struct({ id: Schema.String, archivedAt: Timestamp });

/** Rows that can't be read, such as deleted IDs, are left out of `results`. */
export const BatchReadSchema = Schema.Struct({ results: Schema.Array(CrmObjectSchema) });

export const SearchPageSchema = Schema.Struct({
  results: Schema.Array(Schema.Struct({ id: Schema.String, properties: PropertyValuesSchema })),
  paging: PagingSchema,
});

export const PropertyListSchema = Schema.Struct({
  results: Schema.Array(Schema.Struct({ name: Schema.String })),
});

export const AssociationBatchSchema = Schema.Struct({
  results: Schema.Array(
    Schema.Struct({
      from: Schema.Struct({ id: RecordId }),
      to: Schema.Array(
        Schema.Struct({
          toObjectId: RecordId,
          associationTypes: Schema.optionalKey(
            Schema.Array(
              Schema.Struct({
                category: Schema.String,
                typeId: Long,
                label: Schema.NullOr(Schema.String),
              }),
            ),
          ),
        }),
      ),
      paging: PagingSchema,
    }),
  ),
});

export type AssociationTarget = (typeof AssociationBatchSchema.Type.results)[number]["to"][number];

export const AccountSchema = Schema.Struct({ portalId: Schema.Number });

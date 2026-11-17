import { Iceberg } from "@useairfoil/connector-kit";
import { Schema } from "effect";

import { Long, Timestamp, version } from "./shared";

export const ListSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "List ID." })),
  version,
  name: Schema.String.pipe(Schema.annotateKey({ description: "List name." })),
  object_type_id: Schema.String.pipe(
    Schema.annotateKey({ description: "Type of the records in the list, such as `0-1`." }),
  ),
  processing_type: Schema.String.pipe(
    Schema.annotateKey({
      description: "MANUAL, DYNAMIC (filters), or SNAPSHOT (filters run once).",
    }),
  ),
  processing_status: Schema.String.pipe(
    Schema.annotateKey({ description: "Whether HubSpot is still filling the list." }),
  ),
  size: Schema.optional(Long).pipe(
    Schema.annotateKey({ description: "Number of records in the list." }),
  ),
  created_at: Schema.optional(Schema.Date).pipe(
    Schema.annotateKey({ description: "Time the list was created." }),
  ),
  updated_at: Schema.optional(Schema.Date).pipe(
    Schema.annotateKey({ description: "Time the list last changed." }),
  ),
  filters_updated_at: Schema.optional(Schema.Date).pipe(
    Schema.annotateKey({ description: "Time the list filters last changed." }),
  ),
})
  .annotate({ description: "HubSpot lists (segments), without their members." })
  .pipe(Iceberg.identifier("id"));

export type List = Schema.Schema.Type<typeof ListSchema>;

export const ListObjectSchema = Schema.Struct({
  listId: Schema.String,
  name: Schema.String,
  objectTypeId: Schema.String,
  processingType: Schema.String,
  processingStatus: Schema.String,
  createdAt: Schema.optional(Timestamp),
  updatedAt: Schema.optional(Timestamp),
  filtersUpdatedAt: Schema.optional(Timestamp),
  additionalProperties: Schema.Struct({
    hs_list_size: Schema.optional(Schema.NumberFromString.pipe(Schema.decodeTo(Long))),
  }),
});

export type ListObject = Schema.Schema.Type<typeof ListObjectSchema>;

export const SegmentMembershipSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "List ID." })),
  version,
  object_type_id: Schema.String.pipe(
    Schema.annotateKey({ description: "Type of the records in the list, such as `0-1`." }),
  ),
  filter: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "List filter tree as JSON. Manual lists have none." }),
  ),
  members: Schema.Array(
    Schema.Struct({
      record_id: Schema.String.pipe(
        Schema.annotateKey({ description: "ID of the member record." }),
      ),
      membership_timestamp: Schema.optional(Schema.Date).pipe(
        Schema.annotateKey({ description: "Time the record joined the list." }),
      ),
    }),
  ).pipe(Schema.annotateKey({ description: "Current members of the list." })),
})
  .annotate({ description: "List filters and current members." })
  .pipe(Iceberg.identifier("id"));

export type SegmentMembership = Schema.Schema.Type<typeof SegmentMembershipSchema>;

export const ListFiltersObjectSchema = Schema.Struct({
  list: Schema.Struct({
    filterBranch: Schema.optional(Schema.NullOr(Schema.flip(Schema.fromJsonString(Schema.Json)))),
  }),
});

export const ListMemberObjectSchema = Schema.Struct({
  recordId: Schema.String,
  membershipTimestamp: Schema.optional(Timestamp),
});

import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { Long, OptionalRef, OptionalString, Ref, common, deleted } from "./shared";

export const CustomerSchema = Schema.Struct({
  ...common("Customer"),
  _deleted: deleted("customer"),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Customer name." })),
  domains: Schema.Array(Schema.String).pipe(
    Schema.annotateKey({ description: "Email domains of the customer." }),
  ),
  external_ids: Schema.Array(Schema.String).pipe(
    Schema.annotateKey({ description: "IDs in other systems." }),
  ),
  logo_url: OptionalString.pipe(Schema.annotateKey({ description: "Logo URL." })),
  owner_id: OptionalRef.pipe(Schema.annotateKey({ description: "User who owns the customer." })),
  status_id: Ref.pipe(Schema.annotateKey({ description: "Customer status." })),
  tier_id: OptionalRef.pipe(Schema.annotateKey({ description: "Customer tier." })),
  revenue: Schema.NullOr(Long).pipe(Schema.annotateKey({ description: "Annual revenue." })),
  size: Schema.NullOr(Schema.Finite).pipe(Schema.annotateKey({ description: "Company size." })),
  approximate_need_count: Schema.Finite.pipe(
    Schema.annotateKey({ description: "About how many requests it has." }),
  ),
  url: Schema.String.pipe(Schema.annotateKey({ description: "Customer URL." })),
})
  .annotate({ description: "Linear customers." })
  .pipe(Iceberg.identifier("id"));

export type Customer = Schema.Schema.Type<typeof CustomerSchema>;

export const CustomerObjectSchema = CustomerSchema.mapFields((fields) =>
  Struct.omit(fields, ["version", "_deleted"]),
);

export const CustomerNeedSchema = Schema.Struct({
  ...common("Request"),
  _deleted: deleted("request"),
  customer_id: OptionalRef.pipe(Schema.annotateKey({ description: "Customer." })),
  issue_id: OptionalRef.pipe(
    Schema.annotateKey({ description: "Issue the request is linked to." }),
  ),
  project_id: OptionalRef.pipe(
    Schema.annotateKey({ description: "Project the request is linked to." }),
  ),
  original_issue_id: OptionalRef.pipe(
    Schema.annotateKey({ description: "Issue the request was first linked to." }),
  ),
  comment_id: OptionalRef.pipe(
    Schema.annotateKey({ description: "Comment the request came from." }),
  ),
  attachment_id: OptionalRef.pipe(
    Schema.annotateKey({ description: "Attachment the request came from." }),
  ),
  creator_id: OptionalRef.pipe(Schema.annotateKey({ description: "User who added the request." })),
  body: OptionalString.pipe(Schema.annotateKey({ description: "Request text in markdown." })),
  priority: Schema.Finite.pipe(Schema.annotateKey({ description: "0 normal, 1 important." })),
  url: OptionalString.pipe(Schema.annotateKey({ description: "Source URL." })),
})
  .annotate({ description: "Linear customer requests, linked to issues or projects." })
  .pipe(Iceberg.identifier("id"));

export type CustomerNeed = Schema.Schema.Type<typeof CustomerNeedSchema>;

export const CustomerNeedObjectSchema = CustomerNeedSchema.mapFields((fields) =>
  Struct.omit(fields, ["version", "_deleted"]),
);

const levelFields = (object: string) => ({
  ...common(object),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Name." })),
  display_name: Schema.String.pipe(Schema.annotateKey({ description: "Name shown in Linear." })),
  description: OptionalString.pipe(Schema.annotateKey({ description: "Description." })),
  color: Schema.String.pipe(Schema.annotateKey({ description: "Color, as hex." })),
  position: Schema.Finite.pipe(Schema.annotateKey({ description: "Order in the list." })),
});

export const CustomerStatusSchema = Schema.Struct(levelFields("Status"))
  .annotate({ description: "Linear customer statuses. Names the IDs in `customers.status_id`." })
  .pipe(Iceberg.identifier("id"));

export type CustomerStatus = Schema.Schema.Type<typeof CustomerStatusSchema>;

export const CustomerStatusObjectSchema = CustomerStatusSchema.mapFields((fields) =>
  Struct.omit(fields, ["version"]),
);

export const CustomerTierSchema = Schema.Struct(levelFields("Tier"))
  .annotate({ description: "Linear customer tiers. Names the IDs in `customers.tier_id`." })
  .pipe(Iceberg.identifier("id"));

export type CustomerTier = Schema.Schema.Type<typeof CustomerTierSchema>;

export const CustomerTierObjectSchema = CustomerTierSchema.mapFields((fields) =>
  Struct.omit(fields, ["version"]),
);

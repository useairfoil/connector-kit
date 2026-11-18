import * as Iceberg from "@useairfoil/connector-kit/iceberg";
import { Schema } from "effect";

import { version } from "./shared";

const LinksSchema = Schema.Struct({
  id: Schema.String.pipe(
    Schema.annotateKey({ description: "Object type and record ID, such as `quotes:123`." }),
  ),
  version,
  object_type: Schema.String.pipe(Schema.annotateKey({ description: "Source object type." })),
  object_id: Schema.String.pipe(Schema.annotateKey({ description: "Source record ID." })),
  links: Schema.Array(
    Schema.Struct({
      object_type: Schema.String.pipe(Schema.annotateKey({ description: "Linked object type." })),
      object_id: Schema.String.pipe(Schema.annotateKey({ description: "Linked record ID." })),
      labels: Schema.Array(
        Schema.Struct({
          type_id: Schema.BigInt.pipe(
            Schema.annotateKey({ description: "HubSpot association type ID." }),
          ),
          category: Schema.String.pipe(
            Schema.annotateKey({ description: "Who defined the association type." }),
          ),
          label: Schema.NullOr(Schema.String).pipe(
            Schema.annotateKey({ description: "Label on this link, if one is set." }),
          ),
        }),
      ).pipe(Schema.annotateKey({ description: "Association types and labels on this link." })),
    }),
  ).pipe(Schema.annotateKey({ description: "Every linked record of the read object types." })),
});

export const CommerceLinkSchema = LinksSchema.annotate({
  description:
    "Links from quotes, orders, invoices, and subscriptions to line items, and from payments to orders and invoices.",
}).pipe(Iceberg.identifier("id"));
export type CommerceLink = Schema.Schema.Type<typeof CommerceLinkSchema>;

export const PeerLinkSchema = LinksSchema.annotate({
  description: "Links between companies and between contacts.",
}).pipe(Iceberg.identifier("id"));
export type PeerLink = Schema.Schema.Type<typeof PeerLinkSchema>;

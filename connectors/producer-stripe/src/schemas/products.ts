import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { Metadata, UnixTime, deleted, version } from "./shared";

export const ProductSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Unique product identifier." })),
  version,
  created: UnixTime.pipe(Schema.annotateKey({ description: "Time when the product was created." })),
  updated: UnixTime.pipe(
    Schema.annotateKey({
      description: "Time when the product was last changed, in whole seconds.",
    }),
  ),
  livemode: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the product exists in live mode." }),
  ),
  active: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the product can be bought. False when archived." }),
  ),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Product name." })),
  description: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Product description." }),
  ),
  default_price: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Default price of the product." }),
  ),
  tax_code: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Tax code of the product." }),
  ),
  unit_label: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Label for units on receipts." }),
  ),
  url: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Public web page of the product." }),
  ),
  shippable: Schema.NullOr(Schema.Boolean).pipe(
    Schema.annotateKey({ description: "Whether the product is shipped as physical goods." }),
  ),
  statement_descriptor: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Text shown on card statements for subscription payments." }),
  ),
  metadata: Metadata.pipe(
    Schema.annotateKey({ description: "Key-value pairs set on the product." }),
  ),
  _deleted: deleted,
})
  .annotate({
    description: "Products in a Stripe account, including archived ones.",
  })
  .pipe(Iceberg.identifier("id"));

export type Product = Schema.Schema.Type<typeof ProductSchema>;

export const ProductObjectSchema = ProductSchema.mapFields(Struct.omit(["version", "_deleted"]));

export type ProductObject = Schema.Schema.Type<typeof ProductObjectSchema>;

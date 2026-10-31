import { Iceberg } from "@useairfoil/connector-kit";
import * as Schema from "effect/Schema";

export const ProductStatusSchema = Schema.Literals(["ACTIVE", "ARCHIVED", "DRAFT", "UNLISTED"]);

export const ProductVariantInventoryPolicySchema = Schema.Literals(["CONTINUE", "DENY"]);

const ProductImageSchema = Schema.Struct({
  url: Schema.String.pipe(Schema.annotateKey({ description: "URL of the image." })),
  altText: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Alternative text for the image." }),
  ),
});

export const ProductFeaturedMediaSchema = Schema.Struct({
  image: Schema.NullOr(ProductImageSchema).pipe(
    Schema.annotateKey({ description: "Image for the featured media." }),
  ),
});

export const ProductOptionSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Unique product option identifier." })),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Name of the product option." })),
  position: Schema.Int.pipe(
    Schema.annotateKey({ description: "Position of the option on the product." }),
  ),
  values: Schema.Array(Schema.String).pipe(
    Schema.annotateKey({ description: "Values available for the option." }),
  ),
});

export const ProductVariantSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Unique product variant identifier." })),
  legacyResourceId: Schema.String.pipe(
    Schema.annotateKey({ description: "Numeric variant identifier stored as text." }),
  ),
  title: Schema.String.pipe(Schema.annotateKey({ description: "Display title of the variant." })),
  sku: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Stock keeping unit for the variant." }),
  ),
  barcode: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Barcode for the variant." }),
  ),
  price: Schema.String.pipe(Schema.annotateKey({ description: "Price of the variant." })),
  compareAtPrice: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Original price used for comparison." }),
  ),
  inventoryPolicy: ProductVariantInventoryPolicySchema.pipe(
    Schema.annotateKey({ description: "Behavior when the variant is out of stock." }),
  ),
  taxable: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the variant is taxable." }),
  ),
  createdAt: Schema.Date.pipe(
    Schema.annotateKey({ description: "Time when the variant was created." }),
  ),
  updatedAt: Schema.Date.pipe(
    Schema.annotateKey({ description: "Time when the variant was last changed." }),
  ),
});

export const ProductSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Unique product identifier." })),
  legacyResourceId: Schema.String.pipe(
    Schema.annotateKey({ description: "Numeric product identifier stored as text." }),
  ),
  title: Schema.String.pipe(Schema.annotateKey({ description: "Title of the product." })),
  handle: Schema.String.pipe(Schema.annotateKey({ description: "URL handle for the product." })),
  descriptionHtml: Schema.String.pipe(
    Schema.annotateKey({ description: "Product description as HTML." }),
  ),
  productType: Schema.String.pipe(
    Schema.annotateKey({ description: "Merchant-defined product type." }),
  ),
  vendor: Schema.String.pipe(Schema.annotateKey({ description: "Vendor of the product." })),
  status: ProductStatusSchema.pipe(Schema.annotateKey({ description: "Current product status." })),
  tags: Schema.Array(Schema.String).pipe(
    Schema.annotateKey({ description: "Tags added to the product." }),
  ),
  createdAt: Schema.Date.pipe(
    Schema.annotateKey({ description: "Time when the product was created." }),
  ),
  updatedAt: Schema.Date.pipe(
    Schema.annotateKey({ description: "Time when the product was last changed." }),
  ),
  publishedAt: Schema.NullOr(Schema.Date).pipe(
    Schema.annotateKey({ description: "Time when the product was published." }),
  ),
  templateSuffix: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Theme template suffix used by the product." }),
  ),
  featuredMedia: Schema.NullOr(ProductFeaturedMediaSchema).pipe(
    Schema.annotateKey({ description: "Featured media for the product." }),
  ),
  options: Schema.Array(ProductOptionSchema).pipe(
    Schema.annotateKey({ description: "Options for the product." }),
  ),
  variants: Schema.Array(ProductVariantSchema).pipe(
    Schema.annotateKey({ description: "Variants of the product." }),
  ),
  _deleted: Schema.optional(Schema.Boolean).pipe(
    Schema.annotateKey({ description: "Whether the product was deleted." }),
  ),
})
  .annotate({
    description: "Products in a Shopify store.",
  })
  .pipe(Iceberg.identifier("id"));

export type ProductStatus = Schema.Schema.Type<typeof ProductStatusSchema>;

export type ProductVariantInventoryPolicy = Schema.Schema.Type<
  typeof ProductVariantInventoryPolicySchema
>;

export type ProductFeaturedMedia = Schema.Schema.Type<typeof ProductFeaturedMediaSchema>;

export type ProductOption = Schema.Schema.Type<typeof ProductOptionSchema>;

export type ProductVariant = Schema.Schema.Type<typeof ProductVariantSchema>;

export type Product = Schema.Schema.Type<typeof ProductSchema>;

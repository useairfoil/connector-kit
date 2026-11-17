import * as Schema from "effect/Schema";

import { connection, pageQuery } from "../shared";
import {
  type Product,
  ProductOptionSchema,
  ProductStatusSchema,
  ProductVariantInventoryPolicySchema,
} from "./row";

const ProductVariantFields = `
  id
  legacyResourceId
  title
  sku
  barcode
  price
  compareAtPrice
  inventoryPolicy
  inventoryItem { id }
  taxable
  createdAt
  updatedAt
`;

const ProductFields = `
  id
  legacyResourceId
  title
  handle
  descriptionHtml
  productType
  vendor
  status
  tags
  createdAt
  updatedAt
  publishedAt
  templateSuffix
  featuredMedia { ... on MediaImage { image { url altText } } }
  options(first: 100) { id name position values }
  variants(first: 25) { nodes { ${ProductVariantFields} } pageInfo { hasNextPage endCursor } }
`;

export const ProductByIdQuery = `#graphql
query AirfoilProductById($id: ID!) {
  product(id: $id) { ${ProductFields} }
}
`;

export const ProductVariantsQuery = `#graphql
query AirfoilProductVariants($id: ID!, $first: Int!, $after: String) {
  node: product(id: $id) {
    connection: variants(first: $first, after: $after) {
      nodes { ${ProductVariantFields} }
      pageInfo { hasNextPage endCursor }
    }
  }
}
`;

export const ProductsQuery = pageQuery("AirfoilProducts", "products", ProductFields);

export const GraphQLProductVariantNodeSchema = Schema.Struct({
  id: Schema.String,
  legacyResourceId: Schema.String,
  title: Schema.String,
  sku: Schema.NullOr(Schema.String),
  barcode: Schema.NullOr(Schema.String),
  price: Schema.String,
  compareAtPrice: Schema.NullOr(Schema.String),
  inventoryItem: Schema.Struct({ id: Schema.String }),
  inventoryPolicy: ProductVariantInventoryPolicySchema,
  taxable: Schema.Boolean,
  createdAt: Schema.DateFromString,
  updatedAt: Schema.DateFromString,
});

const GraphQLFeaturedMediaSchema = Schema.Struct({
  image: Schema.optional(
    Schema.NullOr(
      Schema.Struct({
        url: Schema.String,
        altText: Schema.NullOr(Schema.String),
      }),
    ),
  ),
});

const GraphQLProductNodeSchema = Schema.Struct({
  id: Schema.String,
  legacyResourceId: Schema.String,
  title: Schema.String,
  handle: Schema.String,
  descriptionHtml: Schema.String,
  productType: Schema.String,
  vendor: Schema.String,
  status: ProductStatusSchema,
  tags: Schema.Array(Schema.String),
  createdAt: Schema.DateFromString,
  updatedAt: Schema.DateFromString,
  publishedAt: Schema.NullOr(Schema.DateFromString),
  templateSuffix: Schema.NullOr(Schema.String),
  featuredMedia: Schema.NullOr(GraphQLFeaturedMediaSchema),
  options: Schema.Array(ProductOptionSchema),
  variants: connection(GraphQLProductVariantNodeSchema),
});

export const GraphQLProductsDataSchema = Schema.Struct({
  products: connection(GraphQLProductNodeSchema),
});

export const GraphQLProductByIdDataSchema = Schema.Struct({
  product: Schema.NullOr(GraphQLProductNodeSchema),
});

export type GraphQLProductNode = Schema.Schema.Type<typeof GraphQLProductNodeSchema>;

type GraphQLProductVariantNode = Schema.Schema.Type<typeof GraphQLProductVariantNodeSchema>;

export const normalizeProductNode = (
  node: GraphQLProductNode,
  variants: ReadonlyArray<GraphQLProductVariantNode>,
): Product => ({
  id: node.id,
  legacyResourceId: node.legacyResourceId,
  title: node.title,
  handle: node.handle,
  descriptionHtml: node.descriptionHtml,
  productType: node.productType,
  vendor: node.vendor,
  status: node.status,
  tags: node.tags,
  createdAt: node.createdAt,
  updatedAt: node.updatedAt,
  publishedAt: node.publishedAt,
  templateSuffix: node.templateSuffix ?? "",
  featuredMedia:
    node.featuredMedia === null || node.featuredMedia.image === undefined
      ? null
      : { image: node.featuredMedia.image },
  options: node.options,
  variants: variants.map(({ inventoryItem, ...variant }) => ({
    ...variant,
    inventoryItemId: inventoryItem.id,
  })),
});

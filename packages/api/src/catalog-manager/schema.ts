import { Schema } from "effect";

/** Configuration for an upstream Iceberg REST catalog. */
export const RestCatalogConfig = Schema.Struct({
  uri: Schema.String,
  warehouse: Schema.optional(Schema.String),
  properties: Schema.optional(Schema.Record(Schema.String, Schema.String)),
});
export type RestCatalogConfig = typeof RestCatalogConfig.Type;

/** Request body accepted by `POST /catalogs`. */
export const CreateCatalogRequest = Schema.Struct({
  id: Schema.String,
  rest: RestCatalogConfig,
});
export type CreateCatalogRequest = typeof CreateCatalogRequest.Type;

/** A catalog managed by the Airfoil Storage Engine. */
export const Catalog = Schema.Struct({
  id: Schema.String,
  rest: RestCatalogConfig,
});
export type Catalog = typeof Catalog.Type;

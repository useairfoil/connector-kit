import { Schema } from "effect";

const MetadataSchema = Schema.Record(
  Schema.String,
  Schema.Union([Schema.String, Schema.Number, Schema.Boolean]),
);

const CustomFieldDataSchema = Schema.Record(
  Schema.String,
  Schema.NullOr(Schema.Union([Schema.String, Schema.Number, Schema.Boolean])),
);

export const MetadataJsonSchema = Schema.flip(Schema.fromJsonString(MetadataSchema));

export const CustomFieldDataJsonSchema = Schema.flip(Schema.fromJsonString(CustomFieldDataSchema));

export const DiscountAmountsJsonSchema = Schema.flip(
  Schema.fromJsonString(Schema.Record(Schema.String, Schema.Int)),
);

export const date = (description: string) =>
  Schema.DateFromString.pipe(Schema.annotateKey({ description }));

export const nullableDate = (description: string) =>
  Schema.NullOr(Schema.DateFromString).pipe(Schema.annotateKey({ description }));

export const AddressSchema = Schema.Struct({
  country: Schema.String.pipe(Schema.annotateKey({ description: "Country code for the address." })),
  line1: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "First line of the address." }),
  ),
  line2: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Second line of the address." }),
  ),
  postal_code: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Postal code for the address." }),
  ),
  city: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "City for the address." }),
  ),
  state: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "State or region for the address." }),
  ),
});

export const OrderItemSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Unique order item identifier." })),
  created_at: date("Time when the order item was created."),
  modified_at: nullableDate("Time when the order item was last changed."),
  label: Schema.String.pipe(
    Schema.annotateKey({ description: "Display label for the order item." }),
  ),
  amount: Schema.Int.pipe(
    Schema.annotateKey({ description: "Order item amount in the smallest currency unit." }),
  ),
  tax_amount: Schema.Int.pipe(
    Schema.annotateKey({ description: "Tax amount in the smallest currency unit." }),
  ),
  proration: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the item is a proration." }),
  ),
  product_price_id: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Product price linked to the item." }),
  ),
});

export const makeListResponseSchema = <A>(
  item: Schema.Decoder<A>,
): Schema.Decoder<ListResponse<A>> =>
  Schema.Struct({
    items: Schema.Array(item),
    pagination: Schema.Struct({
      total_count: Schema.Int,
      max_page: Schema.Int,
    }),
  });

export type ListResponse<T = unknown> = {
  readonly items: ReadonlyArray<T>;
  readonly pagination: {
    readonly total_count: number;
    readonly max_page: number;
  };
};

export type Address = Schema.Schema.Type<typeof AddressSchema>;

export type OrderItem = Schema.Schema.Type<typeof OrderItemSchema>;

import { SchemaTransformation } from "effect";
import * as Schema from "effect/Schema";

export const PageInfoSchema = Schema.Struct({
  hasNextPage: Schema.Boolean,
  endCursor: Schema.NullOr(Schema.String),
});

export const gid = (type: string, id: number | string): string => `gid://shopify/${type}/${id}`;

export const normalizeAmount = (amount: string): string =>
  amount.includes(".") ? amount.replace(/0+$/, "").replace(/\.$/, "") : amount;

export const emptyText = (value: string | null): string => value ?? "";

export const splitTags = (value: string): ReadonlyArray<string> =>
  value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

export const moneyBag = Schema.Struct({
  shopMoney: Schema.Struct({
    amount: Schema.String.pipe(Schema.annotateKey({ description: "Amount in the shop currency." })),
    currencyCode: Schema.String.pipe(Schema.annotateKey({ description: "Shop currency code." })),
  }).pipe(Schema.annotateKey({ description: "Amount in the shop currency." })),
  presentmentMoney: Schema.Struct({
    amount: Schema.String.pipe(
      Schema.annotateKey({ description: "Amount in the customer currency." }),
    ),
    currencyCode: Schema.String.pipe(
      Schema.annotateKey({ description: "Customer currency code." }),
    ),
  }).pipe(Schema.annotateKey({ description: "Amount in the customer currency." })),
});

export const address = Schema.Struct({
  firstName: Schema.NullOr(Schema.String).pipe(Schema.annotateKey({ description: "First name." })),
  lastName: Schema.NullOr(Schema.String).pipe(Schema.annotateKey({ description: "Last name." })),
  name: Schema.NullOr(Schema.String).pipe(Schema.annotateKey({ description: "Full name." })),
  company: Schema.NullOr(Schema.String).pipe(Schema.annotateKey({ description: "Company name." })),
  address1: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "First address line." }),
  ),
  address2: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Second address line." }),
  ),
  city: Schema.NullOr(Schema.String).pipe(Schema.annotateKey({ description: "City." })),
  province: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Province or state." }),
  ),
  provinceCode: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Province or state code." }),
  ),
  country: Schema.NullOr(Schema.String).pipe(Schema.annotateKey({ description: "Country." })),
  countryCode: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Two-letter country code." }),
  ),
  zip: Schema.NullOr(Schema.String).pipe(Schema.annotateKey({ description: "Postal code." })),
  phone: Schema.NullOr(Schema.String).pipe(Schema.annotateKey({ description: "Phone number." })),
  latitude: Schema.NullOr(Schema.Finite).pipe(Schema.annotateKey({ description: "Latitude." })),
  longitude: Schema.NullOr(Schema.Finite).pipe(Schema.annotateKey({ description: "Longitude." })),
});

export const attributes = Schema.Array(
  Schema.Struct({
    key: Schema.String.pipe(Schema.annotateKey({ description: "Attribute name." })),
    value: Schema.NullOr(Schema.String).pipe(
      Schema.annotateKey({ description: "Attribute value." }),
    ),
  }),
);

export const taxLines = Schema.Array(
  Schema.Struct({
    title: Schema.String.pipe(Schema.annotateKey({ description: "Tax name." })),
    rate: Schema.NullOr(Schema.Finite).pipe(
      Schema.annotateKey({ description: "Tax rate as a fraction." }),
    ),
    priceSet: moneyBag.pipe(Schema.annotateKey({ description: "Tax amount." })),
  }),
);

export const discountAllocations = Schema.Array(
  Schema.Struct({
    discountApplicationIndex: Schema.Int.pipe(
      Schema.annotateKey({ description: "Index of the order discount application." }),
    ),
    amountSet: moneyBag.pipe(Schema.annotateKey({ description: "Allocated discount amount." })),
  }),
);

export type MoneyBag = Schema.Schema.Type<typeof moneyBag>;

export type Address = Schema.Schema.Type<typeof address>;

export type Attribute = Schema.Schema.Type<typeof attributes>[number];

export type TaxLine = Schema.Schema.Type<typeof taxLines>[number];

export type DiscountAllocation = Schema.Schema.Type<typeof discountAllocations>[number];

export const RestMoneyBagSchema = Schema.Struct({
  shop_money: Schema.Struct({ amount: Schema.String, currency_code: Schema.String }),
  presentment_money: Schema.Struct({ amount: Schema.String, currency_code: Schema.String }),
});

const nullableText = Schema.NullOr(Schema.String);

export const RestAddressSchema = Schema.Struct({
  first_name: nullableText,
  last_name: nullableText,
  name: nullableText,
  company: nullableText,
  address1: nullableText,
  address2: nullableText,
  city: nullableText,
  province: nullableText,
  province_code: nullableText,
  country: nullableText,
  country_code: nullableText,
  zip: nullableText,
  phone: nullableText,
  latitude: Schema.NullOr(Schema.Number),
  longitude: Schema.NullOr(Schema.Number),
});

export const RestAttributeSchema = Schema.Struct({
  name: Schema.String,
  value: Schema.NullOr(Schema.String),
});

export const RestTaxLineSchema = Schema.Struct({
  title: Schema.String,
  rate: Schema.NullOr(Schema.Number),
  price_set: RestMoneyBagSchema,
});

export const RestDiscountAllocationSchema = Schema.Struct({
  discount_application_index: Schema.Int,
  amount_set: RestMoneyBagSchema,
});

type RestMoneyBag = Schema.Schema.Type<typeof RestMoneyBagSchema>;

type RestAddress = Schema.Schema.Type<typeof RestAddressSchema>;

export const fromRest = {
  money: (bag: RestMoneyBag): MoneyBag => ({
    shopMoney: {
      amount: normalizeAmount(bag.shop_money.amount),
      currencyCode: bag.shop_money.currency_code,
    },
    presentmentMoney: {
      amount: normalizeAmount(bag.presentment_money.amount),
      currencyCode: bag.presentment_money.currency_code,
    },
  }),
  address: (value: RestAddress): Address => ({
    firstName: value.first_name,
    lastName: value.last_name,
    name: value.name,
    company: value.company,
    address1: value.address1,
    address2: value.address2,
    city: value.city,
    province: value.province,
    provinceCode: value.province_code,
    country: value.country,
    countryCode: value.country_code,
    zip: value.zip,
    phone: value.phone,
    latitude: value.latitude,
    longitude: value.longitude,
  }),
  attribute: (value: Schema.Schema.Type<typeof RestAttributeSchema>): Attribute => ({
    key: value.name,
    value: value.value,
  }),
  taxLine: (value: Schema.Schema.Type<typeof RestTaxLineSchema>): TaxLine => ({
    title: value.title,
    rate: value.rate,
    priceSet: fromRest.money(value.price_set),
  }),
  discountAllocation: (
    value: Schema.Schema.Type<typeof RestDiscountAllocationSchema>,
  ): DiscountAllocation => ({
    discountApplicationIndex: value.discount_application_index,
    amountSet: fromRest.money(value.amount_set),
  }),
};

export const MoneyBagFields = `shopMoney { amount currencyCode } presentmentMoney { amount currencyCode }`;

export const AddressFields = `firstName lastName name company address1 address2 city province provinceCode country countryCodeV2 zip phone latitude longitude`;

export const TaxLineFields = `title rate priceSet { ${MoneyBagFields} }`;

export const DiscountAllocationFields = `allocatedAmountSet { ${MoneyBagFields} } discountApplication { index }`;

export const GraphQLMoneyBagSchema = Schema.Struct({
  shopMoney: Schema.Struct({ amount: Schema.String, currencyCode: Schema.String }),
  presentmentMoney: Schema.Struct({ amount: Schema.String, currencyCode: Schema.String }),
});

export const GraphQLAddressSchema = Schema.Struct({
  firstName: Schema.NullOr(Schema.String),
  lastName: Schema.NullOr(Schema.String),
  name: Schema.NullOr(Schema.String),
  company: Schema.NullOr(Schema.String),
  address1: Schema.NullOr(Schema.String),
  address2: Schema.NullOr(Schema.String),
  city: Schema.NullOr(Schema.String),
  province: Schema.NullOr(Schema.String),
  provinceCode: Schema.NullOr(Schema.String),
  country: Schema.NullOr(Schema.String),
  countryCodeV2: Schema.NullOr(Schema.String),
  zip: Schema.NullOr(Schema.String),
  phone: Schema.NullOr(Schema.String),
  latitude: Schema.NullOr(Schema.Number),
  longitude: Schema.NullOr(Schema.Number),
});

export const GraphQLAttributeSchema = Schema.Struct({
  key: Schema.String,
  value: Schema.NullOr(Schema.String),
});

export const GraphQLTaxLineSchema = Schema.Struct({
  title: Schema.String,
  rate: Schema.NullOr(Schema.Number),
  priceSet: GraphQLMoneyBagSchema,
});

export const GraphQLDiscountAllocationSchema = Schema.Struct({
  allocatedAmountSet: GraphQLMoneyBagSchema,
  discountApplication: Schema.Struct({ index: Schema.Int }),
});

export const connection = <S extends Schema.Top>(node: S) =>
  Schema.Struct({ nodes: Schema.Array(node), pageInfo: PageInfoSchema });

type GraphQLMoneyBag = Schema.Schema.Type<typeof GraphQLMoneyBagSchema>;

type GraphQLAddress = Schema.Schema.Type<typeof GraphQLAddressSchema>;

export const fromGraphQL = {
  money: (bag: GraphQLMoneyBag): MoneyBag => ({
    shopMoney: {
      amount: normalizeAmount(bag.shopMoney.amount),
      currencyCode: bag.shopMoney.currencyCode,
    },
    presentmentMoney: {
      amount: normalizeAmount(bag.presentmentMoney.amount),
      currencyCode: bag.presentmentMoney.currencyCode,
    },
  }),
  address: ({ countryCodeV2, ...value }: GraphQLAddress): Address => ({
    ...value,
    countryCode: countryCodeV2,
  }),
  taxLine: (value: Schema.Schema.Type<typeof GraphQLTaxLineSchema>): TaxLine => ({
    title: value.title,
    rate: value.rate,
    priceSet: fromGraphQL.money(value.priceSet),
  }),
  discountAllocation: (
    value: Schema.Schema.Type<typeof GraphQLDiscountAllocationSchema>,
  ): DiscountAllocation => ({
    discountApplicationIndex: value.discountApplication.index,
    amountSet: fromGraphQL.money(value.allocatedAmountSet),
  }),
};

// Webhooks send enum values in lower case.
export const upper = <const L extends ReadonlyArray<string>>(literals: Schema.Literals<L>) =>
  Schema.String.pipe(Schema.decode(SchemaTransformation.toUpperCase()), Schema.decodeTo(literals));

export const PageInfoFields = `pageInfo { hasNextPage endCursor }`;

export const idRef = Schema.NullOr(Schema.Struct({ id: Schema.String }));

export type Nodes<S extends Schema.Top> =
  Schema.Schema.Type<S> extends { readonly nodes: infer N } ? N : never;

export const pageQuery = (name: string, connection: string, fields: string) => `#graphql
query ${name}($first: Int!, $after: String) {
  ${connection}(first: $first, after: $after) {
    nodes {
      ${fields}
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
`;

export type PageInfo = Schema.Schema.Type<typeof PageInfoSchema>;

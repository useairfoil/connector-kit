import * as Schema from "effect/Schema";

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

export const readVersion = Schema.Date.pipe(
  Schema.annotateKey({ description: "Time Shopify was read." }),
);

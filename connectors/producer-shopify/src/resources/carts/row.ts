import { Iceberg } from "@useairfoil/connector-kit";
import * as Schema from "effect/Schema";

import { moneyBag } from "../shared";

export const CartLineItemSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Unique cart line identifier." })),
  properties: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Custom line properties stored as JSON." }),
  ),
  quantity: Schema.Int.pipe(Schema.annotateKey({ description: "Quantity of the cart line." })),
  variantId: Schema.String.pipe(Schema.annotateKey({ description: "Product variant identifier." })),
  key: Schema.String.pipe(Schema.annotateKey({ description: "Unique key for the cart line." })),
  discountedPrice: Schema.String.pipe(
    Schema.annotateKey({ description: "Price after discounts." }),
  ),
  discounts: Schema.String.pipe(
    Schema.annotateKey({ description: "Line discounts stored as JSON." }),
  ),
  giftCard: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the line is a gift card." }),
  ),
  grams: Schema.Int.pipe(Schema.annotateKey({ description: "Weight of the line in grams." })),
  linePrice: Schema.String.pipe(Schema.annotateKey({ description: "Total price for the line." })),
  originalLinePrice: Schema.String.pipe(
    Schema.annotateKey({ description: "Line price before discounts." }),
  ),
  originalPrice: Schema.String.pipe(
    Schema.annotateKey({ description: "Unit price before discounts." }),
  ),
  price: Schema.String.pipe(Schema.annotateKey({ description: "Current unit price." })),
  productId: Schema.String.pipe(Schema.annotateKey({ description: "Product identifier." })),
  sku: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Stock keeping unit for the line." }),
  ),
  taxable: Schema.Boolean.pipe(Schema.annotateKey({ description: "Whether the line is taxable." })),
  title: Schema.String.pipe(Schema.annotateKey({ description: "Title of the cart line." })),
  totalDiscount: Schema.String.pipe(
    Schema.annotateKey({ description: "Total discount for the line." }),
  ),
  vendor: Schema.String.pipe(Schema.annotateKey({ description: "Vendor of the product." })),
  discountedPriceSet: moneyBag.pipe(Schema.annotateKey({ description: "Price after discounts." })),
  linePriceSet: moneyBag.pipe(Schema.annotateKey({ description: "Total price for the line." })),
  originalLinePriceSet: moneyBag.pipe(
    Schema.annotateKey({ description: "Line price before discounts." }),
  ),
  priceSet: moneyBag.pipe(Schema.annotateKey({ description: "Current unit price." })),
  totalDiscountSet: moneyBag.pipe(
    Schema.annotateKey({ description: "Total discount for the line." }),
  ),
  parentRelationship: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Parent relationship stored as JSON." }),
  ),
});

export const CartSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Unique cart identifier." })),
  token: Schema.String.pipe(Schema.annotateKey({ description: "Token for the cart." })),
  topic: Schema.Literals(["carts/create", "carts/update"]).pipe(
    Schema.annotateKey({ description: "Webhook topic that last changed the cart." }),
  ),
  lineItems: Schema.Array(CartLineItemSchema).pipe(
    Schema.annotateKey({ description: "Items in the cart." }),
  ),
  note: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Note added to the cart." }),
  ),
  updatedAt: Schema.Date.pipe(
    Schema.annotateKey({ description: "Time when the cart was last changed." }),
  ),
  createdAt: Schema.Date.pipe(
    Schema.annotateKey({ description: "Time when the cart was created." }),
  ),
})
  .annotate({
    description: "Latest state of each cart in a Shopify store.",
  })
  .pipe(Iceberg.identifier("id"));

export type CartLineItem = Schema.Schema.Type<typeof CartLineItemSchema>;

export type Cart = Schema.Schema.Type<typeof CartSchema>;

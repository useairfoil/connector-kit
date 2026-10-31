import { Iceberg } from "@useairfoil/connector-kit";
import * as Schema from "effect/Schema";

import { address } from "../shared";

export const CustomerStateSchema = Schema.Literals(["DECLINED", "DISABLED", "ENABLED", "INVITED"]);

export const EmailMarketingStateSchema = Schema.Literals([
  "INVALID",
  "NOT_SUBSCRIBED",
  "PENDING",
  "REDACTED",
  "SUBSCRIBED",
  "UNSUBSCRIBED",
]);

export const SmsMarketingStateSchema = Schema.Literals([
  "NOT_SUBSCRIBED",
  "PENDING",
  "SUBSCRIBED",
  "UNSUBSCRIBED",
  "REDACTED",
]);

export const MarketingOptInLevelSchema = Schema.Literals([
  "SINGLE_OPT_IN",
  "CONFIRMED_OPT_IN",
  "UNKNOWN",
]);

export const ConsentCollectedFromSchema = Schema.Literals(["SHOPIFY", "OTHER"]);

export const ProductSubscriberStatusSchema = Schema.Literals([
  "ACTIVE",
  "CANCELLED",
  "EXPIRED",
  "FAILED",
  "NEVER_SUBSCRIBED",
  "PAUSED",
]);

export const CustomerAddressSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Unique address identifier." })),
  ...address.fields,
});

export const CustomerSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Unique customer identifier." })),
  legacyResourceId: Schema.String.pipe(
    Schema.annotateKey({ description: "Numeric customer identifier stored as text." }),
  ),
  firstName: Schema.NullOr(Schema.String).pipe(Schema.annotateKey({ description: "First name." })),
  lastName: Schema.NullOr(Schema.String).pipe(Schema.annotateKey({ description: "Last name." })),
  displayName: Schema.String.pipe(
    Schema.annotateKey({ description: "Full name shown in Shopify." }),
  ),
  email: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Default email address." }),
  ),
  emailMarketingState: Schema.NullOr(EmailMarketingStateSchema).pipe(
    Schema.annotateKey({ description: "Email marketing consent state." }),
  ),
  emailMarketingOptInLevel: Schema.NullOr(MarketingOptInLevelSchema).pipe(
    Schema.annotateKey({ description: "Email marketing opt-in level." }),
  ),
  emailMarketingUpdatedAt: Schema.NullOr(Schema.Date).pipe(
    Schema.annotateKey({ description: "Time when email marketing consent last changed." }),
  ),
  phone: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Default phone number." }),
  ),
  smsMarketingState: Schema.NullOr(SmsMarketingStateSchema).pipe(
    Schema.annotateKey({ description: "SMS marketing consent state." }),
  ),
  smsMarketingOptInLevel: Schema.NullOr(MarketingOptInLevelSchema).pipe(
    Schema.annotateKey({ description: "SMS marketing opt-in level." }),
  ),
  smsMarketingUpdatedAt: Schema.NullOr(Schema.Date).pipe(
    Schema.annotateKey({ description: "Time when SMS marketing consent last changed." }),
  ),
  smsMarketingCollectedFrom: Schema.NullOr(ConsentCollectedFromSchema).pipe(
    Schema.annotateKey({ description: "Where SMS marketing consent was collected." }),
  ),
  note: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Merchant note about the customer." }),
  ),
  state: CustomerStateSchema.pipe(Schema.annotateKey({ description: "Customer account state." })),
  verifiedEmail: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the email address is verified." }),
  ),
  taxExempt: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the customer is exempt from tax." }),
  ),
  taxExemptions: Schema.Array(Schema.String).pipe(
    Schema.annotateKey({ description: "Tax exemptions that apply to the customer." }),
  ),
  tags: Schema.Array(Schema.String).pipe(
    Schema.annotateKey({ description: "Tags added to the customer." }),
  ),
  locale: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Customer language." }),
  ),
  numberOfOrders: Schema.Int.pipe(
    Schema.annotateKey({ description: "Number of orders the customer placed." }),
  ),
  amountSpent: Schema.Struct({
    amount: Schema.String.pipe(Schema.annotateKey({ description: "Amount spent." })),
    currencyCode: Schema.String.pipe(Schema.annotateKey({ description: "Shop currency code." })),
  }).pipe(Schema.annotateKey({ description: "Total amount spent in the shop currency." })),
  lastOrderId: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Most recent order identifier." }),
  ),
  productSubscriberStatus: Schema.NullOr(ProductSubscriberStatusSchema).pipe(
    Schema.annotateKey({ description: "Subscription status for products." }),
  ),
  dataSaleOptOut: Schema.NullOr(Schema.Boolean).pipe(
    Schema.annotateKey({ description: "Whether the customer opted out of data sale." }),
  ),
  defaultAddressId: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Default address identifier." }),
  ),
  addresses: Schema.Array(CustomerAddressSchema).pipe(
    Schema.annotateKey({ description: "Saved addresses." }),
  ),
  createdAt: Schema.Date.pipe(
    Schema.annotateKey({ description: "Time when the customer was created." }),
  ),
  updatedAt: Schema.Date.pipe(
    Schema.annotateKey({ description: "Time when the customer was last changed." }),
  ),
  _deleted: Schema.optional(Schema.Boolean).pipe(
    Schema.annotateKey({ description: "Whether the customer was deleted." }),
  ),
})
  .annotate({
    description: "Customers in a Shopify store.",
  })
  .pipe(Iceberg.identifier("id"));

export type Customer = Schema.Schema.Type<typeof CustomerSchema>;

import { Iceberg } from "@useairfoil/connector-kit";
import { Schema } from "effect";

import { deleted, version } from "./shared";

const baseFields = (object: string) => ({
  id: Schema.String.pipe(
    Schema.annotateKey({ description: `HubSpot record ID of the ${object}.` }),
  ),
  version,
  created_at: Schema.Date.pipe(
    Schema.annotateKey({ description: `Time the ${object} was created.` }),
  ),
  updated_at: Schema.Date.pipe(
    Schema.annotateKey({
      description: `Time HubSpot last changed the ${object}. Calculated properties and associations can change without it.`,
    }),
  ),
  properties: Schema.ReadonlyMap(Schema.String, Schema.String).pipe(
    Schema.annotateKey({
      description:
        "Every non-empty, non-sensitive property, as HubSpot returns it, by internal name.",
    }),
  ),
  _deleted: deleted(object),
});

const ids = (object: string) =>
  Schema.Array(Schema.String).pipe(
    Schema.annotateKey({ description: `IDs of the associated ${object}.` }),
  );

const company_ids = ids("companies");
const contact_ids = ids("contacts");
const deal_ids = ids("deals");
const ticket_ids = ids("tickets");

const activityFields = (object: string) => ({
  ...baseFields(object),
  company_ids,
  contact_ids,
  deal_ids,
  ticket_ids,
});

export const ContactSchema = Schema.Struct({ ...baseFields("contact"), company_ids })
  .annotate({
    description: "HubSpot contacts.",
  })
  .pipe(Iceberg.identifier("id"));
export type Contact = Schema.Schema.Type<typeof ContactSchema>;

export const CompanySchema = Schema.Struct(baseFields("company"))
  .annotate({
    description: "HubSpot companies. Their contacts and deals are on those tables.",
  })
  .pipe(Iceberg.identifier("id"));
export type Company = Schema.Schema.Type<typeof CompanySchema>;

export const DealSchema = Schema.Struct({
  ...baseFields("deal"),
  company_ids,
  contact_ids,
})
  .annotate({ description: "HubSpot deals." })
  .pipe(Iceberg.identifier("id"));
export type Deal = Schema.Schema.Type<typeof DealSchema>;

export const TicketSchema = Schema.Struct({
  ...baseFields("ticket"),
  company_ids,
  contact_ids,
  deal_ids,
})
  .annotate({ description: "HubSpot tickets." })
  .pipe(Iceberg.identifier("id"));
export type Ticket = Schema.Schema.Type<typeof TicketSchema>;

export const CallSchema = Schema.Struct(activityFields("call"))
  .annotate({
    description: "Calls logged in HubSpot.",
  })
  .pipe(Iceberg.identifier("id"));
export type Call = Schema.Schema.Type<typeof CallSchema>;

export const EmailSchema = Schema.Struct(activityFields("email"))
  .annotate({
    description: "One-to-one emails logged in HubSpot.",
  })
  .pipe(Iceberg.identifier("id"));
export type Email = Schema.Schema.Type<typeof EmailSchema>;

export const MeetingSchema = Schema.Struct(activityFields("meeting"))
  .annotate({
    description: "Meetings logged in HubSpot.",
  })
  .pipe(Iceberg.identifier("id"));
export type Meeting = Schema.Schema.Type<typeof MeetingSchema>;

export const NoteSchema = Schema.Struct(activityFields("note"))
  .annotate({
    description: "Notes on HubSpot records.",
  })
  .pipe(Iceberg.identifier("id"));
export type Note = Schema.Schema.Type<typeof NoteSchema>;

export const TaskSchema = Schema.Struct(activityFields("task"))
  .annotate({
    description: "HubSpot tasks.",
  })
  .pipe(Iceberg.identifier("id"));
export type Task = Schema.Schema.Type<typeof TaskSchema>;

export const LineItemSchema = Schema.Struct({ ...baseFields("line item"), deal_ids })
  .annotate({
    description: "Line items on HubSpot deals. The product is `hs_product_id` in `properties`.",
  })
  .pipe(Iceberg.identifier("id"));
export type LineItem = Schema.Schema.Type<typeof LineItemSchema>;

export const ProductSchema = Schema.Struct(baseFields("product"))
  .annotate({
    description: "HubSpot product library.",
  })
  .pipe(Iceberg.identifier("id"));
export type Product = Schema.Schema.Type<typeof ProductSchema>;

const commerceFields = (object: string) => ({
  ...baseFields(object),
  company_ids,
  contact_ids,
  deal_ids,
});

export const QuoteSchema = Schema.Struct(commerceFields("quote"))
  .annotate({
    description: "HubSpot quotes.",
  })
  .pipe(Iceberg.identifier("id"));
export type Quote = Schema.Schema.Type<typeof QuoteSchema>;

export const LeadSchema = Schema.Struct({
  ...baseFields("lead"),
  company_ids,
  contact_ids,
})
  .annotate({ description: "HubSpot leads." })
  .pipe(Iceberg.identifier("id"));
export type Lead = Schema.Schema.Type<typeof LeadSchema>;

export const CommunicationSchema = Schema.Struct(activityFields("communication"))
  .annotate({
    description: "SMS, WhatsApp, and LinkedIn messages logged in HubSpot.",
  })
  .pipe(Iceberg.identifier("id"));
export type Communication = Schema.Schema.Type<typeof CommunicationSchema>;

export const PostalMailSchema = Schema.Struct(activityFields("postal mail"))
  .annotate({
    description: "Postal mail logged in HubSpot.",
  })
  .pipe(Iceberg.identifier("id"));
export type PostalMail = Schema.Schema.Type<typeof PostalMailSchema>;

export const FeedbackSubmissionSchema = Schema.Struct(activityFields("feedback submission"))
  .annotate({ description: "Answers to HubSpot feedback surveys." })
  .pipe(Iceberg.identifier("id"));
export type FeedbackSubmission = Schema.Schema.Type<typeof FeedbackSubmissionSchema>;

export const InvoiceSchema = Schema.Struct(commerceFields("invoice"))
  .annotate({
    description: "HubSpot invoices.",
  })
  .pipe(Iceberg.identifier("id"));
export type Invoice = Schema.Schema.Type<typeof InvoiceSchema>;

export const OrderSchema = Schema.Struct(commerceFields("order"))
  .annotate({
    description: "HubSpot orders.",
  })
  .pipe(Iceberg.identifier("id"));
export type Order = Schema.Schema.Type<typeof OrderSchema>;

export const CartSchema = Schema.Struct(commerceFields("cart"))
  .annotate({
    description: "HubSpot carts.",
  })
  .pipe(Iceberg.identifier("id"));
export type Cart = Schema.Schema.Type<typeof CartSchema>;

export const CommercePaymentSchema = Schema.Struct(commerceFields("payment"))
  .annotate({
    description: "Payments collected through HubSpot.",
  })
  .pipe(Iceberg.identifier("id"));
export type CommercePayment = Schema.Schema.Type<typeof CommercePaymentSchema>;

export const SubscriptionSchema = Schema.Struct(commerceFields("subscription"))
  .annotate({
    description: "Recurring payment subscriptions in HubSpot.",
  })
  .pipe(Iceberg.identifier("id"));
export type Subscription = Schema.Schema.Type<typeof SubscriptionSchema>;

export const DiscountSchema = Schema.Struct(baseFields("discount"))
  .annotate({
    description: "Discounts on HubSpot quotes.",
  })
  .pipe(Iceberg.identifier("id"));
export type Discount = Schema.Schema.Type<typeof DiscountSchema>;

export const FeeSchema = Schema.Struct(baseFields("fee"))
  .annotate({
    description: "Fees on HubSpot quotes.",
  })
  .pipe(Iceberg.identifier("id"));
export type Fee = Schema.Schema.Type<typeof FeeSchema>;

export const TaxSchema = Schema.Struct(baseFields("tax"))
  .annotate({
    description: "Taxes on HubSpot quotes.",
  })
  .pipe(Iceberg.identifier("id"));
export type Tax = Schema.Schema.Type<typeof TaxSchema>;

export const GoalTargetSchema = Schema.Struct(baseFields("goal"))
  .annotate({
    description: "HubSpot goals.",
  })
  .pipe(Iceberg.identifier("id"));
export type GoalTarget = Schema.Schema.Type<typeof GoalTargetSchema>;

export const UserSchema = Schema.Struct(baseFields("user"))
  .annotate({
    description: "HubSpot users with their user properties. `owners` maps them to owner IDs.",
  })
  .pipe(Iceberg.identifier("id"));
export type User = Schema.Schema.Type<typeof UserSchema>;

export const DealSplitSchema = Schema.Struct({ ...baseFields("deal split"), deal_ids })
  .annotate({
    description: "How deal amounts are split between owners.",
  })
  .pipe(Iceberg.identifier("id"));
export type DealSplit = Schema.Schema.Type<typeof DealSplitSchema>;

/** What the CRM reader decodes for one custom object type. */
export const CustomObjectRecordSchema = Schema.Struct(activityFields("custom object record")).pipe(
  Iceberg.identifier("id"),
);
export type CustomObjectRecord = Schema.Schema.Type<typeof CustomObjectRecordSchema>;

export const CustomObjectSchema = Schema.Struct({
  key: Schema.String.pipe(
    Schema.annotateKey({ description: "Object type ID and record ID, such as `2-123:456`." }),
  ),
  ...activityFields("custom object record"),
  object_type_id: Schema.String.pipe(
    Schema.annotateKey({ description: "Custom object type ID, such as `2-123`." }),
  ),
  object_type: Schema.String.pipe(
    Schema.annotateKey({ description: "Custom object name, such as `vehicle`." }),
  ),
})
  .annotate({ description: "Records of every custom object type in one table." })
  .pipe(Iceberg.identifier("key"));
export type CustomObject = Schema.Schema.Type<typeof CustomObjectSchema>;

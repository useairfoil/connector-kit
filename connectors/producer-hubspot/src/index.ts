declare const __COMMIT_SHA__: string | undefined;

export const commitSha = typeof __COMMIT_SHA__ === "undefined" ? undefined : __COMMIT_SHA__;

export * as HubSpotClient from "./client/client";
export * as HubSpotConnector from "./connector";
export { manifest } from "./manifest";
export type {
  Call,
  Cart,
  CommercePayment,
  Communication,
  Company,
  Contact,
  CustomObject,
  Deal,
  DealSplit,
  Discount,
  Email,
  Fee,
  FeedbackSubmission,
  GoalTarget,
  Invoice,
  Lead,
  LineItem,
  Meeting,
  Note,
  Order,
  PostalMail,
  Product,
  Quote,
  Subscription,
  Task,
  Tax,
  Ticket,
  User,
} from "./schemas/crm";
export {
  CallSchema,
  CartSchema,
  CommercePaymentSchema,
  CommunicationSchema,
  CompanySchema,
  ContactSchema,
  CustomObjectSchema,
  DealSchema,
  DealSplitSchema,
  DiscountSchema,
  EmailSchema,
  FeeSchema,
  FeedbackSubmissionSchema,
  GoalTargetSchema,
  InvoiceSchema,
  LeadSchema,
  LineItemSchema,
  MeetingSchema,
  NoteSchema,
  OrderSchema,
  PostalMailSchema,
  ProductSchema,
  QuoteSchema,
  SubscriptionSchema,
  TaskSchema,
  TaxSchema,
  TicketSchema,
  UserSchema,
} from "./schemas/crm";
export type { List } from "./schemas/lists";
export { ListSchema } from "./schemas/lists";
export type { Owner } from "./schemas/owners";
export { OwnerSchema } from "./schemas/owners";
export type { Pipeline } from "./schemas/pipelines";
export { PipelineSchema } from "./schemas/pipelines";
export type { Property } from "./schemas/properties";
export { PropertySchema } from "./schemas/properties";
export type { Team } from "./schemas/teams";
export { TeamSchema } from "./schemas/teams";
export { webhookPath } from "./webhook/route";

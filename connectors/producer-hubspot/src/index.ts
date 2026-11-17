declare const __COMMIT_SHA__: string | undefined;

export const commitSha = typeof __COMMIT_SHA__ === "undefined" ? undefined : __COMMIT_SHA__;

export * as HubSpotClient from "./client/client";
export * as HubSpotConnector from "./connector";
export { manifest } from "./manifest";
export type {
  Appointment,
  Call,
  Cart,
  CommercePayment,
  Communication,
  Company,
  Contact,
  Course,
  CustomObject,
  Deal,
  DealPropertyHistory,
  DealSplit,
  Discount,
  Email,
  Fee,
  FeedbackSubmission,
  GoalTarget,
  Invoice,
  Lead,
  LineItem,
  Listing,
  Meeting,
  Note,
  Order,
  PostalMail,
  Product,
  Project,
  Quote,
  Service,
  Subscription,
  Task,
  Tax,
  Ticket,
  User,
} from "./schemas/crm";
export {
  AppointmentSchema,
  CallSchema,
  CartSchema,
  CommercePaymentSchema,
  CommunicationSchema,
  CompanySchema,
  ContactSchema,
  CourseSchema,
  CustomObjectSchema,
  DealPropertyHistorySchema,
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
  ListingSchema,
  MeetingSchema,
  NoteSchema,
  OrderSchema,
  PostalMailSchema,
  ProductSchema,
  ProjectSchema,
  QuoteSchema,
  ServiceSchema,
  SubscriptionSchema,
  TaskSchema,
  TaxSchema,
  TicketSchema,
  UserSchema,
} from "./schemas/crm";
export type { CommerceLink, PeerLink } from "./schemas/links";
export { CommerceLinkSchema, PeerLinkSchema } from "./schemas/links";
export type { List, SegmentMembership } from "./schemas/lists";
export { ListSchema, SegmentMembershipSchema } from "./schemas/lists";
export type { MarketingEvent, MarketingParticipation } from "./schemas/marketing";
export { MarketingEventSchema, MarketingParticipationSchema } from "./schemas/marketing";
export type { Owner } from "./schemas/owners";
export { OwnerSchema } from "./schemas/owners";
export type { Pipeline } from "./schemas/pipelines";
export { PipelineSchema } from "./schemas/pipelines";
export type { Property } from "./schemas/properties";
export { PropertySchema } from "./schemas/properties";
export type { Team } from "./schemas/teams";
export { TeamSchema } from "./schemas/teams";
export { webhookPath } from "./webhook/route";

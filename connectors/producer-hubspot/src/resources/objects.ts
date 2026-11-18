import { Resource } from "@useairfoil/connector-kit";
import { Duration, Effect } from "effect";

import type { HubSpotClientService } from "../client/client";

import {
  AppointmentSchema,
  ProjectSchema,
  CourseSchema,
  ListingSchema,
  ServiceSchema,
  CallSchema,
  CartSchema,
  CommercePaymentSchema,
  CommunicationSchema,
  CompanySchema,
  ContactSchema,
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
} from "../schemas/crm";
import { crmEntity } from "./crm/resource";
import { companies, contacts, deals, tickets } from "./crm/spec";

// Activities often outnumber contacts 10 to 1, so they are read again less often.
const daily = Duration.days(1);
const weekly = Duration.weeks(1);

const core = {
  lastModified: "hs_lastmodifieddate",
  listsDeleted: true,
  refreshInterval: daily,
};

const activity = {
  lastModified: "hs_lastmodifieddate",
  associations: [companies, contacts, deals, tickets],
  listsDeleted: true,
  refreshInterval: weekly,
};

const commerce = { ...core, associations: [companies, contacts, deals] };

const plain = { ...activity, associations: [] };

/** CRM object resources by the object type ID in webhook events. */
export const makeCrmResources = (client: HubSpotClientService) =>
  Effect.all({
    "0-1": crmEntity(client, {
      ...core,
      name: "contacts",
      lastModified: "lastmodifieddate",
      associations: [companies],
      rowSchema: ContactSchema,
    }).pipe(Effect.map(Resource.entity)),
    "0-2": crmEntity(client, {
      ...core,
      name: "companies",
      associations: [],
      rowSchema: CompanySchema,
    }).pipe(Effect.map(Resource.entity)),
    "0-3": crmEntity(client, {
      ...core,
      name: "deals",
      associations: [companies, contacts],
      rowSchema: DealSchema,
    }).pipe(Effect.map(Resource.entity)),
    "0-5": crmEntity(client, {
      ...core,
      name: "tickets",
      associations: [companies, contacts, deals],
      rowSchema: TicketSchema,
    }).pipe(Effect.map(Resource.entity)),
    "0-48": crmEntity(client, { ...activity, name: "calls", rowSchema: CallSchema }).pipe(
      Effect.map(Resource.entity),
    ),
    // A deleted email is gone right away, so the archived list is always empty.
    "0-49": crmEntity(client, {
      ...activity,
      name: "emails",
      listsDeleted: false,
      rowSchema: EmailSchema,
    }).pipe(Effect.map(Resource.entity)),
    // HubSpot rejects listing deleted meetings. The same goes for the other
    // objects with `listsDeleted: false`, except emails.
    "0-47": crmEntity(client, {
      ...activity,
      name: "meetings",
      listsDeleted: false,
      rowSchema: MeetingSchema,
    }).pipe(Effect.map(Resource.entity)),
    "0-46": crmEntity(client, { ...activity, name: "notes", rowSchema: NoteSchema }).pipe(
      Effect.map(Resource.entity),
    ),
    "0-27": crmEntity(client, { ...activity, name: "tasks", rowSchema: TaskSchema }).pipe(
      Effect.map(Resource.entity),
    ),
    "0-18": crmEntity(client, {
      ...activity,
      name: "communications",
      listsDeleted: false,
      rowSchema: CommunicationSchema,
    }).pipe(Effect.map(Resource.entity)),
    "0-116": crmEntity(client, {
      ...activity,
      name: "postal_mail",
      rowSchema: PostalMailSchema,
    }).pipe(Effect.map(Resource.entity)),
    "0-19": crmEntity(client, {
      ...activity,
      name: "feedback_submissions",
      rowSchema: FeedbackSubmissionSchema,
    }).pipe(Effect.map(Resource.entity)),
    "0-8": crmEntity(client, {
      ...activity,
      name: "line_items",
      associations: [deals],
      rowSchema: LineItemSchema,
    }).pipe(Effect.map(Resource.entity)),
    "0-7": crmEntity(client, { ...plain, name: "products", rowSchema: ProductSchema }).pipe(
      Effect.map(Resource.entity),
    ),
    "0-14": crmEntity(client, { ...commerce, name: "quotes", rowSchema: QuoteSchema }).pipe(
      Effect.map(Resource.entity),
    ),
    "0-136": crmEntity(client, {
      ...core,
      name: "leads",
      associations: [companies, contacts],
      rowSchema: LeadSchema,
    }).pipe(Effect.map(Resource.entity)),
    "0-53": crmEntity(client, {
      ...commerce,
      name: "invoices",
      listsDeleted: false,
      rowSchema: InvoiceSchema,
    }).pipe(Effect.map(Resource.entity)),
    "0-123": crmEntity(client, { ...commerce, name: "orders", rowSchema: OrderSchema }).pipe(
      Effect.map(Resource.entity),
    ),
    "0-142": crmEntity(client, { ...commerce, name: "carts", rowSchema: CartSchema }).pipe(
      Effect.map(Resource.entity),
    ),
    "0-101": crmEntity(client, {
      ...commerce,
      name: "commerce_payments",
      listsDeleted: false,
      rowSchema: CommercePaymentSchema,
    }).pipe(Effect.map(Resource.entity)),
    "0-69": crmEntity(client, {
      ...commerce,
      name: "subscriptions",
      listsDeleted: false,
      rowSchema: SubscriptionSchema,
    }).pipe(Effect.map(Resource.entity)),
    "0-84": crmEntity(client, { ...plain, name: "discounts", rowSchema: DiscountSchema }).pipe(
      Effect.map(Resource.entity),
    ),
    "0-85": crmEntity(client, { ...plain, name: "fees", rowSchema: FeeSchema }).pipe(
      Effect.map(Resource.entity),
    ),
    "0-86": crmEntity(client, { ...plain, name: "taxes", rowSchema: TaxSchema }).pipe(
      Effect.map(Resource.entity),
    ),
    "0-74": crmEntity(client, { ...plain, name: "goal_targets", rowSchema: GoalTargetSchema }).pipe(
      Effect.map(Resource.entity),
    ),
    "0-115": crmEntity(client, {
      ...plain,
      name: "users",
      listsDeleted: false,
      rowSchema: UserSchema,
    }).pipe(Effect.map(Resource.entity)),
    // HubSpot sends no webhooks for deal splits, so they only come from polling.
    "0-72": crmEntity(client, {
      ...activity,
      name: "deal_split",
      associations: [deals],
      listsDeleted: false,
      rowSchema: DealSplitSchema,
    }).pipe(Effect.map(Resource.entity)),
  });

/** CRM objects with no webhook route yet. They only come from polling. */
export const makeAdditionalCrmResources = (client: HubSpotClientService) =>
  Effect.all([
    crmEntity(client, { ...plain, name: "projects", rowSchema: ProjectSchema }),
    crmEntity(client, { ...plain, name: "appointments", rowSchema: AppointmentSchema }),
    crmEntity(client, { ...plain, name: "courses", rowSchema: CourseSchema }),
    crmEntity(client, { ...plain, name: "listings", rowSchema: ListingSchema }),
    crmEntity(client, { ...plain, name: "services", rowSchema: ServiceSchema }),
  ]).pipe(Effect.map((entities) => entities.map(Resource.entity)));

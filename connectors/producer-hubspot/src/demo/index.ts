import { ConnectorApp, Demo, RuntimeConfig } from "@useairfoil/connector-kit";
import { Command } from "effect/cli";

import {
  DealPropertyHistorySchema,
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
} from "../schemas/crm";
import { CommerceLinkSchema, PeerLinkSchema } from "../schemas/links";
import { ListSchema, SegmentMembershipSchema } from "../schemas/lists";
import { MarketingEventSchema, MarketingParticipationSchema } from "../schemas/marketing";
import { OwnerSchema } from "../schemas/owners";
import { PipelineSchema } from "../schemas/pipelines";
import { PropertySchema } from "../schemas/properties";
import { TeamSchema } from "../schemas/teams";
import { companyRows } from "./companies";
import { setupRows } from "./setup";
import { idOf } from "./shared";

export const demo = Demo.define({
  name: "producer-hubspot",
  setup: {
    tables: [
      Demo.table({ name: "owners", rowSchema: OwnerSchema, version: "version" }),
      Demo.table({ name: "users", rowSchema: UserSchema, version: "version" }),
      Demo.table({ name: "teams", rowSchema: TeamSchema, version: "version" }),
      Demo.table({ name: "pipelines", rowSchema: PipelineSchema, version: "version" }),
      Demo.table({ name: "properties", rowSchema: PropertySchema, version: "version" }),
      Demo.table({
        name: "segment_memberships",
        rowSchema: SegmentMembershipSchema,
        version: "version",
      }),
      Demo.table({ name: "lists", rowSchema: ListSchema, version: "version" }),
      Demo.table({ name: "products", rowSchema: ProductSchema, version: "version" }),
      Demo.table({ name: "discounts", rowSchema: DiscountSchema, version: "version" }),
      Demo.table({ name: "fees", rowSchema: FeeSchema, version: "version" }),
      Demo.table({ name: "taxes", rowSchema: TaxSchema, version: "version" }),
      Demo.table({ name: "goal_targets", rowSchema: GoalTargetSchema, version: "version" }),
    ],
    rows: (context) => {
      const rows = setupRows(context);
      return {
        ...rows,
        segment_memberships: rows.lists.map((list) => ({
          id: list.id,
          object_type_id: list.object_type_id,
          filter: null,
          members: [],
          version: context.now,
        })),
      };
    },
  },
  group: {
    tables: [
      Demo.table({ name: "companies", rowSchema: CompanySchema, version: "version" }),
      Demo.table({ name: "contacts", rowSchema: ContactSchema, version: "version" }),
      Demo.table({ name: "deals", rowSchema: DealSchema, version: "version" }),
      Demo.table({ name: "line_items", rowSchema: LineItemSchema, version: "version" }),
      Demo.table({ name: "quotes", rowSchema: QuoteSchema, version: "version" }),
      Demo.table({ name: "deal_split", rowSchema: DealSplitSchema, version: "version" }),
      Demo.table({ name: "tickets", rowSchema: TicketSchema, version: "version" }),
      Demo.table({ name: "calls", rowSchema: CallSchema, version: "version" }),
      Demo.table({ name: "emails", rowSchema: EmailSchema, version: "version" }),
      Demo.table({ name: "meetings", rowSchema: MeetingSchema, version: "version" }),
      Demo.table({ name: "notes", rowSchema: NoteSchema, version: "version" }),
      Demo.table({ name: "tasks", rowSchema: TaskSchema, version: "version" }),
      Demo.table({ name: "communications", rowSchema: CommunicationSchema, version: "version" }),
      Demo.table({ name: "postal_mail", rowSchema: PostalMailSchema, version: "version" }),
      Demo.table({
        name: "feedback_submissions",
        rowSchema: FeedbackSubmissionSchema,
        version: "version",
      }),
      Demo.table({ name: "leads", rowSchema: LeadSchema, version: "version" }),
      Demo.table({ name: "invoices", rowSchema: InvoiceSchema, version: "version" }),
      Demo.table({ name: "orders", rowSchema: OrderSchema, version: "version" }),
      Demo.table({ name: "carts", rowSchema: CartSchema, version: "version" }),
      Demo.table({
        name: "commerce_payments",
        rowSchema: CommercePaymentSchema,
        version: "version",
      }),
      Demo.table({ name: "subscriptions", rowSchema: SubscriptionSchema, version: "version" }),
      Demo.table({ name: "custom_objects", rowSchema: CustomObjectSchema, version: "version" }),
      Demo.table({ name: "projects", rowSchema: ProjectSchema, version: "version" }),
      Demo.table({ name: "appointments", rowSchema: AppointmentSchema, version: "version" }),
      Demo.table({ name: "courses", rowSchema: CourseSchema, version: "version" }),
      Demo.table({ name: "listings", rowSchema: ListingSchema, version: "version" }),
      Demo.table({ name: "services", rowSchema: ServiceSchema, version: "version" }),
      Demo.table({ name: "marketing_events", rowSchema: MarketingEventSchema, version: "version" }),
      Demo.table({
        name: "marketing_event_participation",
        rowSchema: MarketingParticipationSchema,
        version: "version",
      }),
      Demo.table({
        name: "deal_property_history",
        rowSchema: DealPropertyHistorySchema,
        version: "version",
      }),
      Demo.table({ name: "peer_links", rowSchema: PeerLinkSchema, version: "version" }),
      Demo.table({ name: "commerce_links", rowSchema: CommerceLinkSchema, version: "version" }),
    ],
    rows: (index, context) => {
      const rows = companyRows(index, context);
      const version = context.now;
      const id = idOf(86_000_000_000, index);
      return {
        ...rows,
        marketing_events: [
          {
            id,
            event_name: "Product workshop",
            event_type: "WEBINAR",
            event_status: "COMPLETED",
            event_completed: true,
            start_date_time: version,
            registrants: BigInt(rows.contacts.length),
            version,
          },
        ],
        marketing_event_participation: rows.contacts.map((contact, n) => ({
          id: idOf(87_000_000_000, index, n),
          event_id: id,
          contact_id: contact.id,
          occurred_at: version,
          attendance_state: "ATTENDED",
          attendance_duration_seconds: 1800n,
          version,
        })),
        deal_property_history: rows.deals.map((deal) => ({
          id: deal.id,
          version,
          dealstage: [
            { value: deal.properties.get("dealstage") ?? null, timestamp: deal.updated_at },
          ],
          hubspot_owner_id: [
            { value: deal.properties.get("hubspot_owner_id") ?? null, timestamp: deal.updated_at },
          ],
        })),
      };
    },
  },
});

export const demoCommand = ConnectorApp.makeDemoCommand(demo).pipe(
  Command.provide(RuntimeConfig.layerHosted()),
);

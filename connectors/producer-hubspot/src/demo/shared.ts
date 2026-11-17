import type { Demo } from "@useairfoil/connector-kit";

import { Duration } from "effect";

import type {
  Appointment,
  Project,
  Course,
  Listing,
  Service,
  Call,
  Cart,
  CommercePayment,
  Communication,
  Company,
  Contact,
  CustomObject,
  Deal,
  DealSplit,
  Email,
  FeedbackSubmission,
  Invoice,
  Lead,
  LineItem,
  Meeting,
  Note,
  Order,
  PostalMail,
  Quote,
  Subscription,
  Task,
  Ticket,
} from "../schemas/crm";

export const hour = Duration.toMillis(Duration.hours(1));
export const day = Duration.toMillis(Duration.days(1));
export const ownerCount = 10;

// HubSpot record IDs are numbers sent as text. Each object type gets its own range.
export const idOf = (base: number, index: number, n = 0) => String(base + index * 100 + n);
export const ownerId = (o: number) => String(70_000_000 + o);
export const userId = (o: number) => String(80_000_000 + o);
export const iso = (date: Date) => date.toISOString();

export const teams = ["Sales East", "Sales West", "Customer Success"] as const;

export const dealStages = [
  { id: "appointmentscheduled", label: "Appointment scheduled", probability: "0.2" },
  { id: "qualifiedtobuy", label: "Qualified to buy", probability: "0.4" },
  { id: "presentationscheduled", label: "Presentation scheduled", probability: "0.6" },
  { id: "decisionmakerboughtin", label: "Decision maker bought in", probability: "0.8" },
  { id: "contractsent", label: "Contract sent", probability: "0.9" },
  { id: "closedwon", label: "Closed won", probability: "1.0" },
  { id: "closedlost", label: "Closed lost", probability: "0.0" },
] as const;

export const ticketStages = [
  { id: "1", label: "New", state: "OPEN" },
  { id: "2", label: "Waiting on contact", state: "OPEN" },
  { id: "3", label: "Waiting on us", state: "OPEN" },
  { id: "4", label: "Closed", state: "CLOSED" },
] as const;

// HubSpot's default lead pipeline uses these stage IDs.
export const leadStages = [
  { id: "new-stage-id", label: "New" },
  { id: "attempting-stage-id", label: "Attempting" },
  { id: "connected-stage-id", label: "Connected" },
  { id: "qualified-stage-id", label: "Qualified" },
  { id: "unqualified-stage-id", label: "Disqualified" },
] as const;

// Prices are yearly, in US dollars.
export const products = [
  { name: "Starter plan", sku: "PLAN-STARTER", price: 6000 },
  { name: "Professional plan", sku: "PLAN-PRO", price: 18000 },
  { name: "Enterprise plan", sku: "PLAN-ENT", price: 48000 },
  { name: "Onboarding package", sku: "SVC-ONBOARD", price: 5000 },
  { name: "Premium support", sku: "SVC-SUPPORT", price: 9000 },
  { name: "Additional seats (10)", sku: "ADD-SEATS-10", price: 3000 },
] as const;

export const productId = (p: number) => String(3_000_000 + p);

export const customObjectTypeId = "2-24512345";

/** One CRM record: the fields every table shares and its property map. */
export const record = (
  id: string,
  created: Date,
  updated: Date,
  now: Date,
  properties: Readonly<Record<string, string>>,
) => ({
  id,
  // HubSpot rows use the fetch time as their version.
  version: now,
  created_at: created,
  updated_at: updated,
  _deleted: false,
  properties: new Map(
    Object.entries({
      hs_object_id: id,
      createdate: iso(created),
      hs_lastmodifieddate: iso(updated),
      ...properties,
    }),
  ),
});

export type Rows = {
  readonly projects: Array<Project>;
  readonly appointments: Array<Appointment>;
  readonly courses: Array<Course>;
  readonly listings: Array<Listing>;
  readonly services: Array<Service>;

  readonly companies: Array<Company>;
  readonly contacts: Array<Contact>;
  readonly deals: Array<Deal>;
  readonly line_items: Array<LineItem>;
  readonly quotes: Array<Quote>;
  readonly deal_split: Array<DealSplit>;
  readonly tickets: Array<Ticket>;
  readonly calls: Array<Call>;
  readonly emails: Array<Email>;
  readonly meetings: Array<Meeting>;
  readonly notes: Array<Note>;
  readonly tasks: Array<Task>;
  readonly communications: Array<Communication>;
  readonly postal_mail: Array<PostalMail>;
  readonly feedback_submissions: Array<FeedbackSubmission>;
  readonly leads: Array<Lead>;
  readonly invoices: Array<Invoice>;
  readonly orders: Array<Order>;
  readonly carts: Array<Cart>;
  readonly commerce_payments: Array<CommercePayment>;
  readonly subscriptions: Array<Subscription>;
  readonly custom_objects: Array<CustomObject>;
};

/** Date helpers for one run. `at` keeps a time from going past now. */
export const clock = ({ faker, now }: Demo.DemoContext) => {
  const at = (time: number) => new Date(Math.min(time, now.getTime()));

  const between = (from: Date, to: Date) =>
    faker.date.between({ from, to: at(Math.max(from.getTime(), to.getTime())) });

  return { at, between };
};

type CompanyContact = {
  readonly id: string;
  readonly first: string;
  readonly last: string;
  readonly email: string;
  readonly created: Date;
};

export type DealPlan = {
  readonly id: string;
  readonly opened: Date;
  readonly stage: (typeof dealStages)[number];
  readonly closed: Date | null;
  readonly lines: ReadonlyArray<{ readonly p: number; readonly quantity: number }>;
  readonly amount: number;
  readonly won: boolean;
};

/** One company being built: the run's tools, its rows so far, and what its parts need to know. */
export type CompanyGroup = Demo.DemoContext &
  ReturnType<typeof clock> & {
    readonly rows: Rows;
    readonly index: number;
    readonly companyId: string;
    readonly name: string;
    readonly owner: number;
    readonly created: Date;
    readonly contacts: ReadonlyArray<CompanyContact>;
    readonly contactIds: ReadonlyArray<string>;
    readonly dealIds: ReadonlyArray<string>;
    readonly customer: boolean;
    readonly main: CompanyContact | undefined;
  };

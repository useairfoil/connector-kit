import type { Demo } from "@useairfoil/connector-kit";

import { Duration } from "effect";

import type { TicketComment } from "../schemas/comments";
import type { SurveyResponse } from "../schemas/csat";
import type { OrganizationMembership } from "../schemas/memberships";
import type { SatisfactionRating } from "../schemas/satisfaction";
import type { TalkCall, TalkLeg } from "../schemas/talk";
import type { TicketAudit, TicketFieldChange, TicketMetricEvent } from "../schemas/ticket-events";
import type { Ticket } from "../schemas/tickets";
import type { User } from "../schemas/users";

export const minute = Duration.toMillis(Duration.minutes(1));
export const day = Duration.toMillis(Duration.days(1));
export const helpCenter = "https://acme.zendesk.com/hc/en-us";

// Zendesk IDs are numbers. Each kind gets its own range.
export const brandId = 360_000_000_001n;
export const groupId = (g: number) => 360_000_100_000n + BigInt(g);
export const agentId = (a: number) => 360_000_200_000n + BigInt(a);
export const endUserId = (index: number) => 380_000_000_000n + BigInt(index);
export const organizationId = (o: number) => 360_000_300_000n + BigInt(o);
export const formId = (f: number) => 360_000_400_000n + BigInt(f);
export const fieldId = (f: number) => 360_000_500_000n + BigInt(f);
export const slaId = 360_000_600_001n;
export const talkLineId = 360_001_500_001n;
export const surveyId = "01JDEMO00000000000000CSAT1";

export const groups = ["Support", "Billing", "Technical", "VIP"] as const;
export const vipGroup = 3;
export const agentCount = 12;
export const organizationCount = 40;

export const productAreas = ["billing", "login", "integrations", "mobile", "reporting"] as const;
export const plans = ["free", "pro", "enterprise"] as const;

// Custom ticket fields, after the system ones.
export const productAreaField = fieldId(10);
export const planField = fieldId(11);

export const statusIds = { new: 1n, open: 2n, pending: 3n, hold: 4n, solved: 5n } as const;

export const subjects: Record<(typeof productAreas)[number], ReadonlyArray<string>> = {
  billing: ["Charged twice this month", "Can't update my card", "Need an invoice for last month"],
  login: [
    "Can't log in after password reset",
    "Two-factor code never arrives",
    "Locked out of my account",
  ],
  integrations: [
    "Slack notifications stopped",
    "Salesforce sync is failing",
    "Webhook returns 500",
  ],
  mobile: [
    "App crashes on startup",
    "Push notifications don't work",
    "Can't upload photos from iOS",
  ],
  reporting: [
    "Export to CSV is empty",
    "Dashboard numbers look wrong",
    "Scheduled report didn't send",
  ],
};

export const articleTitles = [
  ["Create your account", "Invite your team", "Set up your workspace", "Import your data"],
  [
    "Update your payment method",
    "Download invoices",
    "Change your plan",
    "Cancel your subscription",
  ],
  ["Reset your password", "Fix sync errors", "Troubleshoot notifications", "Contact support"],
] as const;

export const categories = ["Getting started", "Billing", "Troubleshooting"] as const;

export const slug = (text: string) => text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-");

export type Rows = {
  readonly users: Array<User>;
  readonly organization_memberships: Array<OrganizationMembership>;
  readonly tickets: Array<Ticket>;
  readonly ticket_comments: Array<TicketComment>;
  readonly ticket_field_history: Array<TicketFieldChange>;
  readonly ticket_metric_events: Array<TicketMetricEvent>;
  readonly ticket_audits: Array<TicketAudit>;
  readonly talk_calls: Array<TalkCall>;
  readonly talk_legs: Array<TalkLeg>;
  readonly satisfaction_ratings: Array<SatisfactionRating>;
  readonly survey_responses: Array<SurveyResponse>;
};

/** Date helpers for one run. `at` keeps a time from going past now. */
export const clock = ({ faker, now }: Demo.DemoContext) => {
  const at = (time: number) => new Date(Math.min(time, now.getTime()));

  const later = (from: Date, min: number, max: number) =>
    at(from.getTime() + faker.number.int({ min, max }));

  return { at, later };
};

export const minutes = (from: Date, to: Date) =>
  BigInt(Math.round((to.getTime() - from.getTime()) / minute));

/**
 * One customer being built: the run's tools, their rows so far, and what their
 * tickets need to know.
 */
export type CustomerGroup = Demo.DemoContext &
  ReturnType<typeof clock> & {
    readonly rows: Rows;
    readonly index: number;
    readonly userId: bigint;
    readonly joined: Date;
    readonly vip: boolean;
    readonly plan: string;
    readonly organization: number | undefined;
  };

import type { Demo } from "@useairfoil/connector-kit";

import { DateTime, Duration } from "effect";

import type { Comment } from "../schemas/comments";
import type { CustomerNeed } from "../schemas/customers";
import type {
  Attachment,
  Issue,
  IssueHistory,
  IssueRelation,
  IssueStateSpan,
} from "../schemas/issues";
import type { IssueToRelease } from "../schemas/releases";

export const hour = Duration.toMillis(Duration.hours(1));
export const day = Duration.toMillis(Duration.days(1));
export const workspace = "https://linear.app/acme";

// Linear IDs are UUIDs. Each kind gets its own first block, and the index ends the ID.
export const uuid = (kind: number, index: number, part = 0) =>
  `${kind.toString(16).padStart(8, "0")}-${part.toString(16).padStart(4, "0")}-4000-8000-${index.toString(16).padStart(12, "0")}`;

export const dateOnly = (date: Date) => DateTime.formatIsoDateUtc(DateTime.fromDateUnsafe(date));

export const teams = [
  { key: "ENG", name: "Engineering", cycles: true, triage: false },
  { key: "DES", name: "Design", cycles: true, triage: false },
  { key: "PRD", name: "Product", cycles: false, triage: false },
  { key: "SUP", name: "Support", cycles: false, triage: true },
] as const;

export const states = [
  { name: "Triage", type: "triage", color: "#FC7840" },
  { name: "Backlog", type: "backlog", color: "#BEC2C8" },
  { name: "Todo", type: "unstarted", color: "#E2E2E2" },
  { name: "In Progress", type: "started", color: "#F2C94C" },
  { name: "In Review", type: "started", color: "#0F783C" },
  { name: "Done", type: "completed", color: "#5E6AD2" },
  { name: "Canceled", type: "canceled", color: "#95A2B3" },
] as const;

export const issueLabels = [
  { name: "Bug", color: "#EB5757" },
  { name: "Feature", color: "#BB87FC" },
  { name: "Improvement", color: "#4EA7FC" },
  { name: "Docs", color: "#4CB782" },
] as const;

export const projectStatuses = [
  { name: "Backlog", type: "backlog", color: "#bec2c8" },
  { name: "Planned", type: "planned", color: "#e2e2e2" },
  { name: "In Progress", type: "started", color: "#f2c94c" },
  { name: "Paused", type: "paused", color: "#95a2b3" },
  { name: "Completed", type: "completed", color: "#5e6ad2" },
  { name: "Canceled", type: "canceled", color: "#95a2b3" },
] as const;

export const projects = [
  "Onboarding revamp",
  "Billing v2",
  "Mobile offline mode",
  "Search relevance",
  "SSO for enterprise",
  "Design system 2.0",
  "Usage analytics",
  "API rate limits",
] as const;

export const priorities = ["No priority", "Urgent", "High", "Medium", "Low"] as const;
export const userCount = 16;
export const customerCount = 12;
export const months = 12;
export const cycleWeeks = 2;
export const cyclesBack = 26;

export const teamId = (t: number) => uuid(1, t);
export const stateId = (t: number, s: number) => uuid(2, t, s);
export const userId = (u: number) => uuid(3, u);
export const labelId = (l: number) => uuid(4, l);
export const projectId = (p: number) => uuid(5, p);
export const milestoneId = (p: number, m: number) => uuid(6, p, m);
export const cycleId = (t: number, n: number) => uuid(7, t, n);
export const customerId = (c: number) => uuid(8, c);
export const pipelineId = uuid(9, 0);
export const releaseId = (m: number) => uuid(10, m);
export const initiativeId = (i: number) => uuid(11, i);
export const issueId = (index: number) => uuid(12, index);

// Cycles end on the Monday nearest now, so the last one is current.
export const cycleStart = (now: Date, n: number) =>
  new Date(now.getTime() - (cyclesBack - n) * cycleWeeks * 7 * day);

export const stamp = (created: Date, updated: Date) => ({
  version: updated,
  created_at: created,
  updated_at: updated,
  archived_at: null,
});

export const nameFor = (faker: Demo.DemoContext["faker"]) => {
  const first = faker.person.firstName();
  const last = faker.person.lastName();

  return { first, last, name: `${first} ${last}` };
};

/** Date helpers for one run. `at` keeps a time from going past now. */
export const clock = ({ faker, now }: Demo.DemoContext) => {
  const at = (time: number) => new Date(Math.min(time, now.getTime()));

  const later = (from: Date, min: number, max: number) =>
    at(from.getTime() + faker.number.int({ min, max }));

  return { at, later };
};

export type Rows = {
  readonly issues: Array<Issue>;
  readonly issue_history: Array<IssueHistory>;
  readonly issue_state_spans: Array<IssueStateSpan>;
  readonly comments: Array<Comment>;
  readonly issue_relations: Array<IssueRelation>;
  readonly attachments: Array<Attachment>;
  readonly customer_needs: Array<CustomerNeed>;
  readonly issue_to_releases: Array<IssueToRelease>;
};

export const verbs = ["Fix", "Add", "Improve", "Update", "Remove", "Support"] as const;

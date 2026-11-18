import type { Demo } from "@useairfoil/connector-kit";

import {
  agentCount,
  agentId,
  clock,
  type CustomerGroup,
  day,
  endUserId,
  groupId,
  groups,
  minute,
  organizationCount,
  organizationId,
  type Rows,
} from "./shared";
import { ticketRows } from "./tickets";

/**
 * One group is one customer and their tickets. Agents share the users table,
 * so the first groups also carry one agent each.
 */
export const customerRows = (index: number, context: Demo.DemoContext): Rows => {
  const { faker, now } = context;
  const { at } = clock(context);

  const rows: Rows = {
    users: [],
    organization_memberships: [],
    tickets: [],
    ticket_comments: [],
    ticket_field_history: [],
    ticket_metric_events: [],
    ticket_audits: [],
    talk_calls: [],
    talk_legs: [],
    satisfaction_ratings: [],
    survey_responses: [],
  };

  const setup = new Date(now.getTime() - 900 * day);

  if (index < agentCount) {
    const first = faker.person.firstName();
    const last = faker.person.lastName();
    const agentGroup = index % groups.length;

    rows.users.push({
      id: agentId(index),
      version: setup,
      created_at: setup,
      updated_at: setup,
      name: `${first} ${last}`,
      email: faker.internet.exampleEmail({ firstName: first, lastName: last }).toLowerCase(),
      role: index === 0 ? "admin" : "agent",
      custom_role_id: index === 0 ? null : index < 2 ? 360_000_700_001n : 360_000_700_002n,
      organization_id: null,
      default_group_id: groupId(agentGroup),
      suspended: false,
      verified: true,
      locale: "en-US",
      time_zone: "Eastern Time (US & Canada)",
      external_id: null,
      last_login_at: at(now.getTime() - faker.number.int({ min: minute, max: 2 * day })),
      tags: [],
      user_fields: new Map(),
      identities: [],
    });
  }

  const first = faker.person.firstName();
  const last = faker.person.lastName();
  const email = faker.internet.exampleEmail({ firstName: first, lastName: last }).toLowerCase();
  const userId = endUserId(index);

  const organization = faker.helpers.maybe(() => faker.number.int({ max: organizationCount - 1 }), {
    probability: 0.6,
  });

  const vip = organization !== undefined && organization < 6;
  const plan = vip ? "enterprise" : faker.helpers.arrayElement(["free", "pro", "pro"]);
  const joined = at(now.getTime() - faker.number.int({ min: 10 * day, max: 700 * day }));

  if (organization !== undefined) {
    rows.organization_memberships.push({
      id: 362_000_000_000n + BigInt(index),
      version: joined,
      created_at: joined,
      updated_at: joined,
      user_id: userId,
      organization_id: organizationId(organization),
      default: true,
      view_tickets: false,
    });
  }

  let lastActive = joined;
  const ticketCount = faker.number.int({ min: 1, max: 3 });

  const customer: CustomerGroup = {
    ...context,
    ...clock(context),
    rows,
    index,
    userId,
    joined,
    vip,
    plan,
    organization,
  };

  for (let n = 0; n < ticketCount; n++) {
    const updated = ticketRows(customer, n);
    lastActive = updated > lastActive ? updated : lastActive;
  }

  rows.users.push({
    id: userId,
    version: lastActive,
    created_at: joined,
    updated_at: lastActive,
    name: `${first} ${last}`,
    email,
    role: "end-user",
    custom_role_id: null,
    organization_id: organization === undefined ? null : organizationId(organization),
    default_group_id: null,
    suspended: false,
    verified: true,
    locale: "en-US",
    time_zone: null,
    external_id: null,
    last_login_at: null,
    tags: [plan],
    user_fields: new Map([["plan", plan]]),
    identities: [
      {
        id: 44_000_000_000n + BigInt(index),
        type: "email",
        value: email,
        verified: true,
        primary: true,
      },
    ],
  });

  return rows;
};

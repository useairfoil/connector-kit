import type { Demo } from "@useairfoil/connector-kit";

import { activityRows, ticketRows } from "./activity";
import { dealRows } from "./deals";
import {
  clock,
  type CompanyGroup,
  customObjectTypeId,
  day,
  dealStages,
  idOf,
  iso,
  ownerCount,
  ownerId,
  products,
  record,
  type Rows,
} from "./shared";

/** One group is one company with its contacts, deals, tickets, activity, and billing. */
export const companyRows = (index: number, context: Demo.DemoContext) => {
  const { faker, now } = context;
  const { at, between } = clock(context);

  const rows: Rows = {
    companies: [],
    projects: [],
    appointments: [],
    courses: [],
    listings: [],
    services: [],

    contacts: [],
    deals: [],
    line_items: [],
    quotes: [],
    deal_split: [],
    tickets: [],
    calls: [],
    emails: [],
    meetings: [],
    notes: [],
    tasks: [],
    communications: [],
    postal_mail: [],
    feedback_submissions: [],
    leads: [],
    invoices: [],
    orders: [],
    carts: [],
    commerce_payments: [],
    subscriptions: [],
    custom_objects: [],
  };

  const owner = faker.number.int({ max: ownerCount - 1 });
  const companyId = idOf(10_000_000_000, index);
  const name = faker.company.name();
  const domain = `${name.toLowerCase().replaceAll(/[^a-z]+/g, "")}.example.com`;
  const employees = faker.helpers.arrayElement([12, 45, 120, 380, 1_200, 5_000]);
  const created = at(now.getTime() - faker.number.int({ min: 20 * day, max: 700 * day }));

  rows.projects.push({
    ...record(idOf(81_000_000_000, index), created, created, now, {
      hs_name: "Reporting rollout",
      company_name: name,
    }),
  });
  rows.appointments.push({
    ...record(idOf(82_000_000_000, index), created, created, now, {
      hs_name: "Set up reporting",
      company_name: name,
    }),
  });
  rows.courses.push({
    ...record(idOf(83_000_000_000, index), created, created, now, {
      hs_name: "Analytics training",
      company_name: name,
    }),
  });
  rows.listings.push({
    ...record(idOf(84_000_000_000, index), created, created, now, {
      hs_name: "Office suite listing",
      company_name: name,
    }),
  });
  rows.services.push({
    ...record(idOf(85_000_000_000, index), created, created, now, {
      hs_name: "Data onboarding",
      company_name: name,
    }),
  });

  // Contacts at the company. The first one is the main contact.
  const contacts = Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, (_, n) => {
    const first = faker.person.firstName();
    const last = faker.person.lastName();

    return {
      id: idOf(20_000_000_000, index, n),
      first,
      last,
      email: `${first}.${last}@${domain}`.toLowerCase(),
      created: between(created, new Date(created.getTime() + 60 * day)),
    };
  });

  const contactIds = contacts.map((contact) => contact.id);

  // Deals: most companies have one, some two. Won deals bring billing records.
  const deals = Array.from(
    {
      length: faker.helpers.weightedArrayElement([
        { weight: 25, value: 0 },
        { weight: 55, value: 1 },
        { weight: 20, value: 2 },
      ]),
    },
    (_, n) => {
      const id = idOf(30_000_000_000, index, n);
      const opened = between(created, now);

      const stage = faker.helpers.weightedArrayElement([
        { weight: 35, value: dealStages[5] },
        { weight: 20, value: dealStages[6] },
        ...dealStages.slice(0, 5).map((value) => ({ weight: 9, value })),
      ]);

      const closed = stage.id.startsWith("closed")
        ? between(opened, new Date(opened.getTime() + 90 * day))
        : null;

      const plan = faker.number.int({ max: 2 });

      const addOn = faker.helpers.maybe(() => 3 + faker.number.int({ max: 2 }), {
        probability: 0.5,
      });

      const lines = [plan, ...(addOn === undefined ? [] : [addOn])].map((p) => ({
        p,
        quantity: 1,
      }));

      const amount = lines.reduce(
        (sum, line) => sum + (products[line.p]?.price ?? 0) * line.quantity,
        0,
      );

      return { id, opened, stage, closed, lines, amount, won: stage.id === "closedwon" };
    },
  );

  const dealIds = deals.map((deal) => deal.id);

  const lastTouch = new Date(
    Math.max(created.getTime(), ...deals.map((deal) => (deal.closed ?? deal.opened).getTime())),
  );

  const customer = deals.some((deal) => deal.won);

  rows.companies.push(
    record(companyId, created, lastTouch, now, {
      name,
      domain,
      industry: faker.helpers.arrayElement([
        "COMPUTER_SOFTWARE",
        "FINANCIAL_SERVICES",
        "HOSPITAL_HEALTH_CARE",
        "RETAIL",
        "MARKETING_AND_ADVERTISING",
      ]),
      numberofemployees: String(employees),
      annualrevenue: String(employees * faker.number.int({ min: 80_000, max: 200_000 })),
      city: faker.location.city(),
      country: "United States",
      lifecyclestage: customer ? "customer" : deals.length > 0 ? "opportunity" : "lead",
      hubspot_owner_id: ownerId(owner),
      num_associated_contacts: String(contacts.length),
      num_associated_deals: String(deals.length),
    }),
  );

  for (const contact of contacts) {
    rows.contacts.push({
      ...record(
        contact.id,
        contact.created,
        lastTouch > contact.created ? lastTouch : contact.created,
        now,
        {
          firstname: contact.first,
          lastname: contact.last,
          email: contact.email,
          jobtitle: faker.person.jobTitle(),
          phone: faker.phone.number({ style: "international" }),
          company: name,
          lifecyclestage: customer ? "customer" : "salesqualifiedlead",
          hubspot_owner_id: ownerId(owner),
          hs_lead_status: customer
            ? "CONNECTED"
            : faker.helpers.arrayElement(["NEW", "OPEN", "IN_PROGRESS"]),
          lastmodifieddate: iso(lastTouch > contact.created ? lastTouch : contact.created),
        },
      ),
      company_ids: [companyId],
    });
  }

  const main = contacts[0];

  if (main && !customer) {
    rows.leads.push({
      ...record(idOf(40_000_000_000, index), main.created, main.created, now, {
        hs_lead_name: `${main.first} ${main.last} - ${name}`,
        hs_lead_type: "NEW_BUSINESS",
        hs_pipeline: "lead-pipeline-id",
        hs_pipeline_stage: deals.length > 0 ? "qualified-stage-id" : "new-stage-id",
        hubspot_owner_id: ownerId(owner),
      }),
      company_ids: [companyId],
      contact_ids: [main.id],
    });
  }

  const company: CompanyGroup = {
    ...context,
    ...clock(context),
    rows,
    index,
    companyId,
    name,
    owner,
    created,
    contacts,
    contactIds,
    dealIds,
    customer,
    main,
  };

  deals.forEach((deal, n) => dealRows(company, deal, n));
  const tickets = ticketRows(company);
  activityRows(company, tickets);

  // Customers get a yearly NPS survey.
  if (customer && main && faker.datatype.boolean({ probability: 0.5 })) {
    const answered = between(created, now);

    const score = faker.helpers.weightedArrayElement([
      { weight: 50, value: faker.number.int({ min: 9, max: 10 }) },
      { weight: 30, value: faker.number.int({ min: 7, max: 8 }) },
      { weight: 20, value: faker.number.int({ min: 0, max: 6 }) },
    ]);

    rows.feedback_submissions.push({
      ...record(idOf(95_000_000_000, index), answered, answered, now, {
        hs_survey_type: "NPS",
        hs_survey_channel: "EMAIL",
        hs_response_value: String(score),
        hs_sentiment: score >= 9 ? "Promoter" : score >= 7 ? "Passive" : "Detractor",
        hs_submission_timestamp: iso(answered),
      }),
      company_ids: [companyId],
      contact_ids: [main.id],
      deal_ids: [],
      ticket_ids: [],
    });
  }

  if (customer) {
    const recordId = idOf(99_000_000_000, index);
    const started = deals.find((deal) => deal.won)?.closed ?? created;
    const done = at(started.getTime() + 45 * day);

    rows.custom_objects.push({
      key: `${customObjectTypeId}:${recordId}`,
      ...record(recordId, started, done, now, {
        project_name: `${name} onboarding`,
        project_status: done < now ? "Live" : "In progress",
        go_live_date: iso(done),
      }),
      company_ids: [companyId],
      contact_ids: main ? [main.id] : [],
      deal_ids: dealIds.slice(0, 1),
      ticket_ids: [],
      object_type_id: customObjectTypeId,
      object_type: "implementation_project",
    });
  }

  const commerceLinks = rows.quotes.map((quote, quoteIndex) => {
    const source = rows.line_items.find((line) =>
      line.deal_ids.some((id) => quote.deal_ids.includes(id)),
    );
    const lineId = idOf(90_000_000_000, index, quoteIndex);
    if (source)
      rows.line_items.push({
        ...source,
        id: lineId,
        deal_ids: [],
        properties: new Map([...source.properties, ["hs_object_id", lineId]]),
      });
    return {
      id: `quotes:${quote.id}`,
      version: quote.version,
      object_type: "quotes",
      object_id: quote.id,
      links: source ? [{ object_type: "line_items", object_id: lineId, labels: [] }] : [],
    };
  });
  const [first, second] = rows.contacts;
  const peerLinks =
    first && second
      ? [
          { contact: first, peer: second },
          { contact: second, peer: first },
        ].map(({ contact, peer }) => ({
          id: `contacts:${contact.id}`,
          version: contact.version,
          object_type: "contacts",
          object_id: contact.id,
          links: [
            {
              object_type: "contacts",
              object_id: peer.id,
              labels: [{ type_id: 449n, category: "HUBSPOT_DEFINED", label: null }],
            },
          ],
        }))
      : [];
  return { ...rows, commerce_links: commerceLinks, peer_links: peerLinks };
};

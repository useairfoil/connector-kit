import type { Demo } from "@useairfoil/connector-kit";

import type { ObjectField } from "../schemas/object-fields";
import type { ObjectRow } from "../schemas/objects";

import {
  campaignId,
  campaigns,
  dateOnly,
  datetime,
  day,
  entryId,
  hour,
  opportunityStages,
  pricebookId,
  productId,
  products,
  profileId,
  resourceId,
  roleId,
  sfid,
  sobject,
  type TableName,
  territoryId,
  topicId,
  topics,
  userCount,
  userId,
  type Value,
} from "./shared";

/** The org setup, written once before any account. */
export const setupRows = ({ faker, now }: Demo.DemoContext) => {
  const setup = new Date(now.getTime() - 900 * day);

  const row = (id: string, fields: Readonly<Record<string, Value>>) =>
    sobject(id, setup, setup, now, fields);

  const picklist = (prefix: string, values: ReadonlyArray<string>) =>
    values.map((name, index) =>
      row(sfid(prefix, index), { ApiName: name, MasterLabel: name, SortOrder: index + 1 }),
    );

  const profiles = ["System Administrator", "Standard User", "Sales User", "Service User"];

  const roles = [
    "CEO",
    "VP Sales",
    "Sales Manager",
    "Account Executive",
    "Support Manager",
    "Support Agent",
  ];

  const people = Array.from({ length: userCount }, (_, u) => ({
    first: faker.person.firstName(),
    last: faker.person.lastName(),
    role: u === 0 ? 0 : u < 3 ? 2 : u < 8 ? 3 : u === 8 ? 4 : 5,
  }));

  const rows: Partial<Record<TableName, Array<ObjectRow>>> = {
    organization: [
      row(sfid("00D", 0), {
        Name: "Acme Analytics",
        OrganizationType: "Enterprise Edition",
        Country: "United States",
        DefaultLocaleSidKey: "en_US",
        TimeZoneSidKey: "America/Los_Angeles",
        FiscalYearStartMonth: 1,
        IsSandbox: false,
      }),
    ],
    opportunity_stages: opportunityStages.map(({ name, probability }, index) =>
      row(sfid("01J", index), {
        ApiName: name,
        MasterLabel: name,
        DefaultProbability: probability,
        IsActive: true,
        IsClosed: name === "Closed Won" || name === "Closed Lost",
        IsWon: name === "Closed Won",
        SortOrder: index + 1,
      }),
    ),
    lead_statuses: [
      "Open - Not Contacted",
      "Working - Contacted",
      "Closed - Not Converted",
      "Closed - Converted",
    ].map((name, index) =>
      row(sfid("01X", index), {
        ApiName: name,
        MasterLabel: name,
        IsConverted: name === "Closed - Converted",
        IsDefault: index === 0,
        SortOrder: index + 1,
      }),
    ),
    case_statuses: picklist("01I", ["New", "Working", "Escalated", "Closed"]),
    contract_statuses: picklist("01S", ["Draft", "In Approval Process", "Activated"]),
    task_statuses: picklist("01J", ["Not Started", "In Progress", "Completed"]),
    task_priorities: picklist("01P", ["High", "Normal", "Low"]),
    solution_statuses: picklist("01N", ["Draft", "Reviewed"]),
    profiles: profiles.map((name, p) =>
      row(profileId(p), { Name: name, UserType: "Standard", Description: null }),
    ),
    user_roles: roles.map((name, r) =>
      row(roleId(r), {
        Name: name,
        ParentRoleId: r === 0 ? null : roleId(r < 4 ? Math.max(0, r - 1) : r === 4 ? 0 : 4),
        RollupDescription: name,
      }),
    ),
    users: people.map((person, u) =>
      row(userId(u), {
        Username: `${person.first}.${person.last}@acme-analytics.example.com`.toLowerCase(),
        FirstName: person.first,
        LastName: person.last,
        Name: `${person.first} ${person.last}`,
        Email: `${person.first}.${person.last}@acme-analytics.example.com`.toLowerCase(),
        Alias: `${person.first.slice(0, 1)}${person.last.slice(0, 4)}`.toLowerCase(),
        IsActive: true,
        ProfileId: profileId(u === 0 ? 0 : u < 8 ? 2 : 3),
        UserRoleId: roleId(person.role),
        Title: roles[person.role] ?? "Account Executive",
        TimeZoneSidKey: "America/Los_Angeles",
        LastLoginDate: datetime(
          new Date(now.getTime() - faker.number.int({ min: hour, max: 5 * day })),
        ),
      }),
    ),
    permission_sets: ["Sales Cloud User", "Service Cloud User", "Analytics Viewer"].map(
      (label, p) =>
        row(sfid("0PS", p), {
          Name: label.replaceAll(" ", "_"),
          Label: label,
          IsOwnedByProfile: false,
        }),
    ),
    permission_set_assignments: people.map((_, u) =>
      row(sfid("0Pa", u), { AssigneeId: userId(u), PermissionSetId: sfid("0PS", u < 8 ? 0 : 1) }),
    ),
    groups: ["Sales Team", "Support Team"].map((name, g) =>
      row(sfid("00G", g), {
        Name: name,
        DeveloperName: name.replaceAll(" ", "_"),
        Type: "Regular",
      }),
    ),
    group_members: people.map((_, u) =>
      row(sfid("011", u), { GroupId: sfid("00G", u < 8 ? 0 : 1), UserOrGroupId: userId(u) }),
    ),
    collaboration_groups: ["All Acme", "Deal Desk"].map((name, g) =>
      row(sfid("0F9", g), {
        Name: name,
        CollaborationType: "Public",
        MemberCount: g === 0 ? userCount : 4,
        OwnerId: userId(0),
      }),
    ),
    collaboration_group_members: people.map((_, u) =>
      row(sfid("0FB", u), {
        CollaborationGroupId: sfid("0F9", 0),
        MemberId: userId(u),
        CollaborationRole: u === 0 ? "Admin" : "Standard",
      }),
    ),
    record_types: [
      ["Enterprise Deal", "Opportunity"],
      ["Support Case", "Case"],
    ].map(([name, type], r) =>
      row(sfid("012", r), {
        Name: name ?? "",
        DeveloperName: (name ?? "").replaceAll(" ", "_"),
        SobjectType: type ?? "",
        IsActive: true,
      }),
    ),
    business_hours: [
      row(sfid("01m", 0), {
        Name: "Default",
        IsDefault: true,
        IsActive: true,
        TimeZoneSidKey: "America/Los_Angeles",
        MondayStartTime: "09:00:00.000Z",
        MondayEndTime: "17:00:00.000Z",
        FridayStartTime: "09:00:00.000Z",
        FridayEndTime: "17:00:00.000Z",
      }),
    ],
    holidays: [
      ["New Year's Day", `${now.getUTCFullYear()}-01-01`],
      ["Independence Day", `${now.getUTCFullYear()}-07-04`],
      ["Thanksgiving", `${now.getUTCFullYear()}-11-26`],
    ].map(([name, date], h) =>
      row(sfid("0C0", h), { Name: name ?? "", ActivityDate: date ?? "", IsAllDay: true }),
    ),
    periods: [0, 1, 2, 3].map((q) => {
      const start = new Date(Date.UTC(now.getUTCFullYear(), q * 3, 1));

      return row(sfid("026", q), {
        Type: "Quarter",
        Number: q + 1,
        StartDate: dateOnly(start),
        EndDate: dateOnly(new Date(Date.UTC(now.getUTCFullYear(), q * 3 + 3, 0))),
        FullyQualifiedLabel: `Q${q + 1}-${now.getUTCFullYear()}`,
      });
    }),
    folders: [
      row(sfid("00l", 0), { Name: "Sales Collateral", Type: "Document", AccessType: "Public" }),
    ],
    documents: ["Pricing sheet", "Security overview", "Case study"].map((name, d) =>
      row(sfid("015", d), {
        Name: name,
        FolderId: sfid("00l", 0),
        Type: "pdf",
        ContentType: "application/pdf",
        BodyLength: faker.number.int({ min: 80_000, max: 2_000_000 }),
        AuthorId: userId(1),
      }),
    ),
    products: products.map((product, p) =>
      row(productId(p), {
        Name: product.name,
        ProductCode: product.code,
        Family: product.family,
        IsActive: true,
        Description: `${product.name}, billed yearly`,
      }),
    ),
    pricebooks: [
      row(pricebookId, { Name: "Standard Price Book", IsStandard: true, IsActive: true }),
    ],
    pricebook_entries: products.map((product, p) =>
      row(entryId(p), {
        Pricebook2Id: pricebookId,
        Product2Id: productId(p),
        UnitPrice: product.price,
        IsActive: true,
        UseStandardPrice: false,
        CurrencyIsoCode: "USD",
      }),
    ),
    campaigns: campaigns.map((name, c) => {
      const start = new Date(now.getTime() - (300 - c * 70) * day);

      return row(campaignId(c), {
        Name: name,
        Type: c === 1 ? "Conference" : c === 3 ? "Email" : "Webinar",
        Status: start < now ? "Completed" : "Planned",
        StartDate: dateOnly(start),
        EndDate: dateOnly(new Date(start.getTime() + 30 * day)),
        BudgetedCost: [20_000, 150_000, 40_000, 5_000][c] ?? 10_000,
        IsActive: true,
        OwnerId: userId(1),
      });
    }),
    campaign_member_statuses: campaigns.flatMap((_, c) =>
      ["Sent", "Responded", "Attended"].map((label, s) =>
        row(sfid("01Y", c * 10 + s), {
          CampaignId: campaignId(c),
          Label: label,
          HasResponded: s > 0,
          IsDefault: s === 0,
          SortOrder: s + 1,
        }),
      ),
    ),
    forecasting_quotas: people.slice(3, 8).flatMap((_, u) =>
      [0, 1, 2, 3].map((q) =>
        row(sfid("0J9", u * 10 + q), {
          QuotaOwnerId: userId(u + 3),
          QuotaAmount: faker.helpers.arrayElement([150_000, 200_000, 250_000]),
          StartDate: dateOnly(new Date(Date.UTC(now.getUTCFullYear(), q * 3, 1))),
          ForecastingTypeId: sfid("0Db", 0),
        }),
      ),
    ),
    solutions: [
      "Reset a user's password",
      "Connect a data warehouse",
      "Fix dashboard timeouts",
    ].map((name, s) =>
      row(sfid("501", s), {
        SolutionName: name,
        SolutionNote: `Steps to ${name.toLowerCase()}.`,
        Status: "Reviewed",
        IsPublished: true,
        OwnerId: userId(9),
      }),
    ),
    macros: ["Send reset link", "Escalate to tier 2"].map((name, m) =>
      row(sfid("0JZ", m), {
        Name: name,
        Description: `${name} macro`,
        IsAlohaSupported: true,
        IsLightningSupported: true,
      }),
    ),
    quick_texts: ["Greeting", "Closing"].map((name, q) =>
      row(sfid("0ex", q), {
        Name: name,
        Message: q === 0 ? "Hi! Thanks for reaching out." : "Glad we could help. Have a great day!",
        Channel: "Email;Phone",
      }),
    ),
    locations: ["Los Angeles warehouse", "Chicago depot"].map((name, l) =>
      row(sfid("131", l), {
        Name: name,
        LocationType: "Warehouse",
        IsInventoryLocation: true,
        IsMobile: false,
      }),
    ),
    service_territories: ["West", "Central"].map((name, t) =>
      row(territoryId(t), {
        Name: `${name} Field Service`,
        IsActive: true,
        OperatingHoursId: sfid("0OH", 0),
      }),
    ),
    service_resources: [9, 10, 11].map((u, r) =>
      row(resourceId(r), {
        Name: `${people[u]?.first ?? "Field"} ${people[u]?.last ?? "Tech"}`,
        RelatedRecordId: userId(u),
        ResourceType: "T",
        IsActive: true,
      }),
    ),
    resource_absences: [0, 1].map((r) => {
      const start = new Date(now.getTime() + (r * 9 + 4) * day);

      return row(sfid("0Ho", r), {
        ResourceId: resourceId(r),
        Type: "Vacation",
        Start: datetime(start),
        End: datetime(new Date(start.getTime() + 3 * day)),
      });
    }),
    product_items: products.slice(3).map((product, p) =>
      row(sfid("0TS", p), {
        Product2Id: productId(p + 3),
        LocationId: sfid("131", p % 2),
        QuantityOnHand: faker.number.int({ min: 5, max: 200 }),
        QuantityUnitOfMeasure: "Each",
      }),
    ),
    topics: topics.map((name, t) =>
      row(topicId(t), { Name: name, TalkingAbout: faker.number.int({ min: 1, max: 40 }) }),
    ),
  };

  // Field definitions for the main objects, as describe returns them.
  const describe: Array<
    readonly [string, string, string, string, ReadonlyArray<string>, ReadonlyArray<string>]
  > = [
    ["Account", "Name", "Account Name", "string", [], []],
    [
      "Account",
      "Industry",
      "Industry",
      "picklist",
      ["Technology", "Finance", "Healthcare", "Retail", "Manufacturing"],
      [],
    ],
    ["Account", "OwnerId", "Owner ID", "reference", [], ["User"]],
    ["Contact", "AccountId", "Account ID", "reference", [], ["Account"]],
    ["Contact", "Email", "Email", "email", [], []],
    [
      "Opportunity",
      "StageName",
      "Stage",
      "picklist",
      opportunityStages.map((stage) => stage.name),
      [],
    ],
    ["Opportunity", "Amount", "Amount", "currency", [], []],
    ["Case", "Status", "Status", "picklist", ["New", "Working", "Escalated", "Closed"], []],
    ["Case", "Priority", "Priority", "picklist", ["Low", "Medium", "High"], []],
  ];

  const objectFields: Array<ObjectField> = describe.map(
    ([object, name, label, type, picklist, references]) => ({
      id: `${object}.${name}`,
      version: now,
      object,
      name,
      label,
      type,
      custom: false,
      calculated: false,
      nillable: name !== "Name" && name !== "StageName",
      length: type === "string" ? 255n : type === "email" ? 80n : type === "reference" ? 18n : 0n,
      precision: type === "currency" ? 18n : 0n,
      scale: type === "currency" ? 2n : 0n,
      reference_to: [...references],
      picklist_values: picklist.map((value) => ({ value, label: value, active: true })),
    }),
  );

  return { ...rows, object_fields: objectFields };
};

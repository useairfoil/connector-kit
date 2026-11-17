import type { Demo } from "@useairfoil/connector-kit";
import type { Schema } from "effect";

import type { CsatSurvey } from "../schemas/csat";
import type {
  CustomObject,
  CustomObjectField,
  CustomObjectRecord,
} from "../schemas/custom-objects";
import type { GroupMembership } from "../schemas/memberships";
import type { Organization } from "../schemas/organizations";
import type { TalkLine } from "../schemas/talk";

import {
  BrandSchema,
  CustomRoleSchema,
  CustomStatusSchema,
  GroupSchema,
  MacroSchema,
  OrganizationFieldSchema,
  ScheduleSchema,
  SlaPolicySchema,
  TicketFieldSchema,
  TicketFormSchema,
  UserFieldSchema,
} from "../schemas/lists";
import { helpCenterTables } from "./help-center";
import {
  agentCount,
  agentId,
  brandId,
  day,
  fieldId,
  formId,
  groupId,
  groups,
  organizationCount,
  organizationId,
  planField,
  plans,
  productAreaField,
  productAreas,
  slaId,
  slug,
  statusIds,
  surveyId,
  talkLineId,
  vipGroup,
} from "./shared";

type Group = Schema.Schema.Type<typeof GroupSchema>;
type Brand = Schema.Schema.Type<typeof BrandSchema>;
type TicketField = Schema.Schema.Type<typeof TicketFieldSchema>;
type TicketForm = Schema.Schema.Type<typeof TicketFormSchema>;
type CustomStatus = Schema.Schema.Type<typeof CustomStatusSchema>;
type UserField = Schema.Schema.Type<typeof UserFieldSchema>;
type OrganizationField = Schema.Schema.Type<typeof OrganizationFieldSchema>;
type CustomRole = Schema.Schema.Type<typeof CustomRoleSchema>;
type SlaPolicy = Schema.Schema.Type<typeof SlaPolicySchema>;
type ScheduleRow = Schema.Schema.Type<typeof ScheduleSchema>;
type Macro = Schema.Schema.Type<typeof MacroSchema>;

/** The account setup, written once before any customer. */
export const setupRows = ({ faker, now }: Demo.DemoContext) => {
  const setup = new Date(now.getTime() - 900 * day);
  const stamp = { version: setup, created_at: setup, updated_at: setup };

  const brands: Array<Brand> = [
    {
      id: brandId,
      ...stamp,
      name: "Acme",
      subdomain: "acme",
      brand_url: "https://acme.zendesk.com",
      active: true,
      default: true,
    },
  ];

  const groupRows: Array<Group> = groups.map((name, g) => ({
    id: groupId(g),
    ...stamp,
    name,
    description: g === vipGroup ? "Enterprise customers" : `${name} questions`,
    default: g === 0,
    is_public: true,
  }));

  const statuses: Array<CustomStatus> = [
    ...Object.entries(statusIds).map(([category, id]) => ({
      id,
      ...stamp,
      status_category: category,
      agent_label: category[0]?.toUpperCase() + category.slice(1),
      end_user_label:
        category === "solved" ? "Solved" : category === "new" ? "Open" : "Awaiting reply",
      active: true,
      default: true,
    })),
    {
      id: 6n,
      ...stamp,
      status_category: "open",
      agent_label: "Waiting on engineering",
      end_user_label: "In progress",
      active: true,
      default: false,
    },
  ];

  const systemFields = [
    ["subject", "Subject"],
    ["description", "Description"],
    ["status", "Status"],
    ["tickettype", "Type"],
    ["priority", "Priority"],
    ["group", "Group"],
    ["assignee", "Assignee"],
  ] as const;

  const ticketFields: Array<TicketField> = [
    ...systemFields.map(([type, title], f) => ({
      id: fieldId(f),
      ...stamp,
      type,
      title,
      raw_title: title,
      active: true,
      required: type === "subject",
      custom_field_options: [],
    })),
    ...[
      { id: productAreaField, title: "Product area", values: productAreas },
      { id: planField, title: "Plan", values: plans },
    ].map((field) => ({
      id: field.id,
      ...stamp,
      type: "tagger",
      title: field.title,
      raw_title: field.title,
      active: true,
      required: false,
      custom_field_options: field.values.map((value, o) => ({
        id: field.id * 100n + BigInt(o),
        name: value[0]?.toUpperCase() + value.slice(1),
        value,
      })),
    })),
  ];

  const allFieldIds = ticketFields.map((field) => field.id);

  const forms: Array<TicketForm> = [
    {
      id: formId(0),
      ...stamp,
      name: "Default ticket form",
      display_name: "Get help",
      active: true,
      default: true,
      ticket_field_ids: allFieldIds,
    },
    {
      id: formId(1),
      ...stamp,
      name: "Billing request",
      display_name: "Billing question",
      active: true,
      default: false,
      ticket_field_ids: [...allFieldIds.slice(0, 3), planField],
    },
  ];

  const userFields: Array<UserField> = [
    {
      id: fieldId(20),
      ...stamp,
      key: "plan",
      type: "dropdown",
      title: "Plan",
      active: true,
      position: 0n,
      custom_field_options: plans.map((value, o) => ({
        id: fieldId(20) * 100n + BigInt(o),
        name: value,
        value,
      })),
    },
  ];

  const organizationFields: Array<OrganizationField> = [
    {
      id: fieldId(30),
      ...stamp,
      key: "account_tier",
      type: "dropdown",
      title: "Account tier",
      active: true,
      position: 0n,
      custom_field_options: ["smb", "mid_market", "enterprise"].map((value, o) => ({
        id: fieldId(30) * 100n + BigInt(o),
        name: value.replace("_", " "),
        value,
      })),
    },
  ];

  const roles: Array<CustomRole> = [
    {
      id: 360_000_700_001n,
      ...stamp,
      name: "Team lead",
      description: "Can manage macros and see reports.",
      role_type: 0n,
      team_member_count: 2n,
      configuration: new Map([
        ["ticket_access", "all"],
        ["manage_macros", "true"],
        ["view_reports", "true"],
      ]),
    },
    {
      id: 360_000_700_002n,
      ...stamp,
      name: "Agent",
      description: null,
      role_type: 0n,
      team_member_count: BigInt(agentCount - 2),
      configuration: new Map([
        ["ticket_access", "within-groups"],
        ["manage_macros", "false"],
        ["view_reports", "false"],
      ]),
    },
  ];

  const slaPolicies: Array<SlaPolicy> = [
    {
      id: slaId,
      ...stamp,
      title: "Enterprise SLA",
      description: "Faster replies for enterprise customers.",
      position: 1n,
      filter: JSON.stringify({
        all: [{ field: "group_id", operator: "is", value: String(groupId(vipGroup)) }],
        any: [],
      }),
      policy_metrics: ["urgent", "high", "normal", "low"].map((priority, p) => ({
        priority,
        metric: "first_reply_time",
        target_in_seconds: BigInt([30, 60, 240, 480][p] ?? 480) * 60n,
        business_hours: priority !== "urgent",
      })),
    },
  ];

  // Monday to Friday, 9:00 to 17:00. Minutes count from Sunday midnight.
  const schedules: Array<ScheduleRow> = [
    {
      id: 360_000_800_001n,
      version: now,
      created_at: setup,
      updated_at: setup,
      name: "Business hours",
      time_zone: "Eastern Time (US & Canada)",
      intervals: [1, 2, 3, 4, 5].map((weekday) => ({
        start_time: BigInt(weekday * 1440 + 540),
        end_time: BigInt(weekday * 1440 + 1020),
      })),
      holidays: [
        {
          id: 360_000_810_001n,
          name: "New Year's Day",
          start_date: `${now.getUTCFullYear()}-01-01`,
          end_date: `${now.getUTCFullYear()}-01-01`,
        },
        {
          id: 360_000_810_002n,
          name: "Christmas",
          start_date: `${now.getUTCFullYear()}-12-25`,
          end_date: `${now.getUTCFullYear()}-12-26`,
        },
      ],
    },
  ];

  const macroDefinitions: ReadonlyArray<{
    readonly title: string;
    readonly actions: ReadonlyArray<readonly [string, string]>;
  }> = [
    {
      title: "Close and thank",
      actions: [
        ["status", "solved"],
        ["comment_value", "Glad we could help! Let us know if anything else comes up."],
      ],
    },
    {
      title: "Ask for logs",
      actions: [
        ["status", "pending"],
        ["comment_value", "Could you send us the logs from the last time this happened?"],
      ],
    },
    {
      title: "Escalate to billing",
      actions: [
        ["group_id", String(groupId(1))],
        ["priority", "high"],
      ],
    },
    {
      title: "Send to engineering",
      actions: [
        ["custom_status_id", "6"],
        ["comment_mode_is_public", "false"],
      ],
    },
  ];

  const macros: Array<Macro> = macroDefinitions.map(({ title, actions }, m) => ({
    id: 360_000_900_000n + BigInt(m),
    ...stamp,
    title,
    description: null,
    active: true,
    position: BigInt(m),
    actions: actions.map(([field, value]) => ({ field, value })),
    restriction: null,
  }));

  const helpCenterSetup = helpCenterTables({ faker, now }, setup);

  const lines: Array<TalkLine> = [
    {
      id: talkLineId,
      version: now,
      created_at: setup,
      line_type: "phone",
      nickname: "Main support line",
      number: "+15550100100",
      display_number: "+1 (555) 010-0100",
      country_code: "US",
      toll_free: false,
      brand_id: brandId,
      default_group_id: groupId(0),
      group_ids: [groupId(0), groupId(vipGroup)],
      priority: 0n,
      recorded: true,
      transcription: true,
    },
  ];

  const surveys: Array<CsatSurvey> = [
    {
      id: surveyId,
      version: setup,
      survey_version: 1n,
      state: "enabled",
      created_at: setup,
      updated_at: setup,
      questions: [
        {
          id: "01JDEMO0000000000000QRATE1",
          type: "rating_scale_numeric",
          sub_type: "customer_satisfaction",
          headline: "How would you rate the support you received?",
          options: [1, 2, 3, 4, 5].map((rating) => ({
            id: null,
            rating: BigInt(rating),
            label: "",
          })),
        },
        {
          id: "01JDEMO0000000000000QTEXT1",
          type: "open_ended",
          sub_type: null,
          headline: "Tell us more about your experience",
          options: [],
        },
      ],
    },
  ];

  const organizations: Array<Organization> = Array.from({ length: organizationCount }, (_, o) => {
    const name = faker.company.name();
    const tier = o < 6 ? "enterprise" : o < 18 ? "mid_market" : "smb";
    const created = new Date(setup.getTime() + o * 15 * day);

    return {
      id: organizationId(o),
      version: created,
      created_at: created,
      updated_at: created,
      name,
      external_id: null,
      group_id: tier === "enterprise" ? groupId(vipGroup) : null,
      domain_names: [`${slug(name).replaceAll("-", "")}.example.com`],
      tags: [tier],
      organization_fields: new Map([["account_tier", tier]]),
    };
  });

  // Each agent's default group, the same one their user row names.
  const groupMemberships: Array<GroupMembership> = Array.from({ length: agentCount }, (_, a) => ({
    id: 361_000_000_000n + BigInt(a),
    ...stamp,
    user_id: agentId(a),
    group_id: groupId(a % groups.length),
    default: true,
  }));

  const planObject = "service_plan";
  const customObjects: Array<CustomObject> = [
    {
      key: planObject,
      version: setup,
      title: "Service plan",
      title_pluralized: "Service plans",
      description: "Support plans sold to customers.",
      created_at: setup,
      updated_at: setup,
    },
  ];
  const customObjectFields: Array<CustomObjectField> = [
    {
      id: 361_100_000_001n,
      version: setup,
      custom_object_key: planObject,
      key: "tier",
      title: "Tier",
      type: "dropdown",
      active: true,
      required: true,
      custom_field_options: plans.map((plan) => ({ name: plan, value: plan })),
      created_at: setup,
      updated_at: setup,
    },
    {
      id: 361_100_000_002n,
      version: setup,
      custom_object_key: planObject,
      key: "organization",
      title: "Organization",
      type: "lookup",
      active: true,
      required: false,
      relationship_target_type: "zen:organization",
      created_at: setup,
      updated_at: setup,
    },
  ];
  const customObjectRecords: Array<CustomObjectRecord> = organizations.map((organization, o) => ({
    id: `01JDEMOPLAN${String(o).padStart(15, "0")}`,
    version: organization.updated_at,
    custom_object_key: planObject,
    name: `${organization.name} plan`,
    external_id: null,
    custom_object_fields: JSON.stringify({
      tier: plans[o % plans.length],
      organization: String(organization.id),
    }),
    created_at: organization.created_at,
    updated_at: organization.updated_at,
  }));

  return {
    brands,
    groups: groupRows,
    group_memberships: groupMemberships,
    custom_statuses: statuses,
    ticket_fields: ticketFields,
    ticket_forms: forms,
    user_fields: userFields,
    organization_fields: organizationFields,
    custom_roles: roles,
    sla_policies: slaPolicies,
    schedules,
    macros,
    talk_lines: lines,
    custom_objects: customObjects,
    custom_object_fields: customObjectFields,
    custom_object_records: customObjectRecords,
    csat_surveys: surveys,
    organizations,
    ...helpCenterSetup,
  };
};

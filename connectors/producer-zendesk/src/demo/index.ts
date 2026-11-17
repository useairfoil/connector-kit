import { ConnectorApp, Demo, RuntimeConfig } from "@useairfoil/connector-kit";
import { Command } from "effect/cli";

import { TicketCommentSchema } from "../schemas/comments";
import { CsatSurveySchema, SurveyResponseSchema } from "../schemas/csat";
import {
  CustomObjectFieldSchema,
  CustomObjectRecordSchema,
  CustomObjectSchema,
} from "../schemas/custom-objects";
import {
  ArticleSchema,
  ArticleTranslationSchema,
  CategorySchema,
  CommunityCommentSchema,
  CommunityPostSchema,
  CommunityTopicSchema,
  SectionSchema,
} from "../schemas/help-center";
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
import { GroupMembershipSchema, OrganizationMembershipSchema } from "../schemas/memberships";
import { OrganizationSchema } from "../schemas/organizations";
import { SatisfactionRatingSchema } from "../schemas/satisfaction";
import { TalkCallSchema, TalkLegSchema, TalkLineSchema } from "../schemas/talk";
import {
  TicketAuditSchema,
  TicketFieldChangeSchema,
  TicketMetricEventSchema,
} from "../schemas/ticket-events";
import { TicketSchema } from "../schemas/tickets";
import { UserSchema } from "../schemas/users";
import { customerRows } from "./customers";
import { setupRows } from "./setup";

export const demo = Demo.define({
  name: "producer-zendesk",
  setup: {
    tables: [
      Demo.table({ name: "brands", rowSchema: BrandSchema, version: "version" }),
      Demo.table({ name: "groups", rowSchema: GroupSchema, version: "version" }),
      Demo.table({
        name: "group_memberships",
        rowSchema: GroupMembershipSchema,
        version: "version",
      }),
      Demo.table({ name: "custom_statuses", rowSchema: CustomStatusSchema, version: "version" }),
      Demo.table({ name: "ticket_fields", rowSchema: TicketFieldSchema, version: "version" }),
      Demo.table({ name: "ticket_forms", rowSchema: TicketFormSchema, version: "version" }),
      Demo.table({ name: "user_fields", rowSchema: UserFieldSchema, version: "version" }),
      Demo.table({
        name: "organization_fields",
        rowSchema: OrganizationFieldSchema,
        version: "version",
      }),
      Demo.table({ name: "custom_roles", rowSchema: CustomRoleSchema, version: "version" }),
      Demo.table({ name: "sla_policies", rowSchema: SlaPolicySchema, version: "version" }),
      Demo.table({ name: "schedules", rowSchema: ScheduleSchema, version: "version" }),
      Demo.table({ name: "macros", rowSchema: MacroSchema, version: "version" }),
      Demo.table({ name: "categories", rowSchema: CategorySchema, version: "version" }),
      Demo.table({ name: "sections", rowSchema: SectionSchema, version: "version" }),
      Demo.table({ name: "articles", rowSchema: ArticleSchema, version: "version" }),
      Demo.table({
        name: "article_translations",
        rowSchema: ArticleTranslationSchema,
        version: "version",
      }),
      Demo.table({ name: "community_topics", rowSchema: CommunityTopicSchema, version: "version" }),
      Demo.table({ name: "community_posts", rowSchema: CommunityPostSchema, version: "version" }),
      Demo.table({
        name: "community_comments",
        rowSchema: CommunityCommentSchema,
        version: "version",
      }),
      Demo.table({ name: "talk_lines", rowSchema: TalkLineSchema, version: "version" }),
      Demo.table({ name: "custom_objects", rowSchema: CustomObjectSchema, version: "version" }),
      Demo.table({
        name: "custom_object_fields",
        rowSchema: CustomObjectFieldSchema,
        version: "version",
      }),
      Demo.table({
        name: "custom_object_records",
        rowSchema: CustomObjectRecordSchema,
        version: "version",
      }),
      Demo.table({ name: "csat_surveys", rowSchema: CsatSurveySchema, version: "version" }),
      Demo.table({ name: "organizations", rowSchema: OrganizationSchema, version: "version" }),
    ],
    rows: setupRows,
  },
  group: {
    tables: [
      Demo.table({ name: "users", rowSchema: UserSchema, version: "version" }),
      Demo.table({
        name: "organization_memberships",
        rowSchema: OrganizationMembershipSchema,
        version: "version",
      }),
      Demo.table({ name: "tickets", rowSchema: TicketSchema, version: "version" }),
      Demo.table({ name: "ticket_comments", rowSchema: TicketCommentSchema, version: "version" }),
      Demo.table({
        name: "ticket_field_history",
        rowSchema: TicketFieldChangeSchema,
        version: "version",
      }),
      Demo.table({
        name: "ticket_metric_events",
        rowSchema: TicketMetricEventSchema,
        version: "version",
      }),
      Demo.table({ name: "ticket_audits", rowSchema: TicketAuditSchema, version: "version" }),
      Demo.table({ name: "talk_calls", rowSchema: TalkCallSchema, version: "version" }),
      Demo.table({ name: "talk_legs", rowSchema: TalkLegSchema, version: "version" }),
      Demo.table({
        name: "satisfaction_ratings",
        rowSchema: SatisfactionRatingSchema,
        version: "version",
      }),
      Demo.table({ name: "survey_responses", rowSchema: SurveyResponseSchema, version: "version" }),
    ],
    rows: customerRows,
  },
});

export const demoCommand = ConnectorApp.makeDemoCommand(demo).pipe(
  Command.provide(RuntimeConfig.layerHosted()),
);

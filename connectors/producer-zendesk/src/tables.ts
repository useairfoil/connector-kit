import type { Schema } from "effect";

import { TicketCommentSchema } from "./schemas/comments";
import { CsatSurveySchema, SurveyResponseSchema } from "./schemas/csat";
import {
  CustomObjectFieldSchema,
  CustomObjectRecordSchema,
  CustomObjectSchema,
} from "./schemas/custom-objects";
import {
  ArticleSchema,
  ArticleTranslationSchema,
  CategorySchema,
  CommunityCommentSchema,
  CommunityPostSchema,
  CommunityTopicSchema,
  SectionSchema,
} from "./schemas/help-center";
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
} from "./schemas/lists";
import { GroupMembershipSchema, OrganizationMembershipSchema } from "./schemas/memberships";
import { OrganizationSchema } from "./schemas/organizations";
import { SatisfactionRatingSchema } from "./schemas/satisfaction";
import { TalkCallSchema, TalkLegSchema, TalkLineSchema } from "./schemas/talk";
import {
  TicketAuditSchema,
  TicketFieldChangeSchema,
  TicketMetricEventSchema,
} from "./schemas/ticket-events";
import { TicketSchema } from "./schemas/tickets";
import { UserSchema } from "./schemas/users";

export const tableSchemas: Readonly<Record<string, Schema.Top>> = {
  tickets: TicketSchema,
  ticket_comments: TicketCommentSchema,
  users: UserSchema,
  organizations: OrganizationSchema,
  groups: GroupSchema,
  brands: BrandSchema,
  ticket_fields: TicketFieldSchema,
  ticket_forms: TicketFormSchema,
  custom_statuses: CustomStatusSchema,
  survey_responses: SurveyResponseSchema,
  csat_surveys: CsatSurveySchema,
  ticket_field_history: TicketFieldChangeSchema,
  ticket_metric_events: TicketMetricEventSchema,
  ticket_audits: TicketAuditSchema,
  satisfaction_ratings: SatisfactionRatingSchema,
  group_memberships: GroupMembershipSchema,
  organization_memberships: OrganizationMembershipSchema,
  user_fields: UserFieldSchema,
  organization_fields: OrganizationFieldSchema,
  custom_roles: CustomRoleSchema,
  sla_policies: SlaPolicySchema,
  schedules: ScheduleSchema,
  macros: MacroSchema,
  articles: ArticleSchema,
  article_translations: ArticleTranslationSchema,
  sections: SectionSchema,
  categories: CategorySchema,
  community_posts: CommunityPostSchema,
  community_comments: CommunityCommentSchema,
  community_topics: CommunityTopicSchema,
  talk_lines: TalkLineSchema,
  talk_calls: TalkCallSchema,
  talk_legs: TalkLegSchema,
  custom_objects: CustomObjectSchema,
  custom_object_fields: CustomObjectFieldSchema,
  custom_object_records: CustomObjectRecordSchema,
};

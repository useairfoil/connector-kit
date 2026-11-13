declare const __COMMIT_SHA__: string | undefined;

export const commitSha = typeof __COMMIT_SHA__ === "undefined" ? undefined : __COMMIT_SHA__;

export * as ZendeskClient from "./client/client";
export * as ZendeskConnector from "./connector";
export { manifest } from "./manifest";
export type { TicketComment } from "./schemas/comments";
export { TicketCommentSchema } from "./schemas/comments";
export {
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
export type {
  Article,
  Category,
  CommunityPost,
  CommunityTopic,
  Section,
} from "./schemas/help-center";
export {
  ArticleSchema,
  CategorySchema,
  CommunityPostSchema,
  CommunityTopicSchema,
  SectionSchema,
} from "./schemas/help-center";
export type { GroupMembership, OrganizationMembership } from "./schemas/memberships";
export { GroupMembershipSchema, OrganizationMembershipSchema } from "./schemas/memberships";
export type { SatisfactionRating } from "./schemas/satisfaction";
export { SatisfactionRatingSchema } from "./schemas/satisfaction";
export type { TalkLine } from "./schemas/talk";
export { TalkLineSchema } from "./schemas/talk";
export type { TicketFieldChange, TicketMetricEvent } from "./schemas/ticket-events";
export { TicketFieldChangeSchema, TicketMetricEventSchema } from "./schemas/ticket-events";
export type { Organization } from "./schemas/organizations";
export { OrganizationSchema } from "./schemas/organizations";
export type { CsatSurvey, SurveyResponse } from "./schemas/csat";
export { CsatSurveySchema, SurveyResponseSchema } from "./schemas/csat";
export type { Ticket } from "./schemas/tickets";
export { TicketSchema } from "./schemas/tickets";
export type { User } from "./schemas/users";
export { UserSchema } from "./schemas/users";

import { Connector } from "@useairfoil/connector-kit";
import { Config, Context, Effect, Layer } from "effect";

import type { ZendeskConfig } from "./manifest";

import * as ZendeskClient from "./client/client";
import { makeCsatSurveys, makeSurveyResponses } from "./resources/csat";
import {
  makeCustomObjectFields,
  makeCustomObjectRecords,
  makeCustomObjects,
} from "./resources/custom-objects";
import {
  makeArticleTranslations,
  makeArticles,
  makeCategories,
  makeCommunityComments,
  makeCommunityPosts,
  makeCommunityTopics,
  makeSections,
} from "./resources/help-center";
import {
  makeBrands,
  makeCustomRoles,
  makeCustomStatuses,
  makeGroups,
  makeMacros,
  makeOrganizationFields,
  makeSchedules,
  makeSlaPolicies,
  makeTicketFields,
  makeTicketForms,
  makeUserFields,
} from "./resources/lists";
import { makeGroupMemberships, makeOrganizationMemberships } from "./resources/memberships";
import { makeOrganizations } from "./resources/organizations";
import { makeSatisfactionRatings } from "./resources/satisfaction-ratings";
import { makeTalkCalls, makeTalkLegs, makeTalkLines } from "./resources/talk";
import { makeTicketComments } from "./resources/ticket-comments";
import {
  makeTicketAudits,
  makeTicketFieldHistory,
  makeTicketMetricEvents,
} from "./resources/ticket-events";
import { makeTickets } from "./resources/tickets";
import { makeUsers } from "./resources/users";
export { ZendeskConfigDef, manifest } from "./manifest";
export type { ZendeskConfig } from "./manifest";

export const make = Effect.fnUntraced(function* () {
  const client = yield* ZendeskClient.ZendeskClient;

  return Connector.define({
    name: "producer-zendesk",
    title: "Zendesk",
    resources: [
      makeTickets(client),
      makeTicketComments(client),
      makeUsers(client),
      makeOrganizations(client),
      makeGroups(client),
      makeBrands(client),
      makeTicketFields(client),
      makeTicketForms(client),
      makeCustomStatuses(client),
      makeSurveyResponses(client),
      makeCsatSurveys(client),
      makeTicketFieldHistory(client),
      makeTicketMetricEvents(client),
      makeTicketAudits(client),
      makeSatisfactionRatings(client),
      makeGroupMemberships(client),
      makeOrganizationMemberships(client),
      makeUserFields(client),
      makeOrganizationFields(client),
      makeCustomRoles(client),
      makeSlaPolicies(client),
      makeSchedules(client),
      makeMacros(client),
      makeArticles(client),
      makeArticleTranslations(client),
      makeSections(client),
      makeCategories(client),
      makeCommunityPosts(client),
      makeCommunityComments(client),
      makeCommunityTopics(client),
      makeTalkLines(client),
      makeTalkCalls(client),
      makeTalkLegs(client),
      makeCustomObjects(client),
      makeCustomObjectFields(client),
      makeCustomObjectRecords(client),
    ],
  });
});

export type ZendeskConnectorRuntime = Effect.Success<ReturnType<typeof make>>;

export class ZendeskConnector extends Context.Service<ZendeskConnector, ZendeskConnectorRuntime>()(
  "@useairfoil/producer-zendesk/ZendeskConnector",
) {}

export const layer = (config: ZendeskConfig) =>
  Layer.effect(ZendeskConnector)(make().pipe(Effect.annotateLogs({ component: "zendesk" }))).pipe(
    Layer.provide(ZendeskClient.layer(config)),
  );

export const layerConfig = (config: Config.Wrap<ZendeskConfig>) =>
  Layer.unwrap(Config.unwrap(config).pipe(Effect.map(layer)));

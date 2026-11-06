import { Connector, type ResourceDefinition } from "@useairfoil/connector-kit";
import { Config, Context, Effect, Layer, Redacted } from "effect";

import type { LinearConfig, LinearWebhookConfig } from "./manifest";

import * as LinearClient from "./client/client";
import { makeComments } from "./resources/comments";
import {
  makeCustomerNeeds,
  makeCustomerStatuses,
  makeCustomerTiers,
  makeCustomers,
} from "./resources/customers";
import { makeDocuments } from "./resources/documents";
import {
  makeInitiativeLabels,
  makeInitiativeRelations,
  makeInitiativeToProjects,
  makeInitiativeUpdates,
  makeInitiatives,
} from "./resources/initiatives";
import { makeIssueHistory } from "./resources/issue-history";
import {
  makeAttachments,
  makeIssueLabels,
  makeIssueRelations,
  makeIssues,
} from "./resources/issues";
import {
  makeProjectLabels,
  makeProjectMilestones,
  makeProjectRelations,
  makeProjectStatuses,
  makeProjectUpdates,
  makeProjects,
} from "./resources/projects";
import {
  makeIssueToReleases,
  makeReleaseNotes,
  makeReleasePipelines,
  makeReleaseStages,
  makeReleases,
} from "./resources/releases";
import {
  makeCycles,
  makeExternalUsers,
  makeTeamMemberships,
  makeTeams,
  makeUsers,
  makeWorkflowStates,
} from "./resources/teams";
import { webhookEvents } from "./webhook/events";
import { makeWebhookRoute } from "./webhook/route";
export { LinearConfigDef, manifest } from "./manifest";
export type { LinearConfig, LinearWebhookConfig } from "./manifest";

const build = Effect.gen(function* () {
  const client = yield* LinearClient.LinearClient;

  const Issues = makeIssues(client);
  const IssueHistory = makeIssueHistory(client);
  const Comments = makeComments(client);
  const Attachments = makeAttachments(client);
  const IssueLabels = makeIssueLabels(client);
  const Users = makeUsers(client);
  const Cycles = makeCycles(client);
  const Projects = makeProjects(client);
  const ProjectUpdates = makeProjectUpdates(client);
  const ProjectLabels = makeProjectLabels(client);
  const Initiatives = makeInitiatives(client);
  const InitiativeUpdates = makeInitiativeUpdates(client);
  const Documents = makeDocuments(client);
  const Customers = makeCustomers(client);
  const CustomerNeeds = makeCustomerNeeds(client);

  const connector = Connector.define({
    name: "producer-linear",
    title: "Linear",
    resources: [
      Issues,
      IssueHistory,
      Comments,
      makeIssueRelations(client),
      Attachments,
      IssueLabels,
      makeWorkflowStates(client),
      makeTeams(client),
      makeTeamMemberships(client),
      Users,
      makeExternalUsers(client),
      Cycles,
      Projects,
      makeProjectMilestones(client),
      ProjectUpdates,
      makeProjectStatuses(client),
      ProjectLabels,
      makeProjectRelations(client),
      Initiatives,
      InitiativeUpdates,
      makeInitiativeLabels(client),
      makeInitiativeRelations(client),
      makeInitiativeToProjects(client),
      Documents,
      Customers,
      CustomerNeeds,
      makeCustomerStatuses(client),
      makeCustomerTiers(client),
      makeReleases(client),
      makeReleaseNotes(client),
      makeReleasePipelines(client),
      makeReleaseStages(client),
      makeIssueToReleases(client),
    ],
  });

  return {
    connector,
    webhooks: (config: LinearWebhookConfig) =>
      Effect.succeed([
        makeWebhookRoute({
          secret: Redacted.value(config.webhookSecret),
          issueHistory: IssueHistory,
          // Release webhooks need the Business plan.
          targets: new Map<string, ResourceDefinition>([
            [webhookEvents.Issue, Issues],
            [webhookEvents.Comment, Comments],
            [webhookEvents.Attachment, Attachments],
            [webhookEvents.IssueLabel, IssueLabels],
            [webhookEvents.User, Users],
            [webhookEvents.Cycle, Cycles],
            [webhookEvents.Project, Projects],
            [webhookEvents.ProjectUpdate, ProjectUpdates],
            [webhookEvents.ProjectLabel, ProjectLabels],
            [webhookEvents.Initiative, Initiatives],
            [webhookEvents.InitiativeUpdate, InitiativeUpdates],
            [webhookEvents.Document, Documents],
            [webhookEvents.Customer, Customers],
            [webhookEvents.CustomerNeed, CustomerNeeds],
          ]),
        }),
      ]),
  };
});

export const resources = build.pipe(Effect.map(({ connector }) => connector.resources));

export const webhooks = (config: LinearWebhookConfig) =>
  build.pipe(Effect.flatMap((built) => built.webhooks(config)));

export const make = Effect.fnUntraced(function* (config: LinearConfig) {
  const built = yield* build;
  const webhooks = yield* built.webhooks(config);

  return Connector.define({ ...built.connector, webhooks });
});

export type LinearConnectorRuntime = Effect.Success<ReturnType<typeof make>>;

export class LinearConnector extends Context.Service<LinearConnector, LinearConnectorRuntime>()(
  "@useairfoil/producer-linear/LinearConnector",
) {}

export const layer = (config: LinearConfig) =>
  Layer.effect(LinearConnector)(
    make(config).pipe(Effect.annotateLogs({ component: "linear" })),
  ).pipe(Layer.provide(LinearClient.layer(config)));

export const layerConfig = (config: Config.Wrap<LinearConfig>) =>
  Layer.unwrap(Config.unwrap(config).pipe(Effect.map(layer)));

import { Connector, type ResourceDefinition } from "@useairfoil/connector-kit";
import { Config, Context, Effect, Layer, Redacted } from "effect";

import type { IncidentIoConfig, IncidentIoWebhookConfig } from "./manifest";

import * as IncidentIoClient from "./client/client";
import { makeCatalogEntries, makeCatalogTypes } from "./resources/catalog";
import { makeIncidents } from "./resources/incidents";
import {
  makeAlertAttributes,
  makeAlertNotes,
  makeAlertRoutes,
  makeAlertSources,
  makeAlerts,
  makeEscalationPaths,
  makeEscalations,
  makeMaintenanceWindows,
  makeNotificationPauses,
  makeScheduleOverrides,
  makeScheduleShifts,
  makeSchedules,
} from "./resources/on-call";
import {
  makeCustomFieldOptions,
  makeCustomFields,
  makeIncidentRoles,
  makeIncidentStatuses,
  makeIncidentTimestamps,
  makeIncidentTypes,
  makePolicies,
  makePolicyFindings,
  makeSeverities,
  makeStatusPageComponents,
  makeStatusPageIncidents,
  makeStatusPageMaintenances,
  makeStatusPages,
  makeTeams,
  makeUsers,
  makeWorkflowRuns,
  makeWorkflows,
} from "./resources/settings";
import { makeActions, makeFollowUps, makePostmortemDocuments } from "./resources/tasks";
import { webhookEvents } from "./webhook/events";
import { makeWebhookRoute } from "./webhook/route";
export { IncidentIoConfigDef, manifest } from "./manifest";
export type { IncidentIoConfig, IncidentIoWebhookConfig } from "./manifest";

const build = Effect.gen(function* () {
  const client = yield* IncidentIoClient.IncidentIoClient;

  const incidents = makeIncidents(client);
  const PostmortemDocuments = makePostmortemDocuments(client);
  const FollowUps = makeFollowUps(client);
  const Actions = makeActions(client);
  const Alerts = makeAlerts(client);
  const Escalations = makeEscalations(client);
  const Schedules = makeSchedules(client);
  const ScheduleShifts = makeScheduleShifts(client);
  const StatusPageIncidents = makeStatusPageIncidents(client);

  const connector = Connector.define({
    name: "producer-incident-io",
    title: "incident.io",
    resources: [
      ...incidents.resources,
      PostmortemDocuments,
      FollowUps,
      Actions,
      Alerts,
      makeAlertNotes(client),
      makeAlertSources(client),
      makeAlertRoutes(client),
      makeAlertAttributes(client),
      Escalations,
      makeEscalationPaths(client),
      Schedules,
      ScheduleShifts,
      makeScheduleOverrides(client),
      makeNotificationPauses(client),
      makeMaintenanceWindows(client),
      makeCatalogTypes(client),
      makeCatalogEntries(client),
      makeUsers(client),
      makeTeams(client),
      makeSeverities(client),
      makeIncidentStatuses(client),
      makeIncidentTypes(client),
      makeIncidentRoles(client),
      makeIncidentTimestamps(client),
      makeCustomFields(client),
      makeCustomFieldOptions(client),
      makeWorkflows(client),
      makeWorkflowRuns(client),
      makeStatusPages(client),
      makeStatusPageComponents(client),
      StatusPageIncidents,
      makeStatusPageMaintenances(client),
      makePolicies(client),
      makePolicyFindings(client),
    ],
    changes: incidents.feed,
  });

  return {
    connector,
    webhooks: (config: IncidentIoWebhookConfig) =>
      Effect.succeed([
        makeWebhookRoute({
          secret: Redacted.value(config.webhookSecret),
          // The v1 follow-up events repeat the v2 ones. Membership events change no rows.
          targets: new Map<string, ReadonlyArray<ResourceDefinition>>([
            [webhookEvents.incident_incident_created_v2, incidents.webhookTargets],
            [webhookEvents.incident_incident_updated_v2, incidents.webhookTargets],
            [webhookEvents.incident_incident_status_updated_v2, incidents.webhookTargets],
            [webhookEvents.incident_follow_up_created_v2, [FollowUps]],
            [webhookEvents.incident_follow_up_updated_v2, [FollowUps]],
            [webhookEvents.incident_action_created_v1, [Actions]],
            [webhookEvents.incident_action_updated_v1, [Actions]],
            [webhookEvents.incident_postmortem_document_status_updated_v1, [PostmortemDocuments]],
            [webhookEvents.alert_alert_created_v1, [Alerts]],
            [webhookEvents.alert_alert_resolved_v1, [Alerts]],
            [webhookEvents.escalation_escalation_created_v1, [Escalations]],
            [webhookEvents.escalation_escalation_status_updated_v1, [Escalations]],
            [webhookEvents.schedule_created_v1, [Schedules]],
            [webhookEvents.schedule_updated_v1, [Schedules]],
            [webhookEvents.schedule_deleted_v1, [Schedules]],
            [webhookEvents.schedule_shift_change_v1, [ScheduleShifts]],
            [webhookEvents.status_page_incident_update_shared_v1, [StatusPageIncidents]],
          ]),
        }),
      ]),
  };
});

export const resources = build.pipe(Effect.map(({ connector }) => connector.resources));

export const webhooks = (config: IncidentIoWebhookConfig) =>
  build.pipe(Effect.flatMap((built) => built.webhooks(config)));

export const make = Effect.fnUntraced(function* (config: IncidentIoConfig) {
  const built = yield* build;
  const webhooks = yield* built.webhooks(config);

  return Connector.define({ ...built.connector, webhooks });
});

export type IncidentIoConnectorRuntime = Effect.Success<ReturnType<typeof make>>;

export class IncidentIoConnector extends Context.Service<
  IncidentIoConnector,
  IncidentIoConnectorRuntime
>()("@useairfoil/producer-incident-io/IncidentIoConnector") {}

export const layer = (config: IncidentIoConfig) =>
  Layer.effect(IncidentIoConnector)(
    make(config).pipe(Effect.annotateLogs({ component: "incident-io" })),
  ).pipe(Layer.provide(IncidentIoClient.layer(config)));

export const layerConfig = (config: Config.Wrap<IncidentIoConfig>) =>
  Layer.unwrap(Config.unwrap(config).pipe(Effect.map(layer)));

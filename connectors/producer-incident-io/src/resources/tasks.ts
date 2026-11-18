import { Resource } from "@useairfoil/connector-kit";
import { DateTime, Effect, Option, Schema } from "effect";

import type { IncidentIoClientService } from "../client/client";

import { WebhookTargetSchema } from "../schemas/shared";
import {
  type ActionObject,
  type FollowUpObject,
  type PostmortemDocumentObject,
  type Action,
  ActionObjectSchema,
  ActionSchema,
  type FollowUp,
  FollowUpObjectSchema,
  FollowUpSchema,
  type PostmortemDocument,
  PostmortemContentSchema,
  PostmortemDocumentObjectSchema,
  PostmortemDocumentSchema,
} from "../schemas/tasks";
import { findOne, listAll, listSources, polled } from "./pages";

// Follow-ups and actions take one incident mode per read. Without it, test and
// tutorial incidents are left out.
const modeReads = ["standard", "retrospective", "test", "tutorial", "stream"].map((mode) => ({
  incident_mode: mode,
}));

const toPostmortemDocument = ({
  editors,
  ...document
}: PostmortemDocumentObject): PostmortemDocument => ({
  ...document,
  version: document.updated_at,
  editor_ids: editors.map((editor) => editor.id),
});

export const makePostmortemDocuments = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "postmortem_documents",
    rowSchema: PostmortemDocumentSchema,
    version: "version",
    ...listSources(
      listAll(client, {
        path: "/v1/postmortem_documents",
        key: "postmortem_documents",
        item: PostmortemDocumentObjectSchema,
        params: { page_size: "250" },
      }).pipe(Effect.map((documents) => documents.map(toPostmortemDocument))),
    ),
    webhook: {
      schema: WebhookTargetSchema,
      handler: ({ payload }) =>
        findOne(client, {
          path: `/v1/postmortem_documents/${payload.id}`,
          key: "postmortem_document",
          item: PostmortemDocumentObjectSchema,
          toRow: toPostmortemDocument,
        }),
    },
  });

// Only in-app documents have text in incident.io. It's read one document at a time.
export const makePostmortemContents = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "postmortem_contents",
    rowSchema: PostmortemContentSchema,
    version: "version",
    ...listSources(
      Effect.gen(function* () {
        const version = yield* DateTime.nowAsDate;
        const documents = yield* listAll(client, {
          path: "/v1/postmortem_documents",
          key: "postmortem_documents",
          item: PostmortemDocumentObjectSchema,
          params: { page_size: "250" },
        });
        const contents = yield* Effect.forEach(
          documents.filter((document) => document.type === "in_app"),
          (document) =>
            client
              .find(
                Schema.Struct({ markdown: Schema.String }),
                `/v1/postmortem_documents/${document.id}/content`,
              )
              .pipe(
                Effect.map(
                  Option.map(({ markdown }) => ({
                    id: document.id,
                    version,
                    incident_id: document.incident_id,
                    markdown,
                  })),
                ),
              ),
        );
        return contents.flatMap(Option.toArray);
      }),
    ),
  });

const toFollowUp = ({
  assignee,
  assignee_team,
  category,
  priority,
  creator,
  external_issue_reference,
  ...followUp
}: FollowUpObject): FollowUp => ({
  ...followUp,
  version: followUp.updated_at,
  assignee_id: assignee?.id,
  assignee_team_id: assignee_team?.id,
  category_id: category?.id,
  category_name: category?.name,
  priority_id: priority?.id,
  priority_name: priority?.name,
  creator_user_id: creator.user?.id,
  external_issue_provider: external_issue_reference?.provider,
  external_issue_name: external_issue_reference?.issue_name,
  external_issue_permalink: external_issue_reference?.issue_permalink,
});

export const makeFollowUps = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "follow_ups",
    rowSchema: FollowUpSchema,
    version: "version",
    ...polled(client, {
      path: "/v3/follow_ups",
      key: "follow_ups",
      item: FollowUpObjectSchema,
      params: { page_size: "250" },
      variants: modeReads,
      toRow: toFollowUp,
    }),
    webhook: {
      schema: WebhookTargetSchema,
      handler: ({ payload }) =>
        findOne(client, {
          path: `/v3/follow_ups/${payload.id}`,
          key: "follow_up",
          item: FollowUpObjectSchema,
          toRow: toFollowUp,
        }),
    },
  });

const toAction = ({ assignee, creator, ...action }: ActionObject): Action => ({
  ...action,
  version: action.updated_at,
  assignee_id: assignee?.id,
  creator_user_id: creator.user?.id,
});

export const makeActions = (client: IncidentIoClientService) =>
  Resource.entity({
    name: "actions",
    rowSchema: ActionSchema,
    version: "version",
    ...polled(client, {
      path: "/v3/actions",
      key: "actions",
      item: ActionObjectSchema,
      params: { page_size: "250" },
      variants: modeReads,
      toRow: toAction,
    }),
    webhook: {
      schema: WebhookTargetSchema,
      handler: ({ payload }) =>
        findOne(client, {
          path: `/v3/actions/${payload.id}`,
          key: "action",
          item: ActionObjectSchema,
          toRow: toAction,
        }),
    },
  });

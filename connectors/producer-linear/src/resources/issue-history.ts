import { type ConnectorError, Resource } from "@useairfoil/connector-kit";
import { Effect, Option, Schema, Stream } from "effect";

import type { LinearClientService } from "../client/client";

import { type IssueHistory, IssueHistoryObjectSchema, IssueHistorySchema } from "../schemas/issues";
import { Timestamp } from "../schemas/shared";
import { backfillList, changesList, checkList, listSpec } from "./pages";

const historyFields = `
  id created_at: createdAt updated_at: updatedAt archived_at: archivedAt actor_id: actorId
  from_state_id: fromStateId to_state_id: toStateId
  from_assignee_id: fromAssigneeId to_assignee_id: toAssigneeId
  from_cycle_id: fromCycleId to_cycle_id: toCycleId
  from_project_id: fromProjectId to_project_id: toProjectId
  from_parent_id: fromParentId to_parent_id: toParentId from_team_id: fromTeamId to_team_id: toTeamId
  from_priority: fromPriority to_priority: toPriority
  from_estimate: fromEstimate to_estimate: toEstimate
  from_due_date: fromDueDate to_due_date: toDueDate from_title: fromTitle to_title: toTitle
  added_label_ids: addedLabelIds removed_label_ids: removedLabelIds
  attachment_id: attachmentId customer_need_id: customerNeedId
  to_converted_project_id: toConvertedProjectId updated_description: updatedDescription
  added_to_release_ids: addedToReleaseIds removed_from_release_ids: removedFromReleaseIds
  archived trashed auto_archived: autoArchived auto_closed: autoClosed`;

const HistoryPageSchema = Schema.Struct({
  nodes: Schema.Array(IssueHistoryObjectSchema),
  pageInfo: Schema.Struct({ hasNextPage: Schema.Boolean, endCursor: Schema.NullOr(Schema.String) }),
});

type HistoryPage = typeof HistoryPageSchema.Type;

const IssueWithHistorySchema = Schema.Struct({
  id: Schema.String,
  updated_at: Timestamp,
  history: HistoryPageSchema,
});

const nextCursor = ({ pageInfo }: HistoryPage) =>
  pageInfo.hasNextPage ? Option.fromNullishOr(pageInfo.endCursor) : Option.none();

/** Returns the history after the first page, without repeating that page. */
const readMore = (
  client: LinearClientService,
  issueId: string,
  first: HistoryPage,
): Effect.Effect<HistoryPage["nodes"], ConnectorError> =>
  Option.match(nextCursor(first), {
    onNone: () => Effect.succeed([]),
    onSome: (cursor) =>
      Stream.paginate(cursor, (after) =>
        client
          .query(
            Schema.Struct({ issue: Schema.Struct({ history: HistoryPageSchema }) }),
            `query IssueHistory($id: String!, $after: String) {
  issue(id: $id) { history(first: 250, after: $after) { nodes { ${historyFields} } pageInfo { hasNextPage endCursor } } }
}`,
            { id: issueId, after },
          )
          .pipe(
            Effect.map(({ issue }) => [issue.history.nodes, nextCursor(issue.history)] as const),
          ),
      ).pipe(Stream.runCollect),
  });

/** Linear has no top-level history query. */
const historySpec = (client: LinearClientService) =>
  listSpec({
    connection: "issues",
    fields: `id updated_at: updatedAt history(first: 50) { nodes { ${historyFields} } pageInfo { hasNextPage endCursor } }`,
    item: IssueWithHistorySchema,
    // Each issue reads up to 50 history entries, so pages stay under the cost limit.
    first: 25,
    updatedAt: (issue) => issue.updated_at,
    rows: (issues): Effect.Effect<ReadonlyArray<IssueHistory>, ConnectorError> =>
      Effect.forEach(issues, (issue) =>
        readMore(client, issue.id, issue.history).pipe(
          Effect.map((more) =>
            [...issue.history.nodes, ...more].map((entry) => ({
              ...entry,
              issue_id: issue.id,
              version: entry.updated_at,
            })),
          ),
        ),
      ).pipe(Effect.map((rows) => rows.flat())),
  });

export const makeIssueHistory = (client: LinearClientService) => {
  const spec = historySpec(client);
  return Resource.entity({
    name: "issue_history",
    rowSchema: IssueHistorySchema,
    version: "version",

    check: checkList(client, spec),
    backfill: backfillList(client, spec),
    changes: changesList(client, spec),
    webhook: {
      schema: Schema.Struct({ data: Schema.Struct({ id: Schema.String }) }),
      handler: ({ payload }) =>
        client
          .find(
            Schema.Struct({ issue: IssueWithHistorySchema }),
            `query IssueHistory($id: String!) {
  issue(id: $id) { ${spec.fields} }
}`,
            { id: payload.data.id },
          )
          .pipe(
            Effect.flatMap(
              Option.match({
                onNone: () => Effect.succeed([]),
                onSome: ({ issue }) => spec.rows([issue]),
              }),
            ),
          ),
    },
  });
};

import { ConnectorError, Resource } from "@useairfoil/connector-kit";
import { Effect, Schema } from "effect";

import type { ZendeskClientService } from "../client/client";

import {
  CommentObjectSchema,
  type CommentObject,
  type TicketComment,
  TicketCommentSchema,
  type TicketEvent,
  TicketEventPageSchema,
  isCommentEvent,
  isRedactionEvent,
} from "../schemas/comments";
import { timeExport } from "./exports";
import { listAll } from "./pages";

const toRow = (comment: CommentObject, event: TicketEvent): TicketComment => ({
  ...comment,
  version: event.created_at,
  ticket_id: event.ticket_id,
});

const decodeComment = (value: unknown) =>
  Schema.decodeUnknownEffect(CommentObjectSchema)(value).pipe(
    Effect.mapError(
      (cause) => new ConnectorError({ message: "Zendesk comment event does not decode", cause }),
    ),
  );

const rowsOf = (client: ZendeskClientService, events: ReadonlyArray<TicketEvent>) =>
  Effect.gen(function* () {
    const added = yield* Effect.forEach(events, (event) =>
      Effect.forEach(event.child_events.filter(isCommentEvent), (child) =>
        decodeComment(child).pipe(Effect.map((comment) => toRow(comment, event))),
      ),
    );
    // Redaction events have no comment body. Read each ticket once.
    const redacted = new Map(
      events
        .filter((event) => event.child_events.some(isRedactionEvent))
        .map((event) => [event.ticket_id, event]),
    );
    const reread = yield* Effect.forEach(redacted.values(), (event) =>
      listAll(client, {
        path: `/tickets/${event.ticket_id}/comments`,
        key: "comments",
        item: CommentObjectSchema,
        // A deleted ticket returns 404. Its comments stay as they were.
        emptyIfMissing: true,
      }).pipe(Effect.map((comments) => comments.map((comment) => toRow(comment, event)))),
    );
    return [...added, ...reread].flat();
  });

export const makeTicketComments = (client: ZendeskClientService) =>
  Resource.entity({
    name: "ticket_comments",
    rowSchema: TicketCommentSchema,
    version: "version",
    ...timeExport({
      client,
      path: "/incremental/ticket_events",
      schema: TicketEventPageSchema,
      params: { include: "comment_events" },
      rows: (page) => rowsOf(client, page.ticket_events),
    }),
  });

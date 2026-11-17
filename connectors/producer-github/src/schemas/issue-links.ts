import { Iceberg } from "@useairfoil/connector-kit";
import { Schema } from "effect";

import { Long, readVersion } from "./shared";

export const IssueRefSchema = Schema.Struct({
  id: Long.pipe(Schema.annotateKey({ description: "Linked issue ID." })),
  number: Long.pipe(Schema.annotateKey({ description: "Issue number in its repository." })),
  repository_url: Schema.String.pipe(
    Schema.annotateKey({ description: "API URL of the linked issue's repository." }),
  ),
});

const issueRefs = (description: string) =>
  Schema.Array(IssueRefSchema).pipe(Schema.annotateKey({ description }));

export const IssueLinksSchema = Schema.Struct({
  id: Long.pipe(Schema.annotateKey({ description: "Source issue ID." })),
  version: readVersion("issue links"),
  repository_id: Long.pipe(Schema.annotateKey({ description: "Repository ID." })),
  sub_issues: issueRefs("Issues under this issue."),
  blocked_by: issueRefs("Issues that block this issue."),
  blocking: issueRefs("Issues this issue blocks."),
})
  .annotate({ description: "GitHub sub-issues and dependency links per issue." })
  .pipe(Iceberg.identifier("id"));

export type IssueLinks = typeof IssueLinksSchema.Type;

import { type ConnectorError, Cursor, Fetch, Resource } from "@useairfoil/connector-kit";
import { DateTime, Duration, Effect, Schema } from "effect";

import { type GitHubClientService, withParams } from "../client/client";
import {
  type Project,
  ProjectFieldObjectSchema,
  ProjectFieldSchema,
  ProjectItemObjectSchema,
  ProjectItemSchema,
  ProjectObjectSchema,
  ProjectSchema,
} from "../schemas/projects";
import { installationRepositoriesPath, pageSize, readPages, wrappedList } from "./shared";

const OwnerSchema = Schema.Struct({
  owner: Schema.Struct({ login: Schema.String, type: Schema.String }),
});

type ProjectObject = typeof ProjectObjectSchema.Type;

/**
 * Projects belong to the organization that installed the app, so a user
 * installation has none.
 */
const projectSources = <Row extends object>(
  client: GitHubClientService,
  rows: (
    project: ProjectObject,
    organization: string,
    path: string,
  ) => Effect.Effect<ReadonlyArray<Row>, ConnectorError>,
) => {
  const organization = client
    .get(
      wrappedList("repositories", OwnerSchema),
      withParams(installationRepositoriesPath, { per_page: "1" }),
    )
    .pipe(
      Effect.map(({ body }) => {
        const owner = body[0]?.owner;
        return owner?.type === "Organization" ? owner.login : undefined;
      }),
    );
  const projectsPath = (login: string) => `/orgs/${encodeURIComponent(login)}/projectsV2`;
  const read = Effect.gen(function* () {
    const login = yield* organization;
    if (login === undefined) return [];
    const root = projectsPath(login);
    const projects = yield* readPages(
      client,
      Schema.Array(ProjectObjectSchema),
      withParams(root, { per_page: pageSize }),
    );
    const values = yield* Effect.forEach(projects, (project) =>
      rows(project, login, `${root}/${project.number}`),
    );
    return values.flat();
  });
  return {
    check: Effect.gen(function* () {
      const login = yield* organization;
      if (login === undefined) return;
      yield* client.get(
        Schema.Array(ProjectObjectSchema),
        withParams(projectsPath(login), { per_page: "1" }),
      );
    }),
    backfill: Fetch.page({
      pageCursor: Cursor.string(),
      cutoff: Cursor.isoDateTime(),
      fetch: () => read.pipe(Effect.map((rows) => ({ rows, hasMore: false }))),
    }),
    changes: Fetch.changes({
      cursor: Cursor.string(),
      interval: Duration.hours(1),
      fetch: () =>
        Effect.all([read, DateTime.now]).pipe(
          Effect.map(([rows, now]) => ({ rows, cursor: DateTime.formatIso(now) })),
        ),
    }),
  };
};

const readFields = (client: GitHubClientService, path: string) =>
  readPages(
    client,
    Schema.Array(ProjectFieldObjectSchema),
    withParams(`${path}/fields`, { per_page: pageSize }),
  );

export const makeProjects = (client: GitHubClientService) =>
  Resource.entity({
    name: "organization_projects",
    rowSchema: ProjectSchema,
    version: "version",
    ...projectSources(client, (project, organization) =>
      Effect.succeed<ReadonlyArray<Project>>([
        { ...project, organization, version: project.updated_at },
      ]),
    ),
  });

export const makeProjectFields = (client: GitHubClientService) =>
  Resource.entity({
    name: "project_fields",
    rowSchema: ProjectFieldSchema,
    version: "version",
    ...projectSources(client, (project, _organization, path) =>
      readFields(client, path).pipe(
        Effect.map((fields) =>
          fields.map((field) => ({ ...field, project_id: project.id, version: field.updated_at })),
        ),
      ),
    ),
  });

export const makeProjectItems = (client: GitHubClientService) =>
  Resource.entity({
    name: "project_items",
    rowSchema: ProjectItemSchema,
    version: "version",
    ...projectSources(client, (project, _organization, path) =>
      Effect.gen(function* () {
        // Without `fields`, items only have the title.
        const fields = yield* readFields(client, path);
        const items = yield* readPages(
          client,
          Schema.Array(ProjectItemObjectSchema),
          withParams(`${path}/items`, {
            fields: fields.map((field) => String(field.id)).join(","),
            per_page: pageSize,
          }),
        );
        return items.map((item) => ({ ...item, project_id: project.id, version: item.updated_at }));
      }),
    ),
  });

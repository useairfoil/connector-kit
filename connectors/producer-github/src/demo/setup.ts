import type { Demo } from "@useairfoil/connector-kit";

import type { Repository } from "../schemas/repositories";

import {
  labelsForRepository,
  milestoneForRepository,
  day,
  demoProjectId,
  nodeId,
  org,
  owner,
  repositories,
  repositoryId,
  urlOf,
} from "./shared";

/** The repositories, written once before any change. */
export const setupRows = ({ now }: Demo.DemoContext) => {
  const created = new Date(now.getTime() - 900 * day);

  const rows: Array<Repository> = repositories.map((repo, r) => ({
    id: repositoryId(r),
    version: now,
    node_id: nodeId("R", repositoryId(r)),
    name: repo.name,
    full_name: `${org}/${repo.name}`,
    owner,
    private: repo.name !== "sdk-js" && repo.name !== "docs",
    visibility: repo.name === "sdk-js" || repo.name === "docs" ? "public" : "private",
    description: repo.description,
    fork: false,
    archived: false,
    disabled: false,
    default_branch: "main",
    language: repo.language,
    topics: [...repo.topics],
    html_url: urlOf(repo),
    created_at: new Date(created.getTime() + r * 30 * day),
    // Deleted repositories can be restored, so live rows say they aren't deleted.
    _deleted: false,
  }));

  const labels = rows.flatMap((repo, r) =>
    labelsForRepository(r).map((label, index) => ({
      ...label,
      version: now,
      repository_id: repo.id,
      description: "",
      color: ["d73a4a", "a2eeef", "0075ca", "7057ff"][index] ?? "ededed",
      default: true,
    })),
  );
  const milestones = rows.map((repo, r) => ({
    ...milestoneForRepository(r),
    version: now,
    repository_id: repo.id,
    description: "Work planned for the first release.",
    state: "open",
    created_at: repo.created_at,
    due_on: null,
    closed_at: null,
  }));
  const mainSha = "8edba364731ea0d819cd80e445696e62d06ed5dc";
  const branches = rows.map((repo) => ({
    key: `${repo.id}:main`,
    version: now,
    repository_id: repo.id,
    name: "main",
    commit: { sha: mainSha },
    protected: true,
  }));
  const tags = rows.map((repo) => ({
    key: `${repo.id}:v1.0.0`,
    version: now,
    repository_id: repo.id,
    name: "v1.0.0",
    commit: { sha: mainSha },
  }));
  const workflow_definitions = rows.map((repo, r) => ({
    id: 60_000_000n + BigInt(r),
    version: repo.created_at,
    repository_id: repo.id,
    name: "CI",
    path: ".github/workflows/ci.yml",
    state: "active",
    created_at: repo.created_at,
    updated_at: repo.created_at,
  }));
  const organization_projects = [
    {
      id: demoProjectId,
      version: created,
      organization: org,
      number: 1n,
      title: "Engineering backlog",
      description: "Work across teams.",
      public: false,
      closed_at: null,
      deleted_at: null,
      created_at: created,
      updated_at: created,
    },
  ];
  const project_fields = [
    {
      id: demoProjectId + 1n,
      version: created,
      project_id: demoProjectId,
      name: "Status",
      data_type: "single_select",
      options: '[{"id":"todo","name":"Todo"},{"id":"done","name":"Done"}]',
      created_at: created,
      updated_at: created,
    },
  ];
  return {
    repositories: rows,
    labels,
    milestones,
    branches,
    tags,
    workflow_definitions,
    organization_projects,
    project_fields,
  };
};

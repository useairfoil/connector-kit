import type { Demo } from "@useairfoil/connector-kit";

import type { Repository } from "../schemas/repositories";

import {
  labelsForRepository,
  milestoneForRepository,
  day,
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
  return { repositories: rows, labels, milestones };
};

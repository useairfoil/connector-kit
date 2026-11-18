import type { Demo } from "@useairfoil/connector-kit";

import type { Customer, CustomerStatus, CustomerTier } from "../schemas/customers";
import type { Release, ReleaseNote, ReleasePipeline, ReleaseStage } from "../schemas/releases";

import { initiativeTables } from "./initiatives";
import { projectTables } from "./projects";
import {
  customerCount,
  customerId,
  dateOnly,
  day,
  months,
  pipelineId,
  releaseId,
  stamp,
  userCount,
  userId,
  uuid,
  workspace,
} from "./shared";
import { teamTables } from "./teams";

/** The workspace, written once before any issue. */
export const setupRows = (context: Demo.DemoContext) => {
  const { faker, now } = context;
  const founded = new Date(now.getTime() - 900 * day);
  const set = stamp(founded, founded);

  const teamSetup = teamTables(context, founded);
  const projectSetup = projectTables(context, founded);
  const initiativeSetup = initiativeTables(context, founded);

  const customerStatuses: Array<CustomerStatus> = ["Active", "Trial", "Churned"].map((name, s) => ({
    id: uuid(24, s),
    ...set,
    name: name.toLowerCase(),
    display_name: name,
    description: null,
    color: ["#4CB782", "#F2C94C", "#95A2B3"][s] ?? "#95A2B3",
    position: s,
  }));

  const customerTiers: Array<CustomerTier> = ["Enterprise", "Growth", "Starter"].map((name, s) => ({
    id: uuid(25, s),
    ...set,
    name: name.toLowerCase(),
    display_name: name,
    description: null,
    color: ["#5E6AD2", "#4EA7FC", "#BEC2C8"][s] ?? "#BEC2C8",
    position: s,
  }));

  const customers: Array<Customer> = Array.from({ length: customerCount }, (_, c) => {
    const name = faker.company.name();
    const domain = `${name.toLowerCase().replaceAll(/[^a-z]+/g, "")}.example.com`;
    const tier = c % 3;

    return {
      id: customerId(c),
      ...stamp(founded, now),
      _deleted: false,
      name,
      domains: [domain],
      external_ids: [],
      logo_url: null,
      owner_id: userId(c % userCount),
      status_id: uuid(24, c === customerCount - 1 ? 2 : c % 5 === 4 ? 1 : 0),
      tier_id: uuid(25, tier),
      revenue: BigInt([250_000, 60_000, 12_000][tier] ?? 12_000),
      size: [2_000, 300, 40][tier] ?? 40,
      approximate_need_count: 0,
      url: `${workspace}/customer/${name.toLowerCase().replaceAll(/[^a-z]+/g, "-")}`,
    };
  });

  const pipeline: Array<ReleasePipeline> = [
    {
      id: pipelineId,
      ...set,
      name: "Web app",
      type: "scheduled",
      is_production: true,
      url: `${workspace}/releases/web-app`,
      include_path_patterns: ["apps/web/**"],
      approximate_release_count: BigInt(months),
      trashed: false,
    },
  ];

  const stages: Array<ReleaseStage> = ["Planned", "In progress", "Released"].map((name, s) => ({
    id: uuid(26, s),
    ...set,
    name,
    type: ["planned", "started", "completed"][s] ?? "completed",
    color: ["#BEC2C8", "#F2C94C", "#5E6AD2"][s] ?? "#5E6AD2",
    position: s,
    frozen: false,
    pipeline_id: pipelineId,
  }));

  // One release a month. The newest one is still in progress.
  const releases: Array<Release> = Array.from({ length: months }, (_, m) => {
    const released = new Date(now.getTime() - m * 30 * day);
    const current = m === 0;

    return {
      id: releaseId(m),
      ...stamp(new Date(released.getTime() - 30 * day), current ? now : released),
      name: `Release 2.${months - m}.0`,
      description: null,
      release_version: `2.${months - m}.0`,
      url: `${workspace}/releases/web-app/2.${months - m}.0`,
      commit_sha: current ? null : faker.git.commitSha(),
      pipeline_id: pipelineId,
      stage_id: uuid(26, current ? 1 : 2),
      creator_id: userId(0),
      start_date: dateOnly(new Date(released.getTime() - 30 * day)),
      target_date: dateOnly(released),
      started_at: new Date(released.getTime() - 30 * day),
      completed_at: current ? null : released,
      canceled_at: null,
      trashed: false,
    };
  });

  const releaseNotes: Array<ReleaseNote> = releases
    .filter((release) => release.completed_at !== null)
    .map((release, k) => ({
      id: uuid(27, k),
      ...stamp(release.completed_at ?? now, release.completed_at ?? now),
      title: `What's new in ${release.release_version}`,
      content: "Faster search, clearer billing pages, and many small fixes.",
      url: `${release.url}/notes`,
      pipeline_id: pipelineId,
      release_ids: [release.id],
    }));

  const historyEntry = (item: { readonly updated_at: Date }, group: number, index: number) => ({
    id: uuid(group, index),
    ...stamp(item.updated_at, item.updated_at),
    entries: JSON.stringify({
      status: [{ to: "active", timestamp: item.updated_at.toISOString() }],
    }),
  });

  return {
    ...teamSetup,
    project_external_links: projectSetup.projects.map((project, p) => ({
      id: uuid(48, p),
      ...stamp(project.created_at, project.created_at),
      project_id: project.id,
      label: "Project brief",
      url: `${project.url}/brief`,
      sort_order: 0,
      creator_id: project.creator_id,
    })),
    project_history: projectSetup.projects.map((project, p) => ({
      ...historyEntry(project, 43, p),
      project_id: project.id,
    })),
    initiative_history: initiativeSetup.initiatives.map((initiative, i) => ({
      ...historyEntry(initiative, 44, i),
      initiative_id: initiative.id,
    })),
    release_history: releases.map((release, r) => ({
      ...historyEntry(release, 45, r),
      release_id: release.id,
    })),
    ...projectSetup,
    ...initiativeSetup,
    customer_statuses: customerStatuses,
    customer_tiers: customerTiers,
    customers,
    release_pipelines: pipeline,
    release_stages: stages,
    releases,
    release_notes: releaseNotes,
    team_sla_rules: teamSetup.teams.map((team) => ({
      id: team.id,
      version: now,
      rules: [
        {
          id: uuid(49, 0),
          name: "Urgent issue response",
          conditions: JSON.stringify({ priority: { eq: 1 } }),
          removes_sla: false,
          sla: 86_400_000,
          sla_type: "all",
          start_mode: "ruleMatch",
        },
      ],
    })),
    templates: [
      {
        id: uuid(46, 0),
        ...set,
        name: "Bug report",
        description: "Record a product defect",
        type: "issue",
        team_id: null,
        template_data: JSON.stringify({ title: "Bug: ", priority: 2 }),
        content: "## Steps to reproduce",
        has_form_fields: false,
      },
    ],
    custom_views: [
      {
        id: uuid(47, 0),
        ...set,
        name: "High-priority issues",
        description: null,
        model_name: "Issue",
        team_id: null,
        owner_id: userId(0),
        creator_id: userId(0),
        shared: true,
        filter_data: JSON.stringify({ priority: { lte: 2 } }),
        project_filter_data: null,
        initiative_filter_data: null,
        feed_item_filter_data: null,
      },
    ],
  };
};

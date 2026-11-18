import type { Demo } from "@useairfoil/connector-kit";

import type { Comment } from "../schemas/comments";

import {
  clock,
  customerCount,
  customerId,
  cycleId,
  cyclesBack,
  cycleWeeks,
  dateOnly,
  day,
  hour,
  issueId,
  issueLabels,
  labelId,
  milestoneId,
  months,
  priorities,
  projectId,
  projects,
  releaseId,
  type Rows,
  stamp,
  stateId,
  states,
  teamId,
  teams,
  userCount,
  userId,
  uuid,
  verbs,
  workspace,
} from "./shared";

/** One group is one issue, with its history, comments, and links. */
export const issueRows = (index: number, context: Demo.DemoContext): Rows => {
  const { faker, now } = context;
  const { at, later } = clock(context);

  const rows: Rows = {
    issues: [],
    issue_history: [],
    issue_state_spans: [],
    comments: [],
    issue_relations: [],
    attachments: [],
    customer_needs: [],
    issue_to_releases: [],
  };

  const t = index % teams.length;
  const team = teams[t] ?? teams[0];
  const number = Math.floor(index / teams.length) + 1;
  const identifier = `${team.key}-${number}`;
  const id = issueId(index);
  const title = `${faker.helpers.arrayElement(verbs)} ${faker.hacker.adjective()} ${faker.hacker.noun()}`;
  const slug = title.toLowerCase().replaceAll(" ", "-");
  const url = `${workspace}/issue/${identifier}/${slug}`;

  const creator = faker.number.int({ max: userCount - 1 });

  const assignee = faker.helpers.maybe(() => faker.number.int({ max: userCount - 1 }), {
    probability: 0.85,
  });

  const created = at(now.getTime() - faker.number.int({ min: day, max: 360 * day }));

  const outcome = faker.helpers.weightedArrayElement([
    { weight: 55, value: "Done" },
    { weight: 8, value: "Canceled" },
    { weight: 12, value: "In Progress" },
    { weight: 5, value: "In Review" },
    { weight: 10, value: "Todo" },
    { weight: 10, value: "Backlog" },
  ] as const);

  const started =
    outcome === "Done" || outcome === "In Progress" || outcome === "In Review"
      ? later(created, hour, 20 * day)
      : null;

  const completed = outcome === "Done" && started ? later(started, hour, 14 * day) : null;
  const canceled = outcome === "Canceled" ? later(created, day, 30 * day) : null;
  const triaged = team.triage ? later(created, 60_000, day) : null;

  const project = faker.helpers.maybe(() => faker.number.int({ max: projects.length - 1 }), {
    probability: 0.6,
  });

  const cycleNumber =
    team.cycles && started
      ? Math.max(
          0,
          Math.min(
            cyclesBack,
            cyclesBack - Math.ceil((now.getTime() - started.getTime()) / (cycleWeeks * 7 * day)),
          ),
        )
      : null;

  const label = faker.number.int({ max: issueLabels.length - 1 });

  const priority = faker.helpers.weightedArrayElement([
    { weight: 10, value: 0 },
    { weight: 5, value: 1 },
    { weight: 25, value: 2 },
    { weight: 40, value: 3 },
    { weight: 20, value: 4 },
  ]);

  const estimate = team.key === "ENG" ? faker.helpers.arrayElement([1, 2, 3, 5, 8]) : null;
  const stateIndex = states.findIndex((state) => state.name === outcome);

  // History: created, assigned, then each state change.
  const changes: Array<{ readonly at: Date; readonly from: number | null; readonly to: number }> = [
    { at: created, from: null, to: team.triage ? 0 : 1 },
  ];

  if (triaged) changes.push({ at: triaged, from: 0, to: 1 });
  if (started) changes.push({ at: started, from: 1, to: 3 });

  if (outcome === "In Review" && started)
    changes.push({ at: later(started, day, 5 * day), from: 3, to: 4 });

  if (completed) changes.push({ at: completed, from: 3, to: 5 });
  if (canceled) changes.push({ at: canceled, from: 1, to: 6 });
  if (outcome === "Todo") changes.push({ at: later(created, 60_000, 3 * day), from: 1, to: 2 });

  changes.forEach((change, h) => {
    rows.issue_state_spans.push({
      id: uuid(31, index, h),
      issue_id: id,
      state_id: stateId(t, change.to),
      started_at: change.at,
      ended_at: changes[h + 1]?.at ?? null,
      version: changes[h + 1]?.at ?? change.at,
    });

    rows.issue_history.push({
      id: uuid(30, index, h),
      ...stamp(change.at, change.at),
      issue_id: id,
      actor_id: userId(h === 0 ? creator : (assignee ?? creator)),
      from_state_id: change.from === null ? null : stateId(t, change.from),
      to_state_id: stateId(t, change.to),
      from_assignee_id: null,
      to_assignee_id: h === 0 && assignee !== undefined ? userId(assignee) : null,
      from_cycle_id: null,
      to_cycle_id: change.to === 3 && cycleNumber !== null ? cycleId(t, cycleNumber) : null,
      from_project_id: null,
      to_project_id: h === 0 && project !== undefined ? projectId(project) : null,
      from_parent_id: null,
      to_parent_id: null,
      from_team_id: null,
      to_team_id: null,
      from_priority: null,
      to_priority: h === 0 ? priority : null,
      from_estimate: null,
      to_estimate: h === 0 ? estimate : null,
      from_due_date: null,
      to_due_date: null,
      from_title: null,
      to_title: null,
      added_label_ids: h === 0 ? [labelId(label)] : null,
      removed_label_ids: null,
      attachment_id: null,
      customer_need_id: null,
      to_converted_project_id: null,
      updated_description: null,
      archived: null,
      trashed: null,
      auto_archived: null,
      auto_closed: null,
    });
  });

  const comments = Array.from({ length: faker.number.int({ max: 3 }) }, (_, c) => {
    const posted = later(created, 60_000, 10 * day);

    return {
      id: uuid(31, index, c),
      ...stamp(posted, posted),
      _deleted: false,
      body: faker.helpers.arrayElement([
        "I can reproduce this on staging.",
        "Picking this up now.",
        "Added a fix behind a feature flag.",
        "Can we pair on this tomorrow?",
        "Customer confirmed it works now.",
      ]),
      user_id: userId(faker.number.int({ max: userCount - 1 })),
      external_user_id: null,
      issue_id: id,
      project_id: null,
      project_update_id: null,
      initiative_id: null,
      initiative_update_id: null,
      document_content_id: null,
      parent_id: null,
      quoted_text: null,
      edited_at: null,
      resolved_at: null,
      resolving_user_id: null,
      url: `${url}#comment-${uuid(31, index, c).slice(-8)}`,
    } satisfies Comment;
  });

  rows.comments.push(...comments);

  if (index >= teams.length && faker.datatype.boolean({ probability: 0.1 })) {
    rows.issue_relations.push({
      id: uuid(32, index),
      ...stamp(created, created),
      issue_id: id,
      // The issue before this one in the same team.
      related_issue_id: issueId(index - teams.length),
      type: faker.helpers.arrayElement(["blocks", "related", "duplicate"]),
    });
  }

  if (team.key === "ENG" && started) {
    const prNumber = 1000 + index;

    rows.attachments.push({
      id: uuid(33, index),
      ...stamp(started, completed ?? started),
      _deleted: false,
      issue_id: id,
      creator_id: assignee === undefined ? null : userId(assignee),
      external_user_creator_id: null,
      title: `${title} #${prNumber}`,
      subtitle: completed ? "Merged" : "Open",
      url: `https://github.com/acme-labs/web/pull/${prNumber}`,
      source_type: "github",
    });
  }

  if (faker.datatype.boolean({ probability: 0.15 })) {
    const asked = later(created, 0, 5 * day);

    rows.customer_needs.push({
      id: uuid(34, index),
      ...stamp(asked, asked),
      _deleted: false,
      customer_id: customerId(faker.number.int({ max: customerCount - 1 })),
      issue_id: id,
      project_id: null,
      original_issue_id: id,
      comment_id: null,
      attachment_id: null,
      creator_id: userId(creator),
      body: "Their team asked for this on the last call.",
      priority: faker.helpers.arrayElement([0, 0, 1]),
      url: null,
    });
  }

  // Engineering work ships in the monthly release after it's done.
  if (team.key === "ENG" && completed) {
    const month = Math.floor((now.getTime() - completed.getTime()) / (30 * day));

    if (month < months) {
      rows.issue_to_releases.push({
        id: uuid(35, index),
        ...stamp(completed, completed),
        issue_id: id,
        release_id: releaseId(month),
      });
    }
  }

  const updated = new Date(
    Math.max(
      ...changes.map((change) => change.at.getTime()),
      ...comments.map((row) => row.created_at.getTime()),
    ),
  );

  rows.issues.push({
    id,
    ...stamp(created, updated),
    _deleted: false,
    identifier,
    number,
    title,
    description: `${faker.hacker.phrase()}\n\n**Steps**\n\n1. Open the page\n2. Try the action\n3. See the error`,
    url,
    branch_name: `${identifier.toLowerCase()}-${slug}`,
    priority,
    priority_label: priorities[priority] ?? "No priority",
    estimate,
    due_date: priority === 1 ? dateOnly(new Date(created.getTime() + 7 * day)) : null,
    creator_id: userId(creator),
    assignee_id: assignee === undefined ? null : userId(assignee),
    delegate_id: null,
    snoozed_by_id: null,
    state_id: stateId(t, stateIndex),
    team_id: teamId(t),
    project_id: project === undefined ? null : projectId(project),
    project_milestone_id:
      project === undefined ? null : milestoneId(project, faker.number.int({ max: 2 })),
    cycle_id: cycleNumber === null ? null : cycleId(t, cycleNumber),
    parent_id: null,
    source_comment_id: null,
    external_user_creator_id: null,
    label_ids: [labelId(label)],
    previous_identifiers: [],
    started_at: started,
    completed_at: completed,
    canceled_at: canceled,
    started_triage_at: team.triage ? created : null,
    triaged_at: triaged,
    auto_closed_at: null,
    auto_archived_at: null,
    added_to_cycle_at: cycleNumber === null ? null : started,
    added_to_project_at: project === undefined ? null : created,
    added_to_team_at: created,
    snoozed_until_at: null,
    sla_type: null,
    sla_started_at: null,
    sla_breaches_at: null,
    sla_medium_risk_at: null,
    sla_high_risk_at: null,
    customer_ticket_count: BigInt(rows.customer_needs.length),
    integration_source_type: null,
    trashed: false,
  });

  return rows;
};

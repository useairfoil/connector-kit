import type { Demo } from "@useairfoil/connector-kit";

import type { IssueComment } from "../schemas/issue-comments";

import {
  type Account,
  actionsBot,
  clock,
  day,
  labelsForRepository,
  milestoneForRepository,
  minute,
  nodeId,
  org,
  paths,
  people,
  repositories,
  repositoryId,
  type Rows,
  urlOf,
  verbs,
} from "./shared";

/**
 * One group is one change in a repository: an issue, the pull request that
 * fixes it, and its CI.
 */
export const changeRows = (index: number, context: Demo.DemoContext): Rows => {
  const { faker, now } = context;
  const { at, later } = clock(context);

  const rows: Rows = {
    issues: [],
    pull_requests: [],
    issue_comments: [],
    pull_request_reviews: [],
    pull_request_review_comments: [],
    pull_request_commits: [],
    commits: [],
    check_runs: [],
    commit_statuses: [],
    workflow_runs: [],
    workflow_jobs: [],
    releases: [],
  };

  const r = index % repositories.length;
  const repo = repositories[r] ?? repositories[0];
  const repoId = repositoryId(r);
  const round = Math.floor(index / repositories.length);

  // Issues and pull requests share one number sequence per repository.
  const issueNumber = BigInt(round * 2 + 1);
  const prNumber = BigInt(round * 2 + 2);
  const id = BigInt(index);

  const author = faker.helpers.arrayElement(people);
  const reviewer = faker.helpers.arrayElement(people.filter((person) => person !== author));
  const association = (account: Account) => (account.type === "Bot" ? "NONE" : "MEMBER");
  const title = `${faker.helpers.arrayElement(verbs)} ${faker.hacker.adjective()} ${faker.hacker.noun()} handling`;
  const label = faker.helpers.arrayElement(labelsForRepository(r));
  const opened = at(now.getTime() - faker.number.int({ min: day, max: 600 * day }));

  const comment = (issueNumber: bigint, n: number, created: Date): IssueComment => {
    const commentId = 1_800_000_000n + id * 10n + BigInt(n);
    const user = faker.helpers.arrayElement(people);

    return {
      id: commentId,
      version: created,
      node_id: nodeId("IC", commentId),
      repository_id: repoId,
      issue_number: issueNumber,
      user,
      author_association: association(user),
      body: faker.helpers.arrayElement([
        "I can reproduce this on the latest release.",
        "Thanks for the report. Looking into it.",
        "This should be fixed once the pull request lands.",
        "Can we add a test for this case?",
        "LGTM, thanks!",
      ]),
      created_at: created,
      html_url: `${urlOf(repo)}/issues/${issueNumber}#issuecomment-${commentId}`,
    };
  };

  const fixed = faker.datatype.boolean({ probability: 0.75 });

  const issueComments = Array.from({ length: faker.number.int({ max: 3 }) }, (_, n) =>
    comment(issueNumber, n, later(opened, minute, 5 * day)),
  );

  rows.issue_comments.push(...issueComments);

  // The pull request, from a branch, with one to four commits.
  const branch = `${author.login.split("-")[0]}/${title.toLowerCase().split(" ").slice(1, 3).join("-")}`;
  const prOpened = later(opened, 60 * minute, 7 * day);

  const prState = faker.helpers.weightedArrayElement([
    { weight: 70, value: "merged" },
    { weight: 10, value: "closed" },
    { weight: 20, value: "open" },
  ] as const);

  const baseSha = faker.git.commitSha();
  let committed = prOpened;

  const shas = Array.from({ length: faker.number.int({ min: 1, max: 4 }) }, (_, n) => {
    committed = later(committed, 10 * minute, day);

    return {
      sha: faker.git.commitSha(),
      message: n === 0 ? title : faker.git.commitMessage(),
      at: committed,
    };
  });

  const headSha = shas.at(-1)?.sha ?? baseSha;
  const reviewed = later(committed, 30 * minute, 2 * day);
  const closedAt = prState === "open" ? null : later(reviewed, 10 * minute, day);
  const mergedAt = prState === "merged" ? closedAt : null;

  const prComments = Array.from({ length: faker.number.int({ max: 2 }) }, (_, n) =>
    comment(prNumber, 5 + n, later(prOpened, minute, 2 * day)),
  );

  rows.issue_comments.push(...prComments);

  const prUpdated = new Date(
    Math.max(
      closedAt?.getTime() ?? 0,
      reviewed.getTime(),
      ...prComments.map((row) => row.created_at.getTime()),
    ),
  );

  const prId = 1_500_000_000n + id;

  rows.pull_requests.push({
    id: prId,
    version: prUpdated,
    node_id: nodeId("PR", prId),
    repository_id: repoId,
    number: prNumber,
    title,
    body: `Fixes #${issueNumber}.\n\n${faker.hacker.phrase()}`,
    state: prState === "open" ? "open" : "closed",
    draft: prState === "open" && faker.datatype.boolean({ probability: 0.2 }),
    locked: false,
    user: author,
    author_association: "MEMBER",
    labels: [label],
    assignees: [author],
    requested_reviewers: prState === "open" ? [reviewer] : [],
    milestone: round === 0 ? milestoneForRepository(r) : null,
    head: { ref: branch, sha: headSha, label: `${org}:${branch}` },
    base: { ref: "main", sha: baseSha, label: `${org}:main` },
    created_at: prOpened,
    closed_at: closedAt,
    merged_at: mergedAt,
    html_url: `${urlOf(repo)}/pull/${prNumber}`,
  });

  for (const commit of shas) {
    rows.pull_request_commits.push({
      key: `${repoId}:${prNumber}:${commit.sha}`,
      // Pull request commits take the pull request's version.
      version: prUpdated,
      repository_id: repoId,
      pull_request_number: prNumber,
      sha: commit.sha,
      message: commit.message,
      author: { name: author.login, date: commit.at },
      committer: { name: author.login, date: commit.at },
      author_user: author,
      committer_user: author,
      html_url: `${urlOf(repo)}/commit/${commit.sha}`,
    });
  }

  // Reviews have no update time, so their version is the read time.
  const reviewState = faker.helpers.weightedArrayElement([
    { weight: 70, value: "APPROVED" },
    { weight: 20, value: "CHANGES_REQUESTED" },
    { weight: 10, value: "COMMENTED" },
  ] as const);

  if (prState !== "open" || faker.datatype.boolean({ probability: 0.5 })) {
    const reviewId = 2_400_000_000n + id;

    rows.pull_request_reviews.push({
      id: reviewId,
      version: now,
      node_id: nodeId("PRR", reviewId),
      repository_id: repoId,
      pull_request_number: prNumber,
      user: reviewer,
      author_association: "MEMBER",
      state: reviewState,
      body: reviewState === "APPROVED" ? "" : "A few small things before this lands.",
      commit_id: headSha,
      submitted_at: reviewed,
      html_url: `${urlOf(repo)}/pull/${prNumber}#pullrequestreview-${reviewId}`,
    });

    if (reviewState !== "APPROVED") {
      const line = BigInt(faker.number.int({ min: 5, max: 200 }));
      const reviewCommentId = 2_900_000_000n + id;

      rows.pull_request_review_comments.push({
        id: reviewCommentId,
        version: reviewed,
        node_id: nodeId("PRRC", reviewCommentId),
        repository_id: repoId,
        pull_request_number: prNumber,
        pull_request_review_id: reviewId,
        user: reviewer,
        author_association: "MEMBER",
        body: faker.helpers.arrayElement([
          "Could this return early instead?",
          "Nit: this name is a bit unclear.",
          "We should handle the error here.",
        ]),
        path: faker.helpers.arrayElement(paths),
        commit_id: headSha,
        original_commit_id: headSha,
        diff_hunk: `@@ -${line},6 +${line},8 @@`,
        line,
        original_line: line,
        start_line: null,
        side: "RIGHT",
        subject_type: "line",
        created_at: reviewed,
        html_url: `${urlOf(repo)}/pull/${prNumber}#discussion_r${reviewCommentId}`,
      });
    }
  }

  // CI runs on the head commit: one workflow run with two jobs, and their check runs.
  const ciPassed = faker.datatype.boolean({ probability: 0.85 });
  const runId = 9_000_000_000n + id;
  const runStarted = later(committed, 10_000, minute);
  const workflowId = 60_000_000n + BigInt(r);

  rows.workflow_runs.push({
    id: runId,
    version: later(runStarted, 2 * minute, 15 * minute),
    node_id: nodeId("WFR", runId),
    repository_id: repoId,
    workflow_id: workflowId,
    name: "CI",
    display_title: title,
    path: ".github/workflows/ci.yml",
    event: "pull_request",
    status: "completed",
    conclusion: ciPassed ? "success" : "failure",
    head_branch: branch,
    head_sha: headSha,
    run_number: BigInt(round + 1),
    run_attempt: 1n,
    check_suite_id: 30_000_000_000n + id,
    actor: author,
    triggering_actor: author,
    pull_requests: [{ id: prId, number: prNumber }],
    created_at: runStarted,
    run_started_at: runStarted,
    html_url: `${urlOf(repo)}/actions/runs/${runId}`,
  });

  ["build", "test"].forEach((name, j) => {
    const jobId = 25_000_000_000n + id * 2n + BigInt(j);
    const started = later(runStarted, 5_000, minute);
    const completed = later(started, minute, 10 * minute);
    const conclusion = ciPassed || name === "build" ? "success" : "failure";

    rows.workflow_jobs.push({
      id: jobId,
      version: now,
      node_id: nodeId("CR", jobId),
      repository_id: repoId,
      run_id: runId,
      run_attempt: 1n,
      workflow_name: "CI",
      name,
      head_sha: headSha,
      head_branch: branch,
      status: "completed",
      conclusion,
      created_at: runStarted,
      started_at: started,
      completed_at: completed,
      runner_name: `GitHub Actions ${faker.number.int({ min: 1, max: 99 })}`,
      labels: ["ubuntu-latest"],
      steps: ["Set up job", "Checkout", `Run ${name}`, "Complete job"].map((step, s) => ({
        number: BigInt(s + 1),
        name: step,
        status: "completed",
        conclusion: s === 2 ? conclusion : "success",
        started_at: started,
        completed_at: completed,
      })),
      html_url: `${urlOf(repo)}/actions/runs/${runId}/job/${jobId}`,
    });

    rows.check_runs.push({
      id: jobId,
      version: now,
      node_id: nodeId("CR", jobId),
      repository_id: repoId,
      head_sha: headSha,
      name,
      status: "completed",
      conclusion,
      started_at: started,
      completed_at: completed,
      app: { id: 15_368n, name: "GitHub Actions" },
      check_suite: { id: 30_000_000_000n + id },
      output: { title: null, summary: null },
      external_id: null,
      details_url: `${urlOf(repo)}/actions/runs/${runId}/job/${jobId}`,
      html_url: `${urlOf(repo)}/actions/runs/${runId}/job/${jobId}`,
    });
  });

  // A merged pull request lands as one squashed commit on main, with a deploy status.
  if (mergedAt) {
    const sha = faker.git.commitSha();

    rows.commits.push({
      key: `${repoId}:${sha}`,
      // Commits never change, so the version is the commit time.
      version: mergedAt,
      repository_id: repoId,
      sha,
      node_id: nodeId("C", 3_000_000_000n + id),
      message: `${title} (#${prNumber})`,
      author: { name: author.login, date: mergedAt },
      committer: { name: "GitHub", date: mergedAt },
      author_user: author,
      committer_user: { id: 19_864_447n, login: "web-flow", type: "User" },
      parents: [baseSha],
      verified: true,
      html_url: `${urlOf(repo)}/commit/${sha}`,
    });

    const statusId = 3_500_000_000n + id;
    const deployed = faker.datatype.boolean({ probability: 0.95 });

    rows.commit_statuses.push({
      id: statusId,
      version: later(mergedAt, minute, 10 * minute),
      node_id: nodeId("SC", statusId),
      repository_id: repoId,
      sha,
      state: deployed ? "success" : "failure",
      context: "deploy/production",
      description: deployed ? "Deployed to production" : "Deploy failed",
      target_url: `https://deploy.example.com/${repo.name}/${sha.slice(0, 7)}`,
      creator: actionsBot,
      created_at: later(mergedAt, minute, 10 * minute),
    });
  }

  const issueClosed = fixed && mergedAt ? mergedAt : null;
  const issueId = 1_200_000_000n + id;

  rows.issues.push({
    id: issueId,
    version: new Date(
      Math.max(
        opened.getTime(),
        issueClosed?.getTime() ?? 0,
        ...issueComments.map((row) => row.created_at.getTime()),
      ),
    ),
    node_id: nodeId("I", issueId),
    repository_id: repoId,
    number: issueNumber,
    title,
    body: `${faker.hacker.phrase()}\n\nSteps to reproduce are in the thread.`,
    state: issueClosed ? "closed" : "open",
    state_reason: issueClosed ? "completed" : null,
    locked: false,
    user: faker.helpers.arrayElement(people),
    author_association: "MEMBER",
    labels: [label],
    assignees: [author],
    milestone: round === 0 ? milestoneForRepository(r) : null,
    comments: BigInt(issueComments.length),
    created_at: opened,
    closed_at: issueClosed,
    html_url: `${urlOf(repo)}/issues/${issueNumber}`,
  });

  // Every fifth round a repository ships a release.
  if (round % 5 === 4 && mergedAt) {
    const releaseId = 4_000_000_000n + id;
    const tag = `v1.${Math.floor(round / 5)}.0`;

    rows.releases.push({
      id: releaseId,
      version: mergedAt,
      node_id: nodeId("RE", releaseId),
      repository_id: repoId,
      tag_name: tag,
      target_commitish: "main",
      name: tag,
      body: `## What's changed\n\n- ${title} (#${prNumber})`,
      draft: false,
      prerelease: false,
      author,
      assets: [],
      created_at: mergedAt,
      published_at: mergedAt,
      html_url: `${urlOf(repo)}/releases/tag/${tag}`,
    });
  }

  return rows;
};

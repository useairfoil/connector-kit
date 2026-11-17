import type { FollowUp } from "../schemas/tasks";

import {
  componentId,
  day,
  hour,
  type IncidentGroup,
  json,
  minute,
  policyId,
  type StatusChange,
  statusPageId,
  teamId,
  ulid,
  userId,
} from "./shared";

/** After a serious incident: a post-mortem, follow-ups, and a status page notice. */
export const followUpRows = (
  incident: IncidentGroup,
  changes: ReadonlyArray<StatusChange>,
  helpers: ReadonlyArray<number>,
) => {
  const {
    faker,
    now,
    later,
    rows,
    index,
    id,
    name,
    service,
    team,
    severity,
    reported,
    resolved,
    finalStatus,
    lead,
    permalink,
  } = incident;

  const followUps: Array<FollowUp> = [];

  if (resolved && severity < 2) {
    const docCreated = later(resolved, hour, day);

    rows.postmortem_contents.push({
      id: ulid("PMD", index),
      version: docCreated,
      incident_id: id,
      markdown: `# ${name}\n\nThe team restored service and agreed on follow-ups.`,
    });
    rows.postmortem_documents.push({
      id: ulid("PMD", index),
      version: later(docCreated, hour, 5 * day),
      created_at: docCreated,
      updated_at: later(docCreated, hour, 5 * day),
      incident_id: id,
      title: `Post-mortem: ${name}`,
      status: finalStatus === 5 ? "completed" : "in_review",
      type: "in_app",
      document_url: `${permalink}/post-mortem`,
      exported_urls: [],
      editor_ids: [userId(lead)],
    });

    ["Add an alert for this failure", "Write a runbook", "Add a regression test"]
      .slice(0, faker.number.int({ min: 1, max: 3 }))
      .forEach((title, f) => {
        const created = later(resolved, hour, 2 * day);

        const done = faker.datatype.boolean({ probability: 0.6 })
          ? later(created, day, 20 * day)
          : null;

        const followUp: FollowUp = {
          id: ulid("FUP", index, f),
          version: done ?? created,
          created_at: created,
          updated_at: done ?? created,
          incident_id: id,
          title,
          description: null,
          status: done ? "completed" : "outstanding",
          assignee_id: userId(faker.helpers.arrayElement(helpers)),
          assignee_team_id: teamId(team),
          category_id: null,
          category_name: null,
          priority_id: null,
          priority_name: severity === 0 ? "High" : "Medium",
          labels: [],
          completed_at: done,
          creator_user_id: userId(lead),
          external_issue_provider: "linear",
          external_issue_name: `ENG-${4000 + index * 3 + f}`,
          external_issue_permalink: `https://linear.app/acme/issue/ENG-${4000 + index * 3 + f}`,
        };

        followUps.push(followUp);
      });

    rows.follow_ups.push(...followUps);

    // Follow-ups still open after 30 days break the policy.
    const late = followUps.filter(
      (followUp) =>
        followUp.status === "outstanding" &&
        now.getTime() - followUp.created_at.getTime() > 30 * day,
    );

    if (late.length > 0) {
      const due = new Date((late[0]?.created_at ?? now).getTime() + 30 * day);

      rows.policy_findings.push({
        id: ulid("PFD", index),
        version: now,
        created_at: due,
        updated_at: now,
        policy_id: policyId,
        policy_type: "follow_up",
        state: "active",
        due_at: due,
        days: BigInt(Math.floor((now.getTime() - due.getTime()) / day)),
        last_checked_at: now,
        responsible_user_ids: late.map((followUp) => followUp.assignee_id ?? userId(lead)),
        details: json({ follow_up_ids: late.map((followUp) => followUp.id) }),
        dismissal: null,
      });
    }

    rows.status_page_incidents.push({
      id: ulid("SPI", index),
      version: now,
      status_page_id: statusPageId,
      name,
      incident_status: "resolved",
      published_at: later(reported, 5 * minute, 20 * minute),
      component_impacts: json([
        {
          component_id: componentId(Math.min(service, 4)),
          status: severity === 0 ? "full_outage" : "degraded_performance",
        },
      ]),
      updates: json(
        changes.map((change) => ({ message: change.message, published_at: change.at })),
      ),
    });
  }
};

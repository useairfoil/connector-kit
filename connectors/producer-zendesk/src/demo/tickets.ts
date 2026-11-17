import {
  agentCount,
  agentId,
  brandId,
  type CustomerGroup,
  day,
  formId,
  groupId,
  minute,
  minutes,
  organizationId,
  planField,
  productAreaField,
  productAreas,
  slaId,
  statusIds,
  subjects,
  surveyId,
  talkLineId,
  vipGroup,
} from "./shared";

/**
 * One ticket with its comments, field history, metric events, and rating.
 * Returns when it last changed.
 */
export const ticketRows = (customer: CustomerGroup, n: number): Date => {
  const { faker, now, later, rows, index, userId, joined, vip, plan, organization } = customer;

  const ticketId = BigInt(1000 + index * 4 + n);
  const area = faker.helpers.arrayElement(productAreas);
  const subject = faker.helpers.arrayElement(subjects[area]);
  const channel = faker.helpers.arrayElement(["email", "web", "web", "api"]);

  const status = faker.helpers.weightedArrayElement([
    { weight: 45, value: "closed" },
    { weight: 20, value: "solved" },
    { weight: 15, value: "open" },
    { weight: 10, value: "pending" },
    { weight: 5, value: "new" },
    { weight: 5, value: "hold" },
  ] as const);

  // Solved tickets close four days later, so they need some history. Open ones are recent.
  const resolved = status === "closed" || status === "solved";

  const created = resolved
    ? faker.date.between({ from: joined, to: new Date(now.getTime() - 6 * day) })
    : faker.date.between({
        from: new Date(Math.max(joined.getTime(), now.getTime() - 7 * day)),
        to: now,
      });

  const priority = vip
    ? faker.helpers.arrayElement(["high", "urgent", "normal"])
    : faker.helpers.arrayElement(["normal", "normal", "low", "high"]);

  const group = vip ? vipGroup : area === "billing" ? 1 : area === "integrations" ? 2 : 0;
  const assignee = status === "new" ? null : agentId(faker.number.int({ max: agentCount - 1 }));

  const firstReply = assignee
    ? later(created, 5 * minute, vip ? 60 * minute : 8 * 60 * minute)
    : null;

  const solved = resolved ? later(firstReply ?? created, 30 * minute, day) : null;

  const closed =
    status === "closed" && solved ? later(solved, 4 * day, 4 * day + 60 * minute) : null;

  const rated = solved !== null && faker.datatype.boolean({ probability: 0.4 });
  const happy = faker.datatype.boolean({ probability: 0.85 });

  // The conversation: the question, the agent's replies, and sometimes a note.
  const comment = (c: number, author: bigint, isPublic: boolean, body: string, time: Date) => {
    rows.ticket_comments.push({
      id: 39_000_000_000n + ticketId * 10n + BigInt(c),
      version: time,
      ticket_id: ticketId,
      type: "Comment",
      author_id: author,
      public: isPublic,
      created_at: time,
      via: { channel: author === userId ? channel : "web" },
      body,
      attachments:
        c === 0 && area === "mobile"
          ? [
              {
                id: 40_000_000_000n + ticketId,
                file_name: "screenshot.png",
                content_type: "image/png",
                size: BigInt(faker.number.int({ min: 40_000, max: 900_000 })),
              },
            ]
          : [],
    });
  };

  const description = `Hi, ${subject.toLowerCase()}. ${faker.helpers.arrayElement([
    "It started yesterday.",
    "This is blocking my team.",
    "I tried logging out and back in.",
    "Can you take a look?",
  ])}`;

  comment(0, userId, true, description, created);
  let replies = 0;

  if (assignee && firstReply) {
    comment(1, assignee, true, "Thanks for reaching out! I'm looking into this now.", firstReply);
    replies++;

    if (faker.datatype.boolean({ probability: 0.3 })) {
      comment(
        2,
        assignee,
        false,
        "Checked the logs, looks like a known issue.",
        later(firstReply, minute, 60 * minute),
      );
    }

    if (solved) {
      comment(
        3,
        assignee,
        true,
        "This should be fixed now. Let me know if you still see it.",
        solved,
      );

      replies++;
    }
  }

  const history: Array<readonly [Date, string, string | null, string | null]> = [
    [created, "status", "new", null],
    [created, "priority", priority, null],
    [created, "group_id", String(groupId(group)), null],
  ];

  if (assignee && firstReply) {
    history.push([firstReply, "assignee_id", String(assignee), null]);

    history.push([
      firstReply,
      "status",
      status === "pending" ? "pending" : status === "hold" ? "hold" : "open",
      "new",
    ]);
  }

  if (solved) history.push([solved, "status", "solved", "open"]);
  if (closed) history.push([closed, "status", "closed", "solved"]);

  history.forEach(([time, field, value, previous], h) => {
    const id = 41_000_000_000n + ticketId * 20n + BigInt(h);
    // Zendesk itself closes solved tickets after four days.
    const updater =
      field === "status" && value === "closed"
        ? -1n
        : time === created
          ? userId
          : (assignee ?? userId);
    const eventType = previous === null && time === created ? "Create" : "Change";

    rows.ticket_field_history.push({
      id,
      version: time,
      ticket_id: ticketId,
      updater_id: updater,
      event_type: eventType,
      field_name: field,
      value,
      previous_value: previous,
      via: field === "status" && value === "closed" ? "Rule" : "Web form",
    });

    // One audit per change keeps it simple. Zendesk groups changes made together.
    rows.ticket_audits.push({
      id: 43_000_000_000n + ticketId * 20n + BigInt(h),
      version: time,
      ticket_id: ticketId,
      author_id: updater,
      created_at: time,
      events: [
        {
          id,
          type: eventType,
          field_name: field,
          value,
          previous_value: previous,
        },
      ],
    });
  });

  if (assignee && firstReply && channel === "api" && area === "login") {
    const callId = 44_000_000_000n + ticketId;
    const talkTime = BigInt(faker.number.int({ min: 60, max: 900 }));
    const waitTime = BigInt(faker.number.int({ min: 5, max: 120 }));
    const ended = new Date(firstReply.getTime() + Number(talkTime + waitTime) * 1000);
    const times = { completion_status: "completed", created_at: firstReply, updated_at: ended };

    rows.talk_calls.push({
      id: callId,
      version: ended,
      ...times,
      ticket_id: ticketId,
      agent_id: assignee,
      customer_id: userId,
      line_id: talkLineId,
      direction: "inbound",
      duration: talkTime + waitTime,
      talk_time: talkTime,
      wait_time: waitTime,
      voicemail: false,
    });

    rows.talk_legs.push(
      {
        id: 45_000_000_000n + ticketId * 2n,
        version: ended,
        ...times,
        call_id: callId,
        agent_id: null,
        user_id: userId,
        type: "customer",
        duration: talkTime + waitTime,
        talk_time: talkTime,
      },
      {
        id: 45_000_000_000n + ticketId * 2n + 1n,
        version: ended,
        ...times,
        call_id: callId,
        agent_id: assignee,
        user_id: assignee,
        type: "agent",
        duration: talkTime,
        talk_time: talkTime,
      },
    );
  }

  const metric = (m: number, name: string, type: string, time: Date, sla?: bigint) => {
    rows.ticket_metric_events.push({
      id: 42_000_000_000n + ticketId * 20n + BigInt(m),
      version: time,
      _deleted: false,
      ticket_id: ticketId,
      metric: name,
      instance_id: 1n,
      type,
      time,
      sla_policy_id: sla === undefined ? null : slaId,
      sla_target_in_seconds: sla ?? null,
      sla_business_hours: sla === undefined ? null : priority !== "urgent",
      status_calendar: null,
      status_business: null,
    });
  };

  metric(0, "reply_time", "activate", created);

  if (vip)
    metric(
      1,
      "reply_time",
      "apply_sla",
      created,
      priority === "urgent" ? 1800n : priority === "high" ? 3600n : 14_400n,
    );

  if (firstReply) metric(2, "reply_time", "fulfill", firstReply);
  metric(3, "agent_work_time", "activate", created);
  if (solved) metric(4, "agent_work_time", "fulfill", solved);

  const score = rated ? (happy ? "good" : "bad") : solved ? "offered" : "unoffered";

  if (rated && solved) {
    const ratedAt = later(solved, 10 * minute, 2 * day);

    const ratingComment = happy
      ? faker.helpers.arrayElement(["Quick and helpful, thanks!", "Great support.", null])
      : "Took too long to get an answer.";

    rows.satisfaction_ratings.push({
      id: 43_000_000_000n + ticketId,
      version: ratedAt,
      created_at: ratedAt,
      updated_at: ratedAt,
      ticket_id: ticketId,
      requester_id: userId,
      assignee_id: assignee,
      group_id: groupId(group),
      score,
      comment: ratingComment,
      reason: happy ? null : "The issue took too long to resolve",
      reason_id: happy ? null : 1001n,
    });

    const rating = happy
      ? faker.helpers.arrayElement([4, 5, 5])
      : faker.helpers.arrayElement([1, 2]);

    rows.survey_responses.push({
      id: `01JDEMO${ticketId.toString().padStart(19, "0")}`,
      version: ratedAt,
      ticket_id: ticketId,
      responder_id: userId,
      survey_id: surveyId,
      survey_version: 1n,
      rating: BigInt(rating),
      rating_category: happy ? "good" : "bad",
      answers: [
        {
          question_id: "01JDEMO0000000000000QRATE1",
          question_type: "rating_scale_numeric",
          type: "rating_scale",
          rating: BigInt(rating),
          rating_category: happy ? "good" : "bad",
          value: null,
          option_ids: [],
          updated_at: ratedAt,
        },
        ...(ratingComment
          ? [
              {
                question_id: "01JDEMO0000000000000QTEXT1",
                question_type: "open_ended",
                type: "open_ended",
                rating: null,
                rating_category: null,
                value: ratingComment,
                option_ids: [],
                updated_at: ratedAt,
              },
            ]
          : []),
      ],
      expires_at: new Date(ratedAt.getTime() + 28 * day),
    });
  }

  const updated = closed ?? solved ?? firstReply ?? created;

  const calendar = (from: Date | null, to: Date | null) => ({
    calendar: from && to ? minutes(from, to) : null,
    business: from && to ? (minutes(from, to) * 8n) / 24n : null,
  });

  rows.tickets.push({
    id: ticketId,
    version: updated,
    _deleted: false,
    created_at: created,
    updated_at: updated,
    subject,
    description,
    status,
    custom_status_id: status === "closed" ? statusIds.solved : statusIds[status],
    priority,
    type: faker.helpers.arrayElement(["question", "incident", "problem"]),
    via: { channel },
    requester_id: userId,
    submitter_id: userId,
    assignee_id: assignee,
    organization_id: organization === undefined ? null : organizationId(organization),
    group_id: groupId(group),
    brand_id: brandId,
    ticket_form_id: area === "billing" ? formId(1) : formId(0),
    problem_id: null,
    due_at: null,
    external_id: null,
    is_public: true,
    satisfaction_rating: rated ? { score, comment: null } : { score },
    tags: [area, plan],
    custom_fields: new Map([
      [String(productAreaField), area],
      [String(planField), plan],
    ]),
    metrics: {
      replies: BigInt(replies),
      reopens: 0n,
      assignee_stations: assignee ? 1n : 0n,
      group_stations: 1n,
      reply_time_in_minutes: calendar(created, firstReply),
      first_resolution_time_in_minutes: calendar(created, solved),
      full_resolution_time_in_minutes: calendar(created, solved),
      agent_wait_time_in_minutes: { calendar: 0n, business: 0n },
      requester_wait_time_in_minutes: calendar(created, firstReply),
      on_hold_time_in_minutes: { calendar: 0n, business: 0n },
      assigned_at: firstReply,
      initially_assigned_at: firstReply,
      solved_at: solved,
      latest_comment_added_at: solved ?? firstReply ?? created,
      status_updated_at: updated,
    },
  });

  return updated;
};

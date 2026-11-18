import {
  type AccountContact,
  type AccountGroup,
  datetime,
  day,
  hour,
  type OpportunityPlan,
  sfid,
  sobject,
  topicId,
  userId,
} from "./shared";

/** Customers open cases, worked by support. */
export const caseRows = (
  account: AccountGroup,
  main: AccountContact | undefined,
  won: OpportunityPlan | undefined,
) => {
  const { faker, now, at, between, index, accountId, agent, domain, created, add, next } = account;

  const caseCount = won ? faker.number.int({ max: 3 }) : 0;

  for (let k = 0; k < caseCount; k++) {
    const caseId = next("500");
    const opened = between(won?.closed ?? created, now);

    const closedCase = faker.datatype.boolean({ probability: 0.7 })
      ? at(opened.getTime() + faker.number.int({ min: hour, max: 5 * day }))
      : null;

    const target = new Date(opened.getTime() + 48 * hour);
    add(
      "case_milestones",
      sobject(sfid("557", index, k), opened, closedCase ?? opened, now, {
        CaseId: caseId,
        StartDate: datetime(opened),
        TargetDate: datetime(target),
        CompletionDate: closedCase === null ? null : datetime(closedCase),
        IsCompleted: closedCase !== null,
        IsViolated: (closedCase ?? now) > target,
      }),
    );

    const subject = faker.helpers.arrayElement([
      "Dashboard won't load",
      "Connector sync failing",
      "Need help with SSO",
      "Export is missing rows",
    ]);

    add(
      "cases",
      sobject(caseId, opened, closedCase ?? opened, now, {
        AccountId: accountId,
        ContactId: main?.id ?? null,
        Subject: subject,
        Description: `${subject}. It started this morning.`,
        Status: closedCase ? "Closed" : faker.helpers.arrayElement(["New", "Working", "Escalated"]),
        Priority: faker.helpers.arrayElement(["Low", "Medium", "High"]),
        Origin: faker.helpers.arrayElement(["Email", "Web", "Phone", "Chat"]),
        IsClosed: closedCase !== null,
        ClosedDate: closedCase ? datetime(closedCase) : null,
        CaseNumber: String(50_000 + index * 4 + k),
        OwnerId: userId(agent),
        RecordTypeId: sfid("012", 1),
      }),
    );

    add(
      "case_comments",
      sobject(next("00a"), opened, opened, now, {
        ParentId: caseId,
        CommentBody: "Thanks, we're looking into it.",
        IsPublished: true,
        CreatedById: userId(agent),
      }),
    );

    if (main)
      add(
        "case_contact_roles",
        sobject(next("03j"), opened, opened, now, {
          CasesId: caseId,
          ContactId: main.id,
          Role: "Technical Contact",
        }),
      );

    add(
      "case_team_members",
      sobject(next("0B6"), opened, opened, now, {
        ParentId: caseId,
        MemberId: userId(agent),
        TeamRoleId: sfid("0B7", 0),
      }),
    );

    add(
      "case_history",
      sobject(next("017"), opened, opened, now, {
        CaseId: caseId,
        Field: "Status",
        OldValue: null,
        NewValue: "New",
        CreatedById: userId(agent),
      }),
    );

    if (closedCase)
      add(
        "case_history",
        sobject(next("017"), closedCase, closedCase, now, {
          CaseId: caseId,
          Field: "Status",
          OldValue: "Working",
          NewValue: "Closed",
          CreatedById: userId(agent),
        }),
      );

    const emailId = next("02s");

    add(
      "email_messages",
      sobject(emailId, opened, opened, now, {
        ParentId: caseId,
        Subject: subject,
        FromAddress: main?.email ?? `support@${domain}`,
        ToAddress: "support@acme-analytics.example.com",
        Incoming: true,
        Status: "3",
        TextBody: `${subject}. Can you help?`,
      }),
    );

    add(
      "email_message_relations",
      sobject(next("0EM"), opened, opened, now, {
        EmailMessageId: emailId,
        RelationId: main?.id ?? null,
        RelationType: "FromAddress",
        RelationAddress: main?.email ?? null,
      }),
    );

    if (faker.datatype.boolean({ probability: 0.3 })) {
      const chatStart = at(opened.getTime() - hour / 6);

      add(
        "live_chat_transcripts",
        sobject(next("570"), chatStart, chatStart, now, {
          CaseId: caseId,
          ContactId: main?.id ?? null,
          Status: "Completed",
          StartTime: datetime(chatStart),
          EndTime: datetime(opened),
          ChatDuration: 600,
          OwnerId: userId(agent),
        }),
      );

      add(
        "messaging_sessions",
        sobject(next("0Mw"), chatStart, chatStart, now, {
          CaseId: caseId,
          Status: "Ended",
          Origin: "InboundInitiated",
          StartTime: datetime(chatStart),
          EndTime: datetime(opened),
          OwnerId: userId(agent),
        }),
      );
    }

    add(
      "topic_assignments",
      sobject(next("0FT"), opened, opened, now, {
        TopicId: topicId(2),
        EntityId: caseId,
        EntityType: "Case",
      }),
    );
  }
};

import type { Demo } from "@useairfoil/connector-kit";

import type { CustomObject, ObjectRow } from "../schemas/objects";

import { activityRows, leadRows } from "./activity";
import { caseRows } from "./cases";
import { contactRows } from "./contacts";
import { contractRows } from "./contracts";
import { opportunityRows } from "./opportunities";
import {
  type AccountGroup,
  campaignId,
  campaigns,
  clock,
  datetime,
  day,
  sfid,
  sobject,
  type TableName,
  userId,
} from "./shared";

/** One group is one account with its people, deals, contracts, service work, and activity. */
export const accountRows = (index: number, context: Demo.DemoContext) => {
  const { faker, now } = context;
  const { at } = clock(context);

  const rows: Partial<Record<TableName, Array<ObjectRow>>> = {};
  const custom: Array<CustomObject> = [];

  const add = (table: TableName, row: ObjectRow) => {
    (rows[table] ??= []).push(row);
  };

  let n = 0;

  // Each record gets the next number within the account, so IDs follow write order.
  const next = (prefix: string) => sfid(prefix, index, n++);

  const owner = 3 + faker.number.int({ max: 4 });
  const agent = 8 + faker.number.int({ max: 3 });
  const name = faker.company.name();
  const domain = `${name.toLowerCase().replaceAll(/[^a-z]+/g, "")}.example.com`;

  const industry = faker.helpers.arrayElement([
    "Technology",
    "Finance",
    "Healthcare",
    "Retail",
    "Manufacturing",
  ]);

  const employees = faker.helpers.arrayElement([40, 120, 450, 1_500, 8_000]);
  const created = at(now.getTime() - faker.number.int({ min: 30 * day, max: 800 * day }));
  const city = faker.location.city();
  const state = faker.location.state({ abbreviated: true });
  const accountId = sfid("001", index);

  const account: AccountGroup = {
    ...context,
    ...clock(context),
    index,
    accountId,
    name,
    owner,
    agent,
    domain,
    industry,
    created,
    city,
    state,
    add,
    next,
    custom,
  };

  const documentId = sfid("069", index);
  const versionId = sfid("068", index);
  add(
    "content_documents",
    sobject(documentId, created, created, now, {
      Title: "Account onboarding guide",
      FileType: "PDF",
      OwnerId: userId(owner),
      LatestPublishedVersionId: versionId,
    }),
  );
  add(
    "content_versions",
    sobject(versionId, created, created, now, {
      ContentDocumentId: documentId,
      Title: "Account onboarding guide",
      FileExtension: "pdf",
      VersionNumber: "1",
      IsLatest: true,
      FirstPublishLocationId: accountId,
    }),
  );
  add(
    "content_notes",
    sobject(sfid("069", index, 1), created, created, now, {
      Title: "Kickoff call notes",
      TextPreview: "Schedule the rollout after the customer's reporting cutover.",
      CreatedById: userId(owner),
    }),
  );

  const contacts = contactRows(account);

  const main = contacts[0];
  const contactIds = contacts.map((contact) => contact.id);

  add(
    "account_team_members",
    sobject(next("01M"), created, created, now, {
      AccountId: accountId,
      UserId: userId(owner),
      TeamMemberRole: "Account Manager",
      AccountAccessLevel: "Edit",
    }),
  );

  add(
    "account_history",
    sobject(next("017"), created, created, now, {
      AccountId: accountId,
      Field: "created",
      OldValue: null,
      NewValue: null,
      CreatedById: userId(owner),
    }),
  );

  if (index > 0 && faker.datatype.boolean({ probability: 0.1 })) {
    add(
      "partners",
      sobject(next("00I"), created, created, now, {
        AccountFromId: accountId,
        AccountToId: sfid("001", index - 1),
        Role: "Reseller",
        IsPrimary: false,
      }),
    );
  }

  // A campaign brought some contacts in.
  const campaign = faker.number.int({ max: campaigns.length - 1 });

  if (main) {
    add(
      "campaign_members",
      sobject(next("00v"), main.added, main.added, now, {
        CampaignId: campaignId(campaign),
        ContactId: main.id,
        Status: "Responded",
        HasResponded: true,
      }),
    );
  }

  const opportunities = opportunityRows(account, main, campaign);

  const forecastItemId = sfid("0G3", index);
  add(
    "forecasting_items",
    sobject(forecastItemId, created, created, now, {
      OwnerId: userId(owner),
      ForecastCategoryName: "Pipeline",
      ForecastAmount: 24_000,
    }),
  );
  const forecastOpportunity = opportunities[0];
  if (forecastOpportunity) {
    add(
      "forecasting_facts",
      sobject(sfid("0G4", index), created, created, now, {
        ForecastingItemId: forecastItemId,
        OpportunityId: forecastOpportunity.id,
        OwnerId: userId(owner),
        ForecastCategoryName: "Pipeline",
      }),
    );
  }

  const won = opportunities.find((opportunity) => opportunity.stage === 5 && opportunity.closed);

  contractRows(account, main, opportunities, won);
  caseRows(account, main, won);
  activityRows(account, contactIds, opportunities, won);
  leadRows(account, main, campaign);

  const lastTouch = new Date(
    Math.max(
      created.getTime(),
      ...opportunities.map((opportunity) => (opportunity.closed ?? created).getTime()),
    ),
  );

  add(
    "accounts",
    sobject(accountId, created, lastTouch, now, {
      Name: name,
      Type: won ? "Customer" : "Prospect",
      Industry: industry,
      NumberOfEmployees: employees,
      AnnualRevenue: employees * faker.number.int({ min: 100_000, max: 250_000 }),
      Website: `https://www.${domain}`,
      Phone: faker.phone.number({ style: "national" }),
      BillingCity: city,
      BillingState: state,
      BillingCountry: "United States",
      OwnerId: userId(owner),
      Rating: won ? "Hot" : faker.helpers.arrayElement(["Warm", "Cold"]),
      AccountSource: "Web",
    }),
  );

  return {
    ...rows,
    custom_objects: custom,
    content_document_links: [
      {
        id: documentId,
        version: now,
        links: [
          {
            Id: sfid("06A", index),
            ContentDocumentId: documentId,
            LinkedEntityId: accountId,
            ShareType: "V",
            Visibility: "AllUsers",
            SystemModstamp: datetime(created),
          },
        ],
      },
    ],
  };
};

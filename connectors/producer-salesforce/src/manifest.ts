import * as Manifest from "@useairfoil/connector-kit/manifest";

export const SalesforceConfigDef = Manifest.defineConfig({
  domain: Manifest.string({
    runtimeKey: "SALESFORCE_DOMAIN",
    description: "My Domain host of the org, such as acme.my.salesforce.com.",
  }),
  clientId: Manifest.string({
    runtimeKey: "SALESFORCE_CLIENT_ID",
    description: "Consumer key of the External Client App.",
  }),
  clientSecret: Manifest.secret({
    runtimeKey: "SALESFORCE_CLIENT_SECRET",
    description: "Consumer secret of the External Client App.",
  }),
});

export type SalesforceConfig = Manifest.ConfigValuesOf<typeof SalesforceConfigDef>;

export type ObjectSpec = {
  /** Resource name, such as `accounts`. */
  readonly name: string;
  /** Salesforce object, such as `Account`. */
  readonly object: string;
  /** Setup objects change rarely, so they are polled less often. */
  readonly setup?: boolean;
  /** Salesforce rejects `getDeleted` for these. */
  readonly deletes?: false;
};

/** Standard objects, each in its own table. */
export const objects = [
  // Sales
  { name: "accounts", object: "Account" },
  { name: "account_contact_relations", object: "AccountContactRelation" },
  { name: "account_team_members", object: "AccountTeamMember" },
  { name: "contacts", object: "Contact" },
  { name: "leads", object: "Lead" },
  { name: "opportunities", object: "Opportunity" },
  { name: "opportunity_line_items", object: "OpportunityLineItem" },
  { name: "opportunity_contact_roles", object: "OpportunityContactRole" },
  { name: "opportunity_competitors", object: "OpportunityCompetitor" },
  { name: "opportunity_team_members", object: "OpportunityTeamMember" },
  { name: "opportunity_splits", object: "OpportunitySplit" },
  { name: "partners", object: "Partner" },
  { name: "forecasting_quotas", object: "ForecastingQuota" },
  // Quotes and orders
  { name: "quotes", object: "Quote" },
  { name: "quote_line_items", object: "QuoteLineItem" },
  { name: "contracts", object: "Contract" },
  { name: "contract_contact_roles", object: "ContractContactRole" },
  { name: "orders", object: "Order" },
  { name: "order_items", object: "OrderItem" },
  // Catalog and assets
  { name: "products", object: "Product2" },
  { name: "pricebooks", object: "Pricebook2" },
  { name: "pricebook_entries", object: "PricebookEntry" },
  { name: "assets", object: "Asset" },
  { name: "asset_relationships", object: "AssetRelationship" },
  // Marketing
  { name: "campaigns", object: "Campaign" },
  { name: "campaign_members", object: "CampaignMember" },
  { name: "campaign_member_statuses", object: "CampaignMemberStatus" },
  { name: "individuals", object: "Individual" },
  { name: "contact_point_emails", object: "ContactPointEmail" },
  { name: "contact_point_phones", object: "ContactPointPhone" },
  // Service
  { name: "cases", object: "Case" },
  { name: "case_comments", object: "CaseComment" },
  { name: "case_contact_roles", object: "CaseContactRole" },
  { name: "case_team_members", object: "CaseTeamMember" },
  { name: "entitlements", object: "Entitlement" },
  { name: "service_contracts", object: "ServiceContract" },
  { name: "contract_line_items", object: "ContractLineItem" },
  { name: "solutions", object: "Solution" },
  { name: "email_messages", object: "EmailMessage" },
  { name: "email_message_relations", object: "EmailMessageRelation" },
  { name: "live_chat_transcripts", object: "LiveChatTranscript" },
  { name: "messaging_sessions", object: "MessagingSession" },
  { name: "macros", object: "Macro" },
  { name: "quick_texts", object: "QuickText" },
  // Field Service
  { name: "work_orders", object: "WorkOrder" },
  { name: "work_order_line_items", object: "WorkOrderLineItem" },
  { name: "service_appointments", object: "ServiceAppointment" },
  { name: "service_resources", object: "ServiceResource" },
  { name: "service_territories", object: "ServiceTerritory" },
  { name: "assigned_resources", object: "AssignedResource" },
  { name: "resource_absences", object: "ResourceAbsence" },
  { name: "locations", object: "Location" },
  { name: "product_items", object: "ProductItem" },
  // Activities
  { name: "tasks", object: "Task" },
  { name: "task_relations", object: "TaskRelation" },
  { name: "events", object: "Event" },
  { name: "event_relations", object: "EventRelation" },
  { name: "notes", object: "Note" },
  { name: "attachments", object: "Attachment" },
  { name: "feed_items", object: "FeedItem" },
  { name: "feed_comments", object: "FeedComment" },
  { name: "topics", object: "Topic" },
  { name: "topic_assignments", object: "TopicAssignment" },
  // Field history
  { name: "account_history", object: "AccountHistory" },
  { name: "contact_history", object: "ContactHistory" },
  { name: "lead_history", object: "LeadHistory" },
  { name: "case_history", object: "CaseHistory" },
  { name: "opportunity_history", object: "OpportunityHistory" },
  { name: "opportunity_field_history", object: "OpportunityFieldHistory" },
  // Users and setup
  { name: "users", object: "User", setup: true },
  { name: "user_roles", object: "UserRole", setup: true },
  { name: "profiles", object: "Profile", setup: true },
  { name: "permission_sets", object: "PermissionSet", setup: true },
  { name: "permission_set_assignments", object: "PermissionSetAssignment", setup: true },
  { name: "groups", object: "Group", setup: true },
  { name: "group_members", object: "GroupMember", setup: true },
  { name: "collaboration_groups", object: "CollaborationGroup", setup: true },
  { name: "collaboration_group_members", object: "CollaborationGroupMember", setup: true },
  { name: "opportunity_stages", object: "OpportunityStage", setup: true, deletes: false },
  { name: "lead_statuses", object: "LeadStatus", setup: true, deletes: false },
  { name: "case_statuses", object: "CaseStatus", setup: true, deletes: false },
  { name: "contract_statuses", object: "ContractStatus", setup: true, deletes: false },
  { name: "task_statuses", object: "TaskStatus", setup: true, deletes: false },
  { name: "task_priorities", object: "TaskPriority", setup: true, deletes: false },
  { name: "solution_statuses", object: "SolutionStatus", setup: true, deletes: false },
  { name: "record_types", object: "RecordType", setup: true },
  { name: "business_hours", object: "BusinessHours", setup: true, deletes: false },
  { name: "holidays", object: "Holiday", setup: true },
  { name: "periods", object: "Period", setup: true },
  { name: "organization", object: "Organization", setup: true, deletes: false },
  { name: "folders", object: "Folder", setup: true },
  { name: "documents", object: "Document", setup: true },
  // Data quality
  { name: "duplicate_record_sets", object: "DuplicateRecordSet" },
  { name: "duplicate_record_items", object: "DuplicateRecordItem" },
] as const satisfies ReadonlyArray<ObjectSpec>;

const capabilities = ["backfill", "changes"] as const;

export const manifest = Manifest.define({
  name: "producer-salesforce",
  title: "Salesforce",
  config: SalesforceConfigDef.spec,
  resources: [
    ...objects.map(({ name }) => ({ name, capabilities })),
    { name: "custom_objects", capabilities },
    { name: "object_fields", capabilities },
  ],
});

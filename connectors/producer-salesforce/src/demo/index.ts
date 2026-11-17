import { ConnectorApp, Demo, RuntimeConfig } from "@useairfoil/connector-kit";
import { Command } from "effect/cli";

import { objects } from "../manifest";
import { FileLinksSchema } from "../objects/file-links";
import { KnowledgeVersionSchema } from "../objects/knowledge";
import { ObjectFieldSchema } from "../schemas/object-fields";
import { CustomObjectSchema, objectSchema } from "../schemas/objects";
import { accountRows } from "./accounts";
import { setupRows } from "./setup";
import { type TableName, type Value, day, sfid, sobject } from "./shared";

const objectTables = objects.map((spec) =>
  Demo.table({ name: spec.name, rowSchema: objectSchema(spec.object), version: "version" }),
);

// Tables the org setup writes once. Every other object comes with an account.
const orgTables = new Set<TableName>([
  "organization",
  "profiles",
  "user_roles",
  "users",
  "permission_sets",
  "permission_set_assignments",
  "groups",
  "group_members",
  "collaboration_groups",
  "collaboration_group_members",
  "opportunity_stages",
  "lead_statuses",
  "case_statuses",
  "contract_statuses",
  "task_statuses",
  "task_priorities",
  "solution_statuses",
  "record_types",
  "business_hours",
  "holidays",
  "periods",
  "folders",
  "documents",
  "products",
  "pricebooks",
  "pricebook_entries",
  "campaigns",
  "campaign_member_statuses",
  "forecasting_quotas",
  "solutions",
  "macros",
  "quick_texts",
  "locations",
  "service_territories",
  "service_resources",
  "resource_absences",
  "product_items",
  "topics",
]);

export const demo = Demo.define({
  name: "producer-salesforce",
  setup: {
    tables: [
      ...objectTables.filter((table) => orgTables.has(table.name)),
      Demo.table({
        name: "knowledge_article_versions",
        rowSchema: KnowledgeVersionSchema,
        version: "version",
      }),
      Demo.table({ name: "object_fields", rowSchema: ObjectFieldSchema, version: "version" }),
    ],
    rows: (context) => {
      const created = new Date(context.now.getTime() - 30 * day);
      const article = (index: number, fields: Readonly<Record<string, Value>>) =>
        sobject(sfid("ka0", 0, index), created, created, context.now, {
          KnowledgeArticleId: sfid("kA0", 0),
          ArticleNumber: "000001001",
          UrlName: "reset-password",
          VersionNumber: 2,
          IsLatestVersion: true,
          PublishStatus: "Online",
          ...fields,
        });
      return {
        ...setupRows(context),
        knowledge_article_versions: [
          article(0, {
            Language: "en_US",
            IsMasterLanguage: true,
            Title: "Reset your password",
            Summary: "Steps to reset your password.",
          }),
          article(1, {
            Language: "fr",
            IsMasterLanguage: false,
            Title: "Réinitialiser votre mot de passe",
            Summary: "Étapes de réinitialisation.",
          }),
          article(2, {
            Language: "en_US",
            IsMasterLanguage: true,
            VersionNumber: 1,
            IsLatestVersion: false,
            PublishStatus: "Archived",
            Title: "Reset a password",
            Summary: null,
          }),
        ],
      };
    },
  },
  group: {
    tables: [
      ...objectTables.filter((table) => !orgTables.has(table.name)),
      Demo.table({ name: "custom_objects", rowSchema: CustomObjectSchema, version: "version" }),
      Demo.table({
        name: "content_document_links",
        rowSchema: FileLinksSchema,
        version: "version",
      }),
    ],
    rows: accountRows,
    // An account with everything around it is about 27 KB.
    groupsPerChunk: 30,
  },
});

export const demoCommand = ConnectorApp.makeDemoCommand(demo).pipe(
  Command.provide(RuntimeConfig.layerHosted()),
);

import { ConnectorApp, Demo, RuntimeConfig } from "@useairfoil/connector-kit";
import { Command } from "effect/cli";

import { objects } from "../manifest";
import { ObjectFieldSchema } from "../schemas/object-fields";
import { CustomObjectSchema, objectSchema } from "../schemas/objects";
import { accountRows } from "./accounts";
import { setupRows } from "./setup";
import { type TableName } from "./shared";

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
      Demo.table({ name: "object_fields", rowSchema: ObjectFieldSchema, version: "version" }),
    ],
    rows: setupRows,
  },
  group: {
    tables: [
      ...objectTables.filter((table) => !orgTables.has(table.name)),
      Demo.table({ name: "custom_objects", rowSchema: CustomObjectSchema, version: "version" }),
    ],
    rows: accountRows,
    // An account with everything around it is about 27 KB.
    groupsPerChunk: 30,
  },
});

export const demoCommand = ConnectorApp.makeDemoCommand(demo).pipe(
  Command.provide(RuntimeConfig.layerHosted()),
);

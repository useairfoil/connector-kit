import { describe, expect, it } from "@effect/vitest";
import { Iceberg } from "@useairfoil/connector-kit";
import { Effect } from "effect";

import { tableSchemas } from "../src/tables";

type CreateRequest = Effect.Success<ReturnType<typeof Iceberg.makeCreateTableRequest>>;
type TableSchema = CreateRequest["schema"];
type IcebergType = TableSchema["fields"][number]["type"];

const tableSchema = (request: CreateRequest): TableSchema => request.schema;

const undocumented = (type: IcebergType): ReadonlyArray<string> => {
  if (typeof type === "string") return [];
  switch (type.type) {
    case "struct":
      return type.fields.flatMap((field) => [
        ...(field.doc ? [] : [field.name]),
        ...undocumented(field.type),
      ]);
    case "list":
      return undocumented(type.element);
    case "map":
      return [...undocumented(type.key), ...undocumented(type.value)];
  }
};

const describeType = (type: IcebergType): string => {
  if (typeof type === "string") return type;
  switch (type.type) {
    case "struct":
      return `struct<${type.fields.map((field) => `${field.name}${field.required ? "" : "?"}: ${describeType(field.type)}`).join(", ")}>`;
    case "list":
      return `list<${describeType(type.element)}>`;
    case "map":
      return `map<${describeType(type.key)}, ${describeType(type.value)}>`;
  }
};

describe("Iceberg schemas", () => {
  it.effect("compiles every table with documented fields", () =>
    Effect.gen(function* () {
      const comments: Record<string, string | undefined> = {};
      const missingDocs: Array<string> = [];
      const tables: Record<string, ReadonlyArray<string>> = {};
      for (const [name, schema] of Object.entries(tableSchemas)) {
        const request = yield* Iceberg.makeCreateTableRequest(schema, {
          name: "rows",
          location: `s3://warehouse/google-analytics-${name}`,
        });
        comments[name] = request.properties?.comment;

        const fields = tableSchema(request);
        missingDocs.push(...undocumented(fields).map((field) => `${name}.${field}`));
        tables[name] = [
          `identifier: ${fields.fields
            .filter((field) => fields["identifier-field-ids"]?.includes(field.id))
            .map((field) => field.name)
            .join(", ")}`,
          ...fields.fields.map(
            (field) => `${field.name}${field.required ? "" : "?"}: ${describeType(field.type)}`,
          ),
        ];
      }

      expect({ comments, missingDocs }).toMatchInlineSnapshot(`
        {
          "comments": {
            "daily_overview": "Google Analytics totals per day.",
            "devices": "Google Analytics users per day and device.",
            "ecommerce_items": "Google Analytics ecommerce items per day. Empty without ecommerce events.",
            "events": "Google Analytics events per day and event name.",
            "landing_pages": "Google Analytics sessions per day and landing page.",
            "locations": "Google Analytics users per day and location.",
            "pages": "Google Analytics page views per day and page.",
            "traffic_sources": "Google Analytics sessions per day and traffic source.",
            "user_acquisition": "Google Analytics users per day and first traffic source.",
          },
          "missingDocs": [],
        }
      `);
      expect(tables).toMatchInlineSnapshot(`
        {
          "daily_overview": [
            "identifier: id",
            "id: string",
            "version?: timestamptz",
            "property_id?: string",
            "date?: string",
            "active_users?: long",
            "new_users?: long",
            "total_users?: long",
            "sessions?: long",
            "engaged_sessions?: long",
            "screen_page_views?: long",
            "event_count?: long",
            "key_events?: double",
            "total_revenue?: double",
            "user_engagement_duration?: double",
            "currency_code?: string",
          ],
          "devices": [
            "identifier: id",
            "id: string",
            "version?: timestamptz",
            "property_id?: string",
            "date?: string",
            "device_category?: string",
            "platform?: string",
            "operating_system?: string",
            "browser?: string",
            "active_users?: long",
            "new_users?: long",
            "sessions?: long",
            "engaged_sessions?: long",
            "screen_page_views?: long",
            "key_events?: double",
          ],
          "ecommerce_items": [
            "identifier: id",
            "id: string",
            "version?: timestamptz",
            "property_id?: string",
            "date?: string",
            "item_id?: string",
            "item_name?: string",
            "item_brand?: string",
            "item_category?: string",
            "items_viewed?: long",
            "items_added_to_cart?: long",
            "items_purchased?: long",
            "item_revenue?: double",
            "currency_code?: string",
          ],
          "events": [
            "identifier: id",
            "id: string",
            "version?: timestamptz",
            "property_id?: string",
            "date?: string",
            "event_name?: string",
            "event_count?: long",
            "total_users?: long",
            "event_value?: double",
            "key_events?: double",
          ],
          "landing_pages": [
            "identifier: id",
            "id: string",
            "version?: timestamptz",
            "property_id?: string",
            "date?: string",
            "landing_page?: string",
            "sessions?: long",
            "engaged_sessions?: long",
            "active_users?: long",
            "new_users?: long",
            "key_events?: double",
            "total_revenue?: double",
            "currency_code?: string",
          ],
          "locations": [
            "identifier: id",
            "id: string",
            "version?: timestamptz",
            "property_id?: string",
            "date?: string",
            "country?: string",
            "region?: string",
            "city?: string",
            "active_users?: long",
            "new_users?: long",
            "sessions?: long",
            "engaged_sessions?: long",
            "key_events?: double",
            "total_revenue?: double",
            "currency_code?: string",
          ],
          "pages": [
            "identifier: id",
            "id: string",
            "version?: timestamptz",
            "property_id?: string",
            "date?: string",
            "host_name?: string",
            "page_path?: string",
            "page_title?: string",
            "screen_page_views?: long",
            "active_users?: long",
            "event_count?: long",
            "key_events?: double",
            "user_engagement_duration?: double",
          ],
          "traffic_sources": [
            "identifier: id",
            "id: string",
            "version?: timestamptz",
            "property_id?: string",
            "date?: string",
            "session_source?: string",
            "session_medium?: string",
            "session_campaign_name?: string",
            "session_default_channel_group?: string",
            "sessions?: long",
            "engaged_sessions?: long",
            "active_users?: long",
            "new_users?: long",
            "screen_page_views?: long",
            "event_count?: long",
            "key_events?: double",
            "total_revenue?: double",
            "user_engagement_duration?: double",
            "currency_code?: string",
          ],
          "user_acquisition": [
            "identifier: id",
            "id: string",
            "version?: timestamptz",
            "property_id?: string",
            "date?: string",
            "first_user_source?: string",
            "first_user_medium?: string",
            "first_user_campaign_name?: string",
            "first_user_default_channel_group?: string",
            "new_users?: long",
            "active_users?: long",
            "sessions?: long",
            "engaged_sessions?: long",
            "key_events?: double",
            "total_revenue?: double",
            "currency_code?: string",
          ],
        }
      `);
    }),
  );
});

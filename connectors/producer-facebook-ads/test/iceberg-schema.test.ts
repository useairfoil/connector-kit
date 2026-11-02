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
          location: `s3://warehouse/facebook-ads-${name}`,
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
            "ad_accounts": "Facebook ad accounts.",
            "ad_sets": "Facebook ad sets.",
            "ads": "Facebook ads, with their creative.",
            "ads_insights": "Facebook ad performance per ad and day.",
            "ads_insights_age_gender": "Facebook ad performance per ad, day, age, and gender.",
            "ads_insights_country": "Facebook ad performance per ad, day, and country.",
            "ads_insights_platform": "Facebook ad performance per ad, day, platform, and placement.",
            "campaigns": "Facebook ad campaigns.",
          },
          "missingDocs": [],
        }
      `);
      expect(tables).toMatchInlineSnapshot(`
        {
          "ad_accounts": [
            "identifier: id",
            "id: string",
            "version?: timestamptz",
            "name?: string",
            "currency?: string",
            "timezone_name?: string",
            "timezone_offset_hours_utc?: double",
            "account_status?: long",
            "disable_reason?: long",
            "amount_spent?: long",
            "spend_cap?: long",
            "created_time?: timestamptz",
          ],
          "ad_sets": [
            "identifier: id",
            "id: string",
            "version?: timestamptz",
            "account_id?: string",
            "campaign_id?: string",
            "name?: string",
            "status?: string",
            "effective_status?: string",
            "optimization_goal?: string",
            "billing_event?: string",
            "bid_strategy?: string",
            "bid_amount?: long",
            "daily_budget?: long",
            "lifetime_budget?: long",
            "budget_remaining?: long",
            "destination_type?: string",
            "start_time?: timestamptz",
            "end_time?: timestamptz",
            "created_time?: timestamptz",
            "updated_time?: timestamptz",
          ],
          "ads": [
            "identifier: id",
            "id: string",
            "version?: timestamptz",
            "account_id?: string",
            "campaign_id?: string",
            "adset_id?: string",
            "name?: string",
            "status?: string",
            "effective_status?: string",
            "created_time?: timestamptz",
            "updated_time?: timestamptz",
            "creative?: struct<id?: string, name?: string, title?: string, body?: string, call_to_action_type?: string, thumbnail_url?: string, image_url?: string, object_type?: string, object_story_id?: string, link_url?: string, url_tags?: string>",
          ],
          "ads_insights": [
            "identifier: id",
            "id: string",
            "version?: timestamptz",
            "account_id?: string",
            "campaign_id?: string",
            "adset_id?: string",
            "ad_id?: string",
            "date?: string",
            "account_currency?: string",
            "impressions?: long",
            "reach?: long",
            "clicks?: long",
            "inline_link_clicks?: long",
            "spend?: double",
            "actions?: map<string, double>",
            "action_values?: map<string, double>",
            "conversions?: map<string, double>",
            "conversion_values?: map<string, double>",
            "video_play_actions?: map<string, double>",
            "video_p25_watched_actions?: map<string, double>",
            "video_p50_watched_actions?: map<string, double>",
            "video_p75_watched_actions?: map<string, double>",
            "video_p100_watched_actions?: map<string, double>",
          ],
          "ads_insights_age_gender": [
            "identifier: id",
            "id: string",
            "version?: timestamptz",
            "account_id?: string",
            "campaign_id?: string",
            "adset_id?: string",
            "ad_id?: string",
            "date?: string",
            "account_currency?: string",
            "age?: string",
            "gender?: string",
            "impressions?: long",
            "reach?: long",
            "clicks?: long",
            "inline_link_clicks?: long",
            "spend?: double",
            "actions?: map<string, double>",
            "action_values?: map<string, double>",
          ],
          "ads_insights_country": [
            "identifier: id",
            "id: string",
            "version?: timestamptz",
            "account_id?: string",
            "campaign_id?: string",
            "adset_id?: string",
            "ad_id?: string",
            "date?: string",
            "account_currency?: string",
            "country?: string",
            "impressions?: long",
            "reach?: long",
            "clicks?: long",
            "inline_link_clicks?: long",
            "spend?: double",
            "actions?: map<string, double>",
            "action_values?: map<string, double>",
          ],
          "ads_insights_platform": [
            "identifier: id",
            "id: string",
            "version?: timestamptz",
            "account_id?: string",
            "campaign_id?: string",
            "adset_id?: string",
            "ad_id?: string",
            "date?: string",
            "account_currency?: string",
            "publisher_platform?: string",
            "platform_position?: string",
            "impressions?: long",
            "reach?: long",
            "clicks?: long",
            "inline_link_clicks?: long",
            "spend?: double",
            "actions?: map<string, double>",
            "action_values?: map<string, double>",
          ],
          "campaigns": [
            "identifier: id",
            "id: string",
            "version?: timestamptz",
            "account_id?: string",
            "name?: string",
            "objective?: string",
            "status?: string",
            "effective_status?: string",
            "buying_type?: string",
            "bid_strategy?: string",
            "daily_budget?: long",
            "lifetime_budget?: long",
            "spend_cap?: long",
            "special_ad_categories?: list<string>",
            "start_time?: timestamptz",
            "stop_time?: timestamptz",
            "created_time?: timestamptz",
            "updated_time?: timestamptz",
          ],
        }
      `);
    }),
  );
});

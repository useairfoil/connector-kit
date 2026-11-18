import type { ConnectorError } from "@useairfoil/connector-kit";

import { DateTime, Effect, type Option } from "effect";

import type { FacebookAdsClientService } from "../../client/client";
import type { InsightsItem, InsightsSpec } from "./spec";

import { nextAfter, PageSchema } from "../../schemas/api";

const pageSize = 500;

export type InsightsPage<Row> = {
  readonly rows: ReadonlyArray<Row>;
  /** Cursor of the next page of the same day. */
  readonly next: Option.Option<string>;
};

export const readDay = <A extends InsightsItem, Row extends object>(
  client: FacebookAdsClientService,
  spec: InsightsSpec<A, Row>,
  account: string,
  options: {
    readonly day: string;
    readonly until?: string;
    readonly after?: string;
    readonly limit?: number;
  },
): Effect.Effect<InsightsPage<Row>, ConnectorError> =>
  Effect.gen(function* () {
    const breakdowns = new Set<string>(spec.breakdowns);

    const page = yield* client.get(spec.name, PageSchema(spec.item), `/act_${account}/insights`, {
      level: spec.level ?? "ad",
      ...(spec.attributionWindows === undefined
        ? {}
        : {
            action_attribution_windows: JSON.stringify(spec.attributionWindows),
          }),
      time_increment: spec.monthly ? "all_days" : "1",
      time_range: JSON.stringify({ since: options.day, until: options.until ?? options.day }),
      fields: Object.keys(spec.item.fields)
        .filter((name) => !breakdowns.has(name))
        .join(","),
      ...(spec.breakdowns.length === 0 ? {} : { breakdowns: spec.breakdowns.join(",") }),
      limit: String(options.limit ?? pageSize),
      ...(options.after === undefined ? {} : { after: options.after }),
    });

    const version = yield* DateTime.nowAsDate;
    return {
      rows: page.data.map((item) =>
        spec.toRow(
          item,
          JSON.stringify([
            account,
            {
              account,
              campaign: item.campaign_id,
              adset: item.adset_id,
              ad: item.ad_id,
            }[spec.level ?? "ad"],
            item.date_start,
            ...spec.breakdowns.map((name) => item[name]),
          ]),
          version,
        ),
      ),
      next: nextAfter(page),
    };
  });

import { Resource } from "@useairfoil/connector-kit";
import { DateTime, Effect, Schema, SchemaTransformation } from "effect";

import type { ZendeskClientService } from "../client/client";

import {
  TalkCallObjectSchema,
  TalkCallSchema,
  type TalkLine,
  TalkLegObjectSchema,
  TalkLegSchema,
  TalkLineObjectSchema,
  TalkLineSchema,
} from "../schemas/talk";
import { timeExport } from "./exports";
import { listAll, listSources } from "./pages";

export const makeTalkLines = (client: ZendeskClientService) =>
  Resource.entity({
    name: "talk_lines",
    rowSchema: TalkLineSchema,
    version: "version",
    ...listSources(
      Effect.gen(function* () {
        // It has no cursor paging. Accounts have a few lines.
        const lines = yield* listAll(client, {
          path: "/channels/voice/lines",
          key: "lines",
          item: TalkLineObjectSchema,
          params: {},
        });
        const version = yield* DateTime.nowAsDate;
        return lines.map(
          (line): TalkLine => ({
            ...line,
            version,
            brand_id: line.brand_id ?? null,
            number: line.number ?? null,
            display_number: line.display_number ?? null,
            country_code: line.country_code ?? null,
            toll_free: line.toll_free ?? null,
          }),
        );
      }),
    ),
  });

// Talk has no `end_of_stream` and `next_page` is never null, so an empty page
// is the end. Its `end_time` is dropped to keep the start time.
const exportPage = <Item extends Schema.Top>(key: "calls" | "legs", item: Item) => {
  const page = { records: Schema.Array(item), end_time: Schema.NullOr(Schema.Number) };
  return Schema.Struct({ ...page, count: Schema.Number }).pipe(
    Schema.encodeKeys({ records: key }),
    Schema.decodeTo(
      Schema.toType(Schema.Struct({ ...page, end_of_stream: Schema.Boolean })),
      SchemaTransformation.transform({
        decode: ({ count, ...rest }) => ({
          ...rest,
          end_time: count === 0 ? null : rest.end_time,
          end_of_stream: count === 0,
        }),
        encode: ({ end_of_stream: _, ...rest }) => ({ ...rest, count: rest.records.length }),
      }),
    ),
  );
};

export const makeTalkCalls = (client: ZendeskClientService) =>
  Resource.entity({
    name: "talk_calls",
    rowSchema: TalkCallSchema,
    version: "version",
    ...timeExport({
      client,
      path: "/channels/voice/stats/incremental/calls",
      schema: exportPage("calls", TalkCallObjectSchema),
      rows: (page) =>
        Effect.succeed(page.records.map((call) => ({ ...call, version: call.updated_at }))),
    }),
  });

export const makeTalkLegs = (client: ZendeskClientService) =>
  Resource.entity({
    name: "talk_legs",
    rowSchema: TalkLegSchema,
    version: "version",
    ...timeExport({
      client,
      path: "/channels/voice/stats/incremental/legs",
      schema: exportPage("legs", TalkLegObjectSchema),
      rows: (page) =>
        Effect.succeed(page.records.map((leg) => ({ ...leg, version: leg.updated_at }))),
    }),
  });

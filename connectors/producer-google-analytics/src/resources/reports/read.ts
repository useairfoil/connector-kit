import { ConnectorError } from "@useairfoil/connector-kit";
import { DateTime, Effect, Option, Schema } from "effect";

import type { GoogleAnalyticsClientService } from "../../client/client";
import type { RunReportResponse } from "../../schemas/api";
import type { ReportSpec } from "./spec";

import { isoDay } from "../../schemas/shared";

// The API returns at most 250,000 rows a request. Smaller pages keep memory low.
const pageSize = 100_000;

export type ReportPage<Row> = {
  readonly rows: ReadonlyArray<Row>;
  /** Offset of the next page of the same day. */
  readonly next: Option.Option<number>;
};

type ReportRow = NonNullable<RunReportResponse["rows"]>[number];

/** `[column, apiName]` pairs, in request order. */
const pairs = (columns: Readonly<Record<string, string | undefined>>) =>
  Object.entries(columns).flatMap(([column, name]) =>
    name === undefined ? [] : [[column, name] as const],
  );

const valuesByName = (
  headers: ReadonlyArray<{ readonly name: string }>,
  values: ReadonlyArray<{ readonly value: string }>,
) => new Map(headers.map((header, index) => [header.name, values[index]?.value]));

/** Logs the response flags that mean some data is hidden or estimated. */
const warnDataLoss = (name: string, day: string, metadata: RunReportResponse["metadata"]) => {
  const flags = {
    otherRow: metadata.dataLossFromOtherRow === true,
    thresholded: metadata.subjectToThresholding === true,
    sampled: (metadata.samplingMetadatas?.length ?? 0) > 0,
    truncated: (metadata.dataTruncationReasons?.length ?? 0) > 0,
  };
  return Object.values(flags).some(Boolean)
    ? Effect.logWarning("Google Analytics report is incomplete").pipe(
        Effect.annotateLogs({ report: name, day, ...flags }),
      )
    : Effect.void;
};

export const readDay = <Row extends object>(
  client: GoogleAnalyticsClientService,
  propertyId: string,
  spec: ReportSpec<Row>,
  options: { readonly day: string; readonly offset: number; readonly limit?: number },
): Effect.Effect<ReportPage<Row>, ConnectorError> =>
  Effect.gen(function* () {
    const dimensions = pairs(spec.dimensions);
    const metrics = pairs(spec.metrics);
    const columns = [...dimensions, ...metrics];
    const response = yield* client.runReport(spec.name, {
      dimensions: [
        spec.cohortEndOffset === undefined ? "date" : "cohort",
        ...dimensions.map(([, name]) => name),
      ],
      cohortEndOffset: spec.cohortEndOffset,
      metrics: metrics.map(([, name]) => name),
      startDate: options.day,
      endDate: options.day,
      limit: options.limit ?? pageSize,
      offset: options.offset,
    });
    yield* warnDataLoss(spec.name, options.day, response.metadata);
    const version = yield* DateTime.nowAsDate;
    const decodeRow = Schema.decodeUnknownEffect(spec.rowSchema);

    const toRow = (row: ReportRow) => {
      const values = new Map([
        ...valuesByName(response.dimensionHeaders, row.dimensionValues),
        ...valuesByName(response.metricHeaders, row.metricValues),
      ]);
      // Cohort reports have no `date`. Their day is the cohort's first session day.
      const date = values.get("date") ?? options.day.replaceAll("-", "");
      return decodeRow({
        id: JSON.stringify([
          propertyId,
          isoDay(date),
          ...dimensions.map(([, name]) => values.get(name)),
        ]),
        version,
        property_id: propertyId,
        date,
        // Tables without revenue leave it out.
        currency_code: response.metadata.currencyCode,
        ...Object.fromEntries(columns.map(([column, name]) => [column, values.get(name)])),
      }).pipe(
        Effect.mapError(
          (cause) =>
            new ConnectorError({
              message: `Unexpected Google Analytics row in ${spec.name} for ${options.day}`,
              cause,
            }),
        ),
      );
    };

    const rows = yield* Effect.forEach(response.rows ?? [], toRow);
    const read = options.offset + rows.length;
    return {
      rows,
      next: rows.length > 0 && read < (response.rowCount ?? 0) ? Option.some(read) : Option.none(),
    };
  });

import type { ReportRequest } from "../../src/client/client";

// Shaped like real runReport responses from the test property. Every value is a
// string, and `rows` and `rowCount` are left out when nothing matched.
const metadata = { currencyCode: "USD", timeZone: "America/Los_Angeles" };

/** A response for `request` with rows of `[date, ...dimensions, ...metrics]` values. */
export const report = (
  request: ReportRequest,
  rows: ReadonlyArray<ReadonlyArray<string>>,
  rowCount = rows.length,
) => ({
  dimensionHeaders: request.dimensions.map((name) => ({ name })),
  metricHeaders: request.metrics.map((name) => ({ name, type: "TYPE_INTEGER" })),
  ...(rows.length > 0
    ? {
        rows: rows.map((values) => ({
          dimensionValues: values.slice(0, request.dimensions.length).map((value) => ({ value })),
          metricValues: values.slice(request.dimensions.length).map((value) => ({ value })),
        })),
        rowCount,
      }
    : {}),
  metadata,
  kind: "analyticsData#runReport",
});

/** Two `traffic_sources` rows, in the order the spec asks for them. */
export const trafficSourceRows = [
  [
    "20261019",
    "google",
    "organic",
    "(not set)",
    "(organic)",
    "Organic Search",
    "12",
    "9",
    "10",
    "4",
    "31",
    "88",
    "1",
    "29",
    "412",
  ],
  [
    "20261019",
    "newsletter",
    "email",
    "october-2026",
    "october_launch",
    "Email",
    "5",
    "5",
    "5",
    "2",
    "14",
    "37",
    "2.5",
    "128.5",
    "190.25",
  ],
];

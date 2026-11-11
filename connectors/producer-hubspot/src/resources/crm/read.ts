import { ConnectorError } from "@useairfoil/connector-kit";
import {
  Array as Arr,
  Duration,
  Effect,
  Exit,
  Option,
  Record as Rec,
  Schema,
  Stream,
} from "effect";

import type { CrmSpec, DeleteRow } from "./spec";

import { HUBSPOT_API_VERSION, type HubSpotClientService } from "../../client/client";
import {
  AssociationBatchSchema,
  type AssociationTarget,
  BatchReadSchema,
  type CrmObject,
  PropertyListSchema,
} from "../../schemas/api";

export const objectsPath = (object: string) => `/crm/objects/${HUBSPOT_API_VERSION}/${object}`;

type AssociationInput = { readonly id: string; readonly after?: string };

const batchSize = 100;
// The rate limiter caps throughput. This only overlaps waiting requests.
const concurrency = 4;
// How long a property list is reused. New custom properties show up after it.
const propertyListTtl = Duration.minutes(5);

export type ReadResult<Row extends object> = {
  readonly rows: ReadonlyArray<Row>;
  /** IDs of the rows, which are active records. */
  readonly ids: ReadonlySet<string>;
  /** Deletes for IDs merged into the rows. */
  readonly merged: ReadonlyArray<DeleteRow>;
};

export type CrmReader<Row extends object> = {
  /** Reads full rows. IDs that can't be read are left out. */
  readonly read: (ids: ReadonlyArray<string>) => Effect.Effect<ReadResult<Row>, ConnectorError>;
  readonly propertyNames: Effect.Effect<ReadonlyArray<string>, ConnectorError>;
};

/** Each record's associations. A record with many follows its own `after`. */
const readAssociations = (
  client: HubSpotClientService,
  from: string,
  to: string,
  ids: ReadonlyArray<string>,
): Effect.Effect<Readonly<Record<string, ReadonlyArray<AssociationTarget>>>, ConnectorError> =>
  Stream.paginate(
    ids.map((id): AssociationInput => ({ id })),
    (inputs: ReadonlyArray<AssociationInput>) =>
      client
        .post(
          AssociationBatchSchema,
          `/crm/associations/${HUBSPOT_API_VERSION}/${from}/${to}/batch/read`,
          { inputs },
        )
        .pipe(
          Effect.map(({ body }) => {
            const next = body.results.flatMap(
              (result): ReadonlyArray<AssociationInput> =>
                result.paging === undefined
                  ? []
                  : [{ id: result.from.id, after: result.paging.next.after }],
            );
            return [body.results, Option.liftPredicate(next, Arr.isReadonlyArrayNonEmpty)] as const;
          }),
        ),
  ).pipe(
    Stream.runCollect,
    Effect.map((results) =>
      Rec.map(
        Arr.groupBy(results, (result) => result.from.id),
        (byRecord) => byRecord.flatMap((result) => result.to),
      ),
    ),
  );

const nonEmpty = (properties: CrmObject["properties"]): ReadonlyMap<string, string> =>
  new Map(
    Object.entries(properties).flatMap(([name, value]) =>
      value === null || value === "" ? [] : [[name, value] as const],
    ),
  );

const mergedIds = (item: CrmObject): ReadonlyArray<string> =>
  (item.properties.hs_merged_object_ids ?? "")
    .split(";")
    .filter((id) => id !== "" && id !== item.id);

export const makeReader = <Row extends object>(
  client: HubSpotClientService,
  spec: CrmSpec<Row>,
): Effect.Effect<CrmReader<Row>> =>
  Effect.gen(function* () {
    const propertyNames = yield* client
      .get(PropertyListSchema, `/crm/properties/${HUBSPOT_API_VERSION}/${spec.name}`)
      .pipe(
        Effect.map(({ body }) => body.results.map((property) => property.name)),
        Effect.cachedWithTTL((exit) => (Exit.isSuccess(exit) ? propertyListTtl : Duration.zero)),
      );

    const decodeRow = Schema.decodeUnknownEffect(spec.rowSchema);

    const readBatch = (ids: ReadonlyArray<string>) =>
      Effect.gen(function* () {
        const properties = yield* propertyNames;
        const { body, fetchedAt } = yield* client.post(
          BatchReadSchema,
          `${objectsPath(spec.name)}/batch/read`,
          { inputs: ids.map((id) => ({ id })), properties },
        );
        // Reading a merged ID returns the record it was merged into.
        const items = Arr.dedupeWith(body.results, (a, b) => a.id === b.id);
        if (items.length === 0) return { rows: [], ids: [], merged: [] };
        const itemIds = items.map((item) => item.id);
        const associations = yield* Effect.forEach(
          spec.associations,
          (association) =>
            readAssociations(client, spec.name, association.to, itemIds).pipe(
              Effect.map((found) => ({ association, found })),
            ),
          { concurrency },
        );
        const rows = yield* Effect.forEach(items, (item) =>
          decodeRow({
            id: item.id,
            version: fetchedAt,
            created_at: item.createdAt,
            updated_at: item.updatedAt,
            properties: nonEmpty(item.properties),
            _deleted: false,
            ...Object.fromEntries(
              associations.map(({ association, found }) => [
                association.field,
                (found[item.id] ?? []).map((target) => target.toObjectId),
              ]),
            ),
            ...(associations.length > 0 && {
              association_labels: associations.flatMap(({ association, found }) =>
                (found[item.id] ?? []).flatMap((target) =>
                  (target.associationTypes ?? []).map((type) => ({
                    object_type: association.to,
                    object_id: target.toObjectId,
                    category: type.category,
                    type_id: type.typeId,
                    label: type.label,
                  })),
                ),
              ),
            }),
          }).pipe(
            Effect.mapError(
              (cause) =>
                new ConnectorError({
                  message: `HubSpot ${spec.name} record ${item.id} does not match the row schema`,
                  cause,
                }),
            ),
          ),
        );
        const merged = items.flatMap((item) =>
          mergedIds(item).map((id): DeleteRow => ({ id, version: fetchedAt, _deleted: true })),
        );
        return { rows, ids: itemIds, merged };
      });

    const read = (ids: ReadonlyArray<string>) =>
      Effect.forEach(Arr.chunksOf(Arr.dedupe(ids), batchSize), readBatch, { concurrency }).pipe(
        Effect.map(
          (batches): ReadResult<Row> => ({
            rows: batches.flatMap((batch) => batch.rows),
            ids: new Set(batches.flatMap((batch) => batch.ids)),
            merged: batches.flatMap((batch) => batch.merged),
          }),
        ),
      );

    return { read, propertyNames };
  });

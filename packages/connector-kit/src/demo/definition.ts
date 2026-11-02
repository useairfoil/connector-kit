import type { Schema } from "effect";

import type { ResourceRequiredField, ResourceSchema } from "../core/types";
import type { DemoContext } from "./generate";

/** A table a demo writes: the same name, row schema and version as its resource. */
export type DemoTable<
  Name extends string = string,
  S extends ResourceSchema = ResourceSchema,
  Version extends string = string,
> = {
  readonly name: Name;
  readonly rowSchema: S;
  readonly version: Version;
};

export const table = <
  const Name extends string,
  S extends ResourceSchema,
  const Version extends ResourceRequiredField<S>,
>(
  definition: DemoTable<Name, S, Version>,
): DemoTable<Name, S, Version> => definition;

/** Rows by table. Required fields a row leaves out get placeholder values. */
export type DemoRows<Tables extends ReadonlyArray<DemoTable>> = {
  readonly [Table in Tables[number] as Table["name"]]?: ReadonlyArray<
    Partial<Schema.Schema.Type<Table["rowSchema"]>>
  >;
};

export type DemoDefinition<
  Setup extends ReadonlyArray<DemoTable> = ReadonlyArray<DemoTable>,
  Group extends ReadonlyArray<DemoTable> = ReadonlyArray<DemoTable>,
> = {
  readonly name: string;
  /** Tables written once, before any group, such as a product catalog. */
  readonly setup: {
    readonly tables: Setup;
    readonly rows: (context: DemoContext) => DemoRows<Setup>;
  };
  /**
   * Tables for one related unit, such as a customer and their orders. The run
   * adds groups until it reaches the size. Build keys from the index, so they
   * are unique and other groups can point to them.
   */
  readonly group: {
    readonly tables: Group;
    readonly rows: (index: number, context: DemoContext) => DemoRows<Group>;
    /**
     * Groups written per chunk, 1000 by default. A run can go over the size by
     * one chunk, so lower it when a group is big.
     */
    readonly groupsPerChunk?: number;
    /**
     * The number of groups there are, when the provider only keeps so much
     * history. The run stops there, even below the size.
     */
    readonly count?: number;
  };
};

export const define = <
  const Setup extends ReadonlyArray<DemoTable>,
  const Group extends ReadonlyArray<DemoTable>,
>(
  definition: DemoDefinition<Setup, Group>,
): DemoDefinition<Setup, Group> => definition;

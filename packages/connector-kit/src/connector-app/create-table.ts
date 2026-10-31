import { Effect, Option, type Schema } from "effect";
import { Argument, CliError, Command, Flag } from "effect/cli";

import { ensureTableFromEngine } from "../catalog/table";
import { engineUri } from "../runtime-config/config";

/** Creates the table command; existing tables must match the connector's row schemas. */
export const makeCreateTableCommand = (schemas: Readonly<Record<string, Schema.Top>>) =>
  Command.make(
    "create-table",
    {
      table: Argument.String("table"),
      catalog: Flag.String("catalog"),
      location: Flag.String("location").pipe(Flag.optional),
      resource: Flag.String("resource").pipe(Flag.optional),
    },
    ({ table, catalog, location, resource }) =>
      Effect.gen(function* () {
        const namespace = table.split(".");
        const name = namespace.pop();

        if (!name || namespace.length === 0 || namespace.some((part) => part.length === 0)) {
          return yield* new CliError.UserError({
            cause: "Invalid table name",
            userMessage: "Use a table name like my.namespace.table",
          });
        }

        const resourceName = Option.getOrElse(resource, () => name);
        const schema = Object.hasOwn(schemas, resourceName) ? schemas[resourceName] : undefined;
        if (!schema) {
          return yield* new CliError.UserError({
            cause: "Unknown resource",
            userMessage: `Unknown resource: ${resourceName}`,
          });
        }

        const uri = yield* engineUri;
        yield* ensureTableFromEngine(schema, {
          engineUri: uri.href,
          catalogId: catalog,
          identifier: { namespace, name },
          location: Option.getOrUndefined(location),
        });
        yield* Effect.log(`Prepared ${table}`);
      }),
  ).pipe(Command.withDescription("Create or verify an Iceberg table for a connector resource"));

import { CatalogManager } from "@useairfoil/api";
import { Effect } from "effect";
import { Argument, Command, Flag } from "effect/cli";

import { parseRestCatalogConfig } from "../utils/json";
import { EngineUri } from "../utils/options";

const idArgument = Argument.String("id").pipe(Argument.withDescription("Catalog ID"));

const restFlag = Flag.String("rest").pipe(
  Flag.withDescription("Iceberg REST catalog configuration as JSON"),
);

const createCommand = Command.make("create", { id: idArgument, rest: restFlag }, ({ id, rest }) =>
  Effect.gen(function* () {
    const baseUrl = yield* EngineUri;
    const manager = yield* CatalogManager.make({ baseUrl });
    const config = yield* parseRestCatalogConfig(rest);
    yield* manager.createCatalog({ id, rest: config });

    yield* Effect.log({ id });
  }),
).pipe(Command.withDescription("Create a new catalog"));

const getCommand = Command.make("get", { id: idArgument }, ({ id }) =>
  Effect.gen(function* () {
    const baseUrl = yield* EngineUri;
    const manager = yield* CatalogManager.make({ baseUrl });
    const catalog = yield* manager.getCatalog(id);

    yield* Effect.log(catalog);
  }),
).pipe(Command.withDescription("Get a catalog"));

const deleteCommand = Command.make("delete", { id: idArgument }, ({ id }) =>
  Effect.gen(function* () {
    const baseUrl = yield* EngineUri;
    const manager = yield* CatalogManager.make({ baseUrl });

    yield* manager.deleteCatalog(id);
    yield* Effect.log({ id });
  }),
).pipe(Command.withDescription("Delete a catalog"));

export const catalogCommand = Command.make("catalog").pipe(
  Command.withDescription("Manage catalogs"),
  Command.withSubcommands([createCommand, getCommand, deleteCommand]),
);

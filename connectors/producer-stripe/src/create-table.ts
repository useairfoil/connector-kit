import { ConnectorApp, RuntimeConfig } from "@useairfoil/connector-kit";
import { Command } from "effect/cli";

import { tableSchemas } from "./tables";

export const createTableCommand = ConnectorApp.makeCreateTableCommand(tableSchemas);

export const setupCommand = ConnectorApp.makeSetupCommand(tableSchemas).pipe(
  Command.provide(RuntimeConfig.layerHosted()),
);

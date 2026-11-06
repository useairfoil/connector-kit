#!/usr/bin/env node

import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { Command } from "effect/cli";
import { FetchHttpClient } from "effect/http";

import packageJson from "../package.json";
import { createTableCommand, setupCommand } from "./create-table";
import { demoCommand } from "./demo";
import { sandboxCommand } from "./sandbox";
import { startCommand, checkCommand } from "./start";

const BootstrapLayer = Layer.mergeAll(FetchHttpClient.layer, NodeServices.layer);

const program = Command.make("producer-facebook-ads", {}, () => Effect.void).pipe(
  Command.withSubcommands([
    setupCommand,
    startCommand,
    checkCommand,
    sandboxCommand,
    createTableCommand,
    demoCommand,
  ]),
);

const cli = Command.run(program, { version: packageJson.version });

NodeRuntime.runMain(cli.pipe(Effect.provide(BootstrapLayer), Effect.scoped));

import { Connector } from "@useairfoil/connector-kit";
import { Config, Context, Effect, Layer } from "effect";

import type { SalesforceConfig } from "./manifest";

import * as SalesforceClient from "./client/client";
import { objects } from "./manifest";
import { makeCustomObjects } from "./objects/custom-objects";
import { makeDescriber } from "./objects/describe";
import { makeFileLinks } from "./objects/file-links";
import { makeKnowledgeVersions } from "./objects/knowledge";
import { makeObjectFields } from "./objects/object-fields";
import { objectResource } from "./objects/resource";
export { SalesforceConfigDef, manifest } from "./manifest";
export type { SalesforceConfig } from "./manifest";

export const make = Effect.fnUntraced(function* () {
  const client = yield* SalesforceClient.SalesforceClient;
  const describer = yield* makeDescriber(client);

  return Connector.define({
    name: "producer-salesforce",
    title: "Salesforce",
    resources: [
      ...objects.map((spec) => objectResource(client, describer, spec)),
      makeCustomObjects(client, describer),
      makeObjectFields(describer),
      makeFileLinks(client),
      makeKnowledgeVersions(client, describer),
    ],
  });
});

export type SalesforceConnectorRuntime = Effect.Success<ReturnType<typeof make>>;

export class SalesforceConnector extends Context.Service<
  SalesforceConnector,
  SalesforceConnectorRuntime
>()("@useairfoil/producer-salesforce/SalesforceConnector") {}

export const layer = (config: SalesforceConfig) =>
  Layer.effect(SalesforceConnector)(
    make().pipe(Effect.annotateLogs({ component: "salesforce" })),
  ).pipe(Layer.provide(SalesforceClient.layer(config)));

export const layerConfig = (config: Config.Wrap<SalesforceConfig>) =>
  Layer.unwrap(Config.unwrap(config).pipe(Effect.map(layer)));

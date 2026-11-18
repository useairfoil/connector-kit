import { expect, it } from "@effect/vitest";
import * as Iceberg from "@useairfoil/connector-kit/iceberg";
import { Effect } from "effect";

import { manifest } from "../src/manifest";
import { tableSchemas } from "../src/tables";

it.effect("uses table descriptions in the manifest", () =>
  Effect.gen(function* () {
    for (const resource of manifest.resources) {
      const schema = tableSchemas[resource.name];
      expect(schema).toBeDefined();
      const table = yield* Iceberg.makeCreateTableRequest(schema, { name: resource.name });
      expect(resource.description).toBeTruthy();
      expect(resource.description).toBe(table.properties?.comment);
    }
    expect(JSON.parse(JSON.stringify(manifest))).toEqual(manifest);
  }),
);

import { describe, expect, it } from "@effect/vitest";
import { Iceberg } from "@useairfoil/connector-kit";
import { Effect } from "effect";

import { PostSchema } from "../src/schemas";

describe("producer-template Iceberg schemas", () => {
  it.effect("compiles posts with field docs", () =>
    Effect.gen(function* () {
      const request = yield* Iceberg.makeCreateTableRequest(PostSchema, {
        name: "rows",
        location: "s3://warehouse/posts",
      });

      expect(
        request.schema.fields
          .filter((field) => request.schema["identifier-field-ids"]?.includes(field.id))
          .map((field) => field.name),
      ).toEqual(["id"]);

      expect(
        request.schema.fields.map(({ name, doc, required, type }) => ({
          name,
          doc,
          required,
          type,
        })),
      ).toMatchInlineSnapshot(`
        [
          {
            "doc": "Post ID.",
            "name": "id",
            "required": true,
            "type": "long",
          },
          {
            "doc": "Author ID.",
            "name": "userId",
            "required": false,
            "type": "long",
          },
          {
            "doc": "Post title.",
            "name": "title",
            "required": false,
            "type": "string",
          },
          {
            "doc": "Post text.",
            "name": "body",
            "required": false,
            "type": "string",
          },
          {
            "doc": "Time used to order post changes.",
            "name": "version",
            "required": false,
            "type": "string",
          },
          {
            "doc": "Whether the post was deleted.",
            "name": "_deleted",
            "required": false,
            "type": "boolean",
          },
        ]
      `);
    }),
  );
});

import { describe, expect, it } from "@effect/vitest";
import { Schema } from "effect";

import * as Iceberg from "../src/iceberg";

describe("resolveDescription", () => {
  it("reads the description after marking an identifier", () => {
    const schema = Schema.Struct({ id: Schema.String })
      .annotate({ description: "Rows in an account." })
      .pipe(Iceberg.identifier("id"));

    expect(Iceberg.resolveDescription(schema)).toBe("Rows in an account.");
  });

  it("reads the last check's description", () => {
    const schema = Schema.String.annotate({ description: "Original description." }).check(
      Schema.isMinLength(1, { description: "Non-empty text." }),
    );

    expect(Iceberg.resolveDescription(schema)).toBe("Non-empty text.");
  });

  it("returns undefined without a description", () => {
    expect(Iceberg.resolveDescription(Schema.Struct({ id: Schema.String }))).toBeUndefined();
  });
});

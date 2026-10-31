import { Iceberg } from "@useairfoil/connector-kit";
import { Schema } from "effect";

import { deleted, version } from "./shared";

// Every object table has the same fields and IDs.
const objectFields = {
  id: Schema.String.pipe(
    Schema.annotateKey({ description: "Salesforce record ID, 18 characters." }),
  ),
  version,
  created_at: Schema.NullOr(Schema.Date).pipe(
    Schema.annotateKey({ description: "`CreatedDate`. Null for objects without it." }),
  ),
  updated_at: Schema.NullOr(Schema.Date).pipe(
    Schema.annotateKey({
      description:
        "`SystemModstamp`. Null for objects without it. Cross-object formulas can change without it.",
    }),
  ),
  fields: Schema.ReadonlyMap(Schema.String, Schema.String).pipe(
    Schema.annotateKey({
      description: "Every non-null field the connector can read, by API name, as a string.",
    }),
  ),
  _deleted: deleted,
};

export const objectSchema = (object: string) =>
  Schema.Struct(objectFields)
    .annotate({ description: `Salesforce ${object} records.` })
    .pipe(Iceberg.identifier("id"));

export type ObjectRow = Schema.Schema.Type<ReturnType<typeof objectSchema>>;

export const CustomObjectSchema = Schema.Struct({
  ...objectFields,
  object: Schema.String.pipe(
    Schema.annotateKey({ description: "API name of the custom object, such as `Invoice__c`." }),
  ),
})
  .annotate({ description: "Records of every Salesforce custom object." })
  .pipe(Iceberg.identifier("id"));

export type CustomObject = Schema.Schema.Type<typeof CustomObjectSchema>;

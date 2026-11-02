import { Iceberg } from "@useairfoil/connector-kit";
import { Schema } from "effect";

import { version } from "./shared";

const PicklistValueSchema = Schema.Struct({
  value: Schema.String.pipe(Schema.annotateKey({ description: "API value stored on records." })),
  label: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Label shown in Salesforce." }),
  ),
  active: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the value can still be picked." }),
  ),
});

export const ObjectFieldSchema = Schema.Struct({
  id: Schema.String.pipe(
    Schema.annotateKey({ description: "`<object>.<field>`, such as `Account.Industry`." }),
  ),
  version,
  object: Schema.String.pipe(Schema.annotateKey({ description: "API name of the object." })),
  name: Schema.String.pipe(
    Schema.annotateKey({ description: "API name of the field, the key in `fields`." }),
  ),
  label: Schema.String.pipe(Schema.annotateKey({ description: "Label shown in Salesforce." })),
  type: Schema.String.pipe(
    Schema.annotateKey({ description: "Salesforce field type, such as `picklist` or `currency`." }),
  ),
  custom: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the field is a custom field." }),
  ),
  calculated: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the field is a formula or roll-up." }),
  ),
  nillable: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the field can be empty." }),
  ),
  length: Schema.BigInt.pipe(Schema.annotateKey({ description: "Maximum length of text fields." })),
  precision: Schema.BigInt.pipe(
    Schema.annotateKey({ description: "Total digits of number fields." }),
  ),
  scale: Schema.BigInt.pipe(
    Schema.annotateKey({ description: "Digits after the decimal point of number fields." }),
  ),
  reference_to: Schema.Array(Schema.String).pipe(
    Schema.annotateKey({ description: "Objects a lookup field can point to." }),
  ),
  picklist_values: Schema.Array(PicklistValueSchema).pipe(
    Schema.annotateKey({ description: "Values of picklist fields, active and inactive." }),
  ),
})
  .annotate({
    description:
      "Field definitions of every synced object, to name the keys and values in `fields`.",
  })
  .pipe(Iceberg.identifier("id"));

export type ObjectField = Schema.Schema.Type<typeof ObjectFieldSchema>;

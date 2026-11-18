import * as Iceberg from "@useairfoil/connector-kit/iceberg";
import { Option, Schema } from "effect";

import { date, nullableDate } from "./shared";

const CustomerMemberInputSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Unique identifier." })),
  created_at: date("Time when the record was created."),
  modified_at: nullableDate("Time when the record was last changed."),
  customer_id: Schema.String.pipe(
    Schema.annotateKey({ description: "Customer the member belongs to." }),
  ),
  email: Schema.String.pipe(Schema.annotateKey({ description: "Member email address." })),
  name: Schema.NullOr(Schema.String).pipe(Schema.annotateKey({ description: "Member name." })),
  external_id: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Member ID from your system." }),
  ),
  role: Schema.String.pipe(Schema.annotateKey({ description: "Member role." })),
});

export const CustomerMemberSchema = CustomerMemberInputSchema.pipe(
  Schema.extendTo(
    {
      version: Schema.Date.pipe(Schema.annotateKey({ description: "Time used to order changes." })),
    },
    { version: (row) => Option.some(row.modified_at ?? row.created_at) },
  ),
)
  .annotate({ description: "Members of Polar customers." })
  .pipe(Iceberg.identifier("id"));

export type CustomerMember = Schema.Schema.Type<typeof CustomerMemberSchema>;

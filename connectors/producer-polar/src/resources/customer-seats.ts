import { Iceberg } from "@useairfoil/connector-kit";
import { Option, Schema } from "effect";

import { JsonSchema, date, nullableDate } from "./shared";

const CustomerSeatInputSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Unique identifier." })),
  created_at: date("Time when the record was created."),
  modified_at: nullableDate("Time when the record was last changed."),
  subscription_id: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Subscription that owns the seat." }),
  ),
  order_id: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Order that owns the seat." }),
  ),
  status: Schema.String.pipe(Schema.annotateKey({ description: "Seat status." })),
  customer_id: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Customer who claimed the seat." }),
  ),
  member_id: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Member who holds the seat." }),
  ),
  email: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Email the seat was assigned to." }),
  ),
  customer_email: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Email of the customer who claimed the seat." }),
  ),
  invitation_token_expires_at: nullableDate("Time when the seat invitation expires."),
  claimed_at: nullableDate("Time when the seat was claimed."),
  revoked_at: nullableDate("Time when the seat was revoked."),
  seat_metadata: Schema.NullOr(JsonSchema).pipe(
    Schema.annotateKey({ description: "Seat metadata stored as JSON." }),
  ),
});

export const CustomerSeatSchema = CustomerSeatInputSchema.pipe(
  Schema.extendTo(
    {
      version: Schema.Date.pipe(Schema.annotateKey({ description: "Time used to order changes." })),
    },
    { version: (row) => Option.some(row.modified_at ?? row.created_at) },
  ),
)
  .annotate({ description: "Seats on seat-based orders and subscriptions." })
  .pipe(Iceberg.identifier("id"));

export type CustomerSeat = Schema.Schema.Type<typeof CustomerSeatSchema>;

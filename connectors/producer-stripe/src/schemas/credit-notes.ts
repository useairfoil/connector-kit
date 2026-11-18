import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { Long, UnixTime, version } from "./shared";

export const CreditNoteLineSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Credit note line ID." })),
  type: Schema.String.pipe(
    Schema.annotateKey({ description: "Line type: invoice_line_item or custom_line_item." }),
  ),
  amount: Long.pipe(
    Schema.annotateKey({ description: "Line amount, in the smallest currency unit." }),
  ),
  discount_amount: Long.pipe(
    Schema.annotateKey({ description: "Discount on the line, in the smallest currency unit." }),
  ),
  description: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Line description." }),
  ),
  invoice_line_item: Schema.optional(Schema.String).pipe(
    Schema.annotateKey({ description: "Credited invoice line." }),
  ),
  quantity: Schema.optional(Schema.NullOr(Long)).pipe(
    Schema.annotateKey({ description: "Credited quantity." }),
  ),
  unit_amount: Schema.optional(Schema.NullOr(Long)).pipe(
    Schema.annotateKey({ description: "Amount per unit, in the smallest currency unit." }),
  ),
});

export const CreditNoteSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.annotateKey({ description: "Credit note ID." })),
  version,
  created: UnixTime.pipe(
    Schema.annotateKey({ description: "Time when the credit note was created." }),
  ),
  invoice: Schema.String.pipe(Schema.annotateKey({ description: "Credited invoice." })),
  customer: Schema.String.pipe(Schema.annotateKey({ description: "Customer of the credit note." })),
  number: Schema.String.pipe(Schema.annotateKey({ description: "Credit note number." })),
  status: Schema.String.pipe(Schema.annotateKey({ description: "Status: issued or void." })),
  type: Schema.String.pipe(
    Schema.annotateKey({ description: "Whether it was issued before or after payment." }),
  ),
  currency: Schema.String.pipe(Schema.annotateKey({ description: "Three-letter currency code." })),
  amount: Long.pipe(
    Schema.annotateKey({ description: "Credited amount, in the smallest currency unit." }),
  ),
  subtotal: Long.pipe(Schema.annotateKey({ description: "Amount before discounts and taxes." })),
  total: Long.pipe(Schema.annotateKey({ description: "Amount after discounts and taxes." })),
  pre_payment_amount: Long.pipe(
    Schema.annotateKey({ description: "Amount credited before the invoice was paid." }),
  ),
  post_payment_amount: Long.pipe(
    Schema.annotateKey({ description: "Amount credited after the invoice was paid." }),
  ),
  reason: Schema.optional(Schema.NullOr(Schema.String)).pipe(
    Schema.annotateKey({ description: "Why the credit note was issued." }),
  ),
  voided_at: Schema.optional(Schema.NullOr(UnixTime)).pipe(
    Schema.annotateKey({ description: "Time when the credit note was voided." }),
  ),
  lines: Schema.Array(CreditNoteLineSchema).pipe(
    Schema.annotateKey({ description: "All lines of the credit note." }),
  ),
})
  .annotate({ description: "Invoice credit notes and their lines." })
  .pipe(Iceberg.identifier("id"));

export type CreditNote = Schema.Schema.Type<typeof CreditNoteSchema>;

export const CreditNoteObjectSchema = CreditNoteSchema.mapFields((fields) => ({
  ...Struct.omit(fields, ["version"]),
  lines: Schema.Struct({
    data: Schema.Array(CreditNoteLineSchema),
    has_more: Schema.Boolean,
  }),
}));

export type CreditNoteObject = Schema.Schema.Type<typeof CreditNoteObjectSchema>;

export type CreditNoteRow = Omit<CreditNote, "version">;

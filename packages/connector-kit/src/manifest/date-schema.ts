import { Schema } from "effect";

/** A calendar day written as `YYYY-MM-DD`. */
export const DateString = Schema.String.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/));

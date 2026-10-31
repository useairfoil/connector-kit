import { Data } from "effect";

/** Error returned when ingestion fails. */
export class IngestorError extends Data.TaggedError("IngestorError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

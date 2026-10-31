import { Data } from "effect";

/** Error returned by the module. */
export class CatalogManagerError extends Data.TaggedError("CatalogManagerError")<{
  readonly message: string;
  readonly status?: number;
  readonly cause?: unknown;
}> {}

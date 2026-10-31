/** Configuration for the catalog management REST API. */
export interface CatalogManagerOptions {
  /**
   * URI of the engine HTTP service.
   * @example "http://localhost:7777"
   */
  readonly engineUri: string;
  /** Arrow Flight endpoint. Defaults to engineUri. */
  readonly flightUri?: string;
}

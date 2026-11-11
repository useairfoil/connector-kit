# Where to look

- **REST.** Use OpenAPI if available. Check the endpoint index for reads
  the spec leaves out.
- **GraphQL.** Follow child connections from the query root. Check which
  fields the connector's credentials can read.
- **Objects that vary by account.** Use the object reference, discovery API,
  or recorded metadata. Check which objects support paging and changes.
- **Reports.** Compare the example request with what we store. Check
  dimensions, metrics, filters, and time windows. Use the provider's
  compatibility check if it has one.
- **Events.** Read the topic list and payload docs. Check whether we store
  the event or use it to fetch a record.

If there's no catalog, work through the reference index. Use the official
SDK to find more reads and check their access in the docs.

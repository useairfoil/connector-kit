# Airfoil Connector Kit Agents

Keep changes small. Leave unrelated work alone. Read a connector's or
template's own `AGENTS.md` before you change it.

## Working style

- Match nearby code. Use existing APIs before adding helpers or wrappers.
- When cleaning up, keep useful fields, behavior and public exports.
- No `any`, and no casts to hide errors. Prefer inference and schema types.
- Add tests only for core logic, where a test gives real long-term value in CI
  and protects us from regressions. Skip tests that add little or no value.
- Short sentences, simple words. Only comment what is easy to miss.
- Don't edit README.md or AGENTS.md files. Ask the human, and explain why.
- Check review claims against the code, docs or real behavior before acting.
- Give a recommendation. Say when an idea is overkill, even the user's.
- Ask before changing scope, stored data or shared contracts.

## Effect

Use Effect for effects and runtime work. Keep simple pure functions plain.

- Use the installed version (see `pnpm-workspace.yaml` and the lockfile), not
  upstream main. [v4 docs](https://effect.website/docs/v4/onboarding),
  [source](https://github.com/Effect-TS/effect).
- Look for an existing API before writing your own. Read its signature and
  examples.
- Use built-in Schema, Config, Schedule, Stream and HTTP tools where they fit.
- Match nearby service, layer and error patterns.
- Scope resources so they close on success, failure and interruption.
- Keep expected failures typed. Put retry and timeout rules next to the
  external call.

## Generated code

Don't edit `packages/flight/src/proto/**`. Change `packages/flight/proto/**`,
then run `pnpm --filter @useairfoil/flight build:proto`.

## Connectors

Provider code stays in its connector. Shared runtime code goes in Connector Kit.

- User config goes in `src/manifest.ts`. Use Effect `Config`, not `process.env`.
- Hosted runs use `RuntimeConfig.layerHosted()`, PostgreSQL state and
  `Ingestor.layerArrowFlightConfig(...)`. Memory state is only for the sandbox
  and tests.
- Every row schema ends with `Iceberg.identifier(...)` on a required key, and
  has a required version field.
- Give stored fields explicit Iceberg IDs, unique in the table, nested fields
  included. Never reuse them.
- Use Connector Kit's table helpers (`commitTable` keeps the IDs), not the
  catalog's `createTable`. Keep the table read-back and schema check, startup
  doesn't migrate schemas.
- Changes and webhooks send full rows. If a webhook leaves fields out, read
  the record again.
- With `_deleted`: send `true` for deletes. If the provider can restore
  records, send `false` on other rows. Otherwise leave it out.
- If the provider has no reliable update time, the version is the read time.
- Decode provider enums as strings, so a new value doesn't break the table.
- Every resource needs a read-only check. A table that can't be read must fail
  alone, not stop the others.
- Every new resource gets a demo table in `src/demo/`, with realistic rows
  that link to the other tables.
- Verify signed webhooks against the raw body.
- Record API tests with VCR against test accounts. Don't edit cassettes by
  hand. `ACK_DISABLE_VCR=*` makes live requests, not for normal tests.
- Never log or commit secrets.

New resource: check the provider docs for the scope, list filters and paging,
webhook events, version field, nullable fields and deletes.

API upgrade: read the provider changelog for what we use, bump the version
constant and README, then record VCR again.

## Checks

Run the changed package's `typecheck`, `test:ci` and `build`. Run `pnpm format`
and `pnpm lint` from the root (`pnpm format:fix` to fix).

- When shared code or a public API changes, check the code that uses it.
- Use `@effect/vitest`. Some integration tests need Docker.
- `@useairfoil/testing` publication tests: register synthetic S3 credentials
  through catalog properties, and run `materializeAndCommit` before checking
  snapshots.
- Test the changed runtime path, not just that it compiles.
- Report what ran, passed, and was blocked. Keep VCR replay, live provider
  checks and downstream writes separate.

## Releases

Published package changes need a changeset. No major changes.

# Airfoil Connector Kit Agents

Keep changes small. Leave unrelated work alone.
Read a connector's or template's own `AGENTS.md` before you change it.

## Working style

- Match nearby code. Use existing APIs before adding helpers or wrappers.
- When cleaning up, keep useful fields, behavior, and public exports.
- Prefer inference and schema types. No `any`, and no casts to hide errors.
- Keep tests small and meaningful. Use inline snapshots for row shapes.
- Write short sentences with simple words. Only comment what is easy to miss.
- Don't edit README.md or AGENTS.md files. If a change is necessary, ask the
  human to write it. Explain _why_ the file needs updating.
- Check review claims against the code, docs, or real behavior before acting.
- Give a recommendation. Say when an idea is overkill, even the user's.
- Ask before changing scope, stored data, or shared contracts that aren't
  already approved.

## Effect

Use Effect for effects and runtime work. Keep simple pure functions plain.

- Start with the [v4 docs](https://effect.website/docs/v4/onboarding).
- Check for an existing API before writing your own. Read its signature and
  examples, not just search results.
- The source is at `https://github.com/Effect-TS/effect`.
- Use the installed version. Check `pnpm-workspace.yaml` and the lockfile,
  because upstream main may be newer. Read source that matches that version.
  Don't edit upstream without approval.
- Use built-in Schema, Config, Schedule, Stream, and HTTP tools where they fit.
- Match nearby service, layer, and error patterns. Any service form is fine.
- Scope resources so they close on success, failure, and interruption.
- Keep expected failures typed. Put retry and timeout rules next to the
  external call.
- Before finishing, check the changed code for missed Effect APIs and extra
  machinery.

## Generated code

Don't edit `packages/flight/src/proto/**`. Change the source in
`packages/flight/proto/**`, then run:

```bash
pnpm --filter @useairfoil/flight build:proto
```

## Connectors

Provider code stays in its connector. Shared runtime code goes in Connector Kit.

- Put user config in `src/manifest.ts`.
- Use Effect `Config`, not `process.env`.
- Hosted runs use `RuntimeConfig.layerHosted()`, PostgreSQL state, and
  `Ingestor.layerArrowFlightConfig(...)`.
- Memory state is only for the sandbox and tests.
- Every row schema ends with `Iceberg.identifier(...)` on a required, non-null
  key. Every resource has a required, non-null version field.
- Give stored fields explicit Iceberg IDs. Keep them stable, never reuse them,
  and keep them unique in the table, nested fields included.
- Use Connector Kit's table helpers. They call the catalog's `commitTable` to
  keep the IDs. Don't swap it for the catalog's `createTable`.
- Keep the table read-back and schema check. Startup doesn't migrate schemas.
- Set a table location when the catalog can't choose one.
- Changes and webhooks send full rows. When a webhook leaves fields out, read
  the record again.
- On tables with `_deleted`, send `true` for deletes. If the provider can
  restore records, send `false` on other rows so a restore comes back.
  Otherwise leave it out.
- Every resource needs a read-only config check.
- Every connector has a demo in `src/demo/`. Give each new resource a
  table there, with realistic rows that link to the other tables.
- Verify signed webhooks against the raw body.
- Record API tests with VCR. Don't edit cassettes by hand.
- `ACK_DISABLE_VCR=*` makes live requests. Don't use it for normal tests.
- Never log or commit secrets.

## Checks

For code changes, run the changed package's `typecheck`, `test:ci`, and
`build` scripts if it has them. Use pnpm. Run `pnpm format` and `pnpm lint`
from the root. `pnpm format` only checks formatting; it doesn't fix it.

- When shared code or a public API changes, check the code that uses it.
- Use `@effect/vitest` and the existing test setup. Some integration tests need
  Docker.
- For `@useairfoil/testing` publication tests, register synthetic S3 credentials through
  catalog properties and run `materializeAndCommit` before checking snapshots.
- For docs-only changes, check the edited text, paths, and commands.
- Test the changed artifact or runtime path, not just that it compiles.
- Report what ran, what passed, and what was blocked or not checked. Report VCR
  replay, live provider checks, and downstream writes separately.

## Releases

Published package changes need a Beachball change file. Major changes aren't
allowed.

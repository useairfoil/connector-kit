# GitHub producer

- Auth: one GitHub App installation.
- Webhooks: `POST /webhooks/github`. Skip deliveries for other installations.
- API version: `X-GitHub-Api-Version: GITHUB_API_VERSION` on every call.

## Rules

- Follow the `Link` header's `next` URL. Issues use a cursor, others use page
  numbers.
- `429` is a rate limit. `403` is one only with `retry-after`,
  `x-ratelimit-remaining: 0` or a rate limit message. Any other `403` fails.
- Lists that can't sort are read newest first. So an edit during a read
  repeats a row, never skips one.
- Workflow run filters cap the list at 1,000, so the runs list uses none.
- An empty repo has `size` 0 and commit lists return 409. Commit tables skip it.
- Cleared text is `""`, a cleared list is `[]`. Issue, PR and repo webhooks
  can leave a list out, so their handlers read the object again.

## Versions and deletes

- Version is `updated_at`. Deletes use the webhook arrival time.
- Reviews, check runs and jobs have no `updated_at`. Version is read time, and
  webhooks read the latest state.
- Commits never change, version is the commit time.
- Push, PR commit and status webhooks don't have the full object, so read the
  API.

## Not synced

- Packages: listing container packages returns 400 for installation tokens.
- Secret scanning alerts: the payload has the secret.

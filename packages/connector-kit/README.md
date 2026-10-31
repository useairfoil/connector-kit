# Connector Kit

Use this package to build an Airfoil producer connector.

## Install

```bash
pnpm add @useairfoil/connector-kit effect@^4
```

## Usage

- `Connector`, `Resource`, `Fetch`, and `Cursor` define the data flow.
- `Manifest` defines user config.
- `ConnectorApp` checks config and runs the HTTP server.
- `Ingestor` writes batches to the console or Wings.
- `StateStore` keeps ingestion progress.
- `Webhook` defines webhook routes.

Here is a small resource:

```ts
import { Connector, Cursor, Fetch, Iceberg, Resource } from "@useairfoil/connector-kit";
import { Effect, Schema } from "effect";

const PostSchema = Schema.Struct({
  id: Schema.String.pipe(Iceberg.field(1)),
  updatedAt: Schema.String.pipe(Iceberg.field(2)),
}).pipe(Iceberg.identifier("id"));

const Posts = Resource.entity({
  name: "posts",
  rowSchema: PostSchema,
  version: "updatedAt",

  check: Effect.void,
  backfill: Fetch.page({
    pageCursor: Cursor.number(),
    cutoff: Cursor.isoDateTime(),
    fetch: () =>
      Effect.succeed({
        rows: [],
        nextPageCursor: 1,
        hasMore: false,
      }),
  }),
});

const connector = Connector.define({
  name: "producer-example",
  resources: [Posts],
});
```

When one provider log covers several resources, such as an events API, give
the connector a single `changes` feed instead of `changes` on each resource. The
feed reads the log once per run and returns rows by resource name:

```ts
const connector = Connector.define({
  name: "producer-example",
  resources: [Posts, Comments],
  changes: Fetch.feed({
    resources: [Posts, Comments],
    cursor: Cursor.string(),
    interval: "5 minutes",
    fetch: ({ cursor }) =>
      readEvents(cursor).pipe(
        Effect.map((page) => ({
          rows: { posts: page.posts, comments: page.comments },
          cursor: page.next,
          // Runs again without waiting for the interval.
          hasMore: page.hasMore,
        })),
      ),
  }),
});
```

A resource's own `changes` can return `hasMore` the same way, to split a long
read across runs.

Each resource in the feed stores the feed cursor, so status shows it per
resource. A resource in the feed cannot also define its own `changes`.

`fetch` also gets `selected`, the resources that run. Skip the work for the
others.

`Iceberg.identifier` names the row key. Put it last on the schema. Wings
upserts rows with the same key, and replaces the whole row.

So changes and webhooks return full rows. When a webhook leaves fields out,
read the record again. For a delete, send only the key, version, and
`_deleted: true`; the other columns become null. Send `_deleted: false` on other
rows only when the provider can restore records, so a restore comes back.
Otherwise leave it out.

For local runs, use `StateStore.layerMemory` and `Ingestor.layerConsole`. For a
hosted run, use `RuntimeConfig.layerHosted()`, PostgreSQL state, and
`Ingestor.layerArrowFlightConfig(connector)`.

Use `Ingestor.layerArrowFlight({ connector, catalog, tables })` with an existing
`CatalogManager` layer to configure ingestion directly. Both helpers prepare
Iceberg tables and send rows over Arrow Flight.

## Configuration

| Variable                        | Required | Default                     |
| ------------------------------- | -------- | --------------------------- |
| `AIRFOIL_CONFIG_PATH`           | yes      | none                        |
| `ENGINE_URI`                    | yes      | none                        |
| `AIRFOIL_CATALOG`               | yes      | none                        |
| `AIRFOIL_TABLE_BINDINGS`        | yes      | none                        |
| `AIRFOIL_CONNECTOR_INSTANCE_ID` | yes      | none                        |
| `POSTGRES_CONNECTION_STRING`    | yes      | none                        |
| `AIRFOIL_HTTP_PORT`             | no       | `8080`                      |
| `AIRFOIL_STATE_TABLE`           | no       | `_airfoil_connectors_state` |

```env
AIRFOIL_TABLE_BINDINGS={"posts":{"namespace":["default"],"name":"posts","location":"s3://warehouse/default/posts"}}
```

Only the resources in `AIRFOIL_TABLE_BINDINGS` run. List at least one, and use
only the connector's resource names.

Use only lowercase letters, numbers, and underscores in table names. S3 Tables
catalogs reject other characters, such as `-`.

The HTTP server has `/health`, `/status`, and `/metrics` endpoints.

## Demo data

A connector with a demo has a `demo` command. It writes made-up rows to
the bound tables, then exits. It needs no provider credentials and no
PostgreSQL state.

```bash
producer-stripe demo --size 128MiB --seed 42
```

- `--size` is the uncompressed Arrow size to write, such as `512KiB`, `128MiB`,
  or `1GiB`. The run can go over by one chunk of groups, about 1 MiB with the
  current connectors.
- `--seed` picks the data. Dates depend on when the run starts, so two runs
  with the same seed match only if they start at the same time and bind the
  same tables.
- Setup tables, written once, such as a product catalog, don't grow. If only
  those are bound, the run writes them once and stops below the size. Demos
  with limited history, such as daily reports, also stop when they run out.
- It needs `AIRFOIL_CONFIG_PATH`, `ENGINE_URI`, `AIRFOIL_CATALOG`, and
  `AIRFOIL_TABLE_BINDINGS`. An empty `{}` config file is enough.

A demo lists its `setup` and `group` tables and builds their rows with
`Demo.define`. Build keys from the group index, so they are unique and other
rows can point to them. Required fields a row leaves out get placeholder values
from the row schema. Every row is checked against its row schema before it's
written.

## Iceberg field IDs

Give each field a unique ID. Keep its ID if you rename it, and never reuse an ID
after removing a field. Use `Iceberg.field` for struct fields. Put list element
and map key/value IDs on their schemas with `.annotate({ fieldId })`.

```ts
import { Iceberg } from "@useairfoil/connector-kit";
import { Schema } from "effect";

const Row = Schema.Struct({
  id: Schema.String.pipe(Iceberg.field(1, { description: "Row ID." })),
  tags: Schema.Array(Schema.String.annotate({ fieldId: 101 })).pipe(
    Iceberg.field(2, { description: "Tags for the row." }),
  ),
})
  .annotate({ description: "Example rows." })
  .pipe(Iceberg.identifier("id"));
```

Hosted connectors create missing tables from these bindings. To create one
manually, use the connector's `create-table <namespace.table> --catalog <id>`
command. It creates missing namespaces and tables, and accepts existing tables
only when their schemas match. Use `--resource <name>` if the table name differs
from the resource.

Both paths preserve field IDs and check the stored schema. Set `location` in the
binding, or pass `--location <uri>` to the command, if the catalog cannot choose
a location or you want to choose it yourself.

Table preparation also creates missing namespaces. Tables must be unencrypted,
unpartitioned Iceberg v3 tables. Preparation and startup reject unsupported tables
without migrating them.

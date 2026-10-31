import { Context, Effect, Layer, Schedule, Schema } from "effect";
import { FetchHttpClient, HttpClient, HttpClientResponse } from "effect/http";
import { GenericContainer, Network, Wait } from "testcontainers";

const accessKeyId = "devaccesskey";
const secretAccessKey = "devsecretkey";

export class Instance extends Context.Service<
  Instance,
  {
    readonly accessKeyId: string;
    readonly secretAccessKey: string;
    readonly uri: Effect.Effect<string>;
    /** Catalog URL reachable from the test process. */
    readonly icebergRestUri: Effect.Effect<string>;
    /** Catalog URL reachable from the engine container. */
    readonly engineIcebergRestUri: Effect.Effect<string>;
    /** Publishes ingested rows using the container's workers. Fails for external instances. */
    readonly materializeAndCommit: (
      catalog: string,
      table: { namespace: string[]; name: string },
    ) => Effect.Effect<void, Error>;
  }
>()("@useairfoil/testing/Instance") {}

/** Uses an existing engine and catalog without managing their lifecycle. */
export const external = (
  args: {
    host?: string;
    port?: number;
    icebergRestUri?: string;
    engineIcebergRestUri?: string;
  } = {},
) => {
  const host = args.host ?? "localhost";
  const port = args.port ?? 7777;
  const icebergRestUri = args.icebergRestUri ?? "http://localhost:8181";

  return Layer.succeed(Instance, {
    accessKeyId,
    secretAccessKey,
    uri: Effect.succeed(`http://${host}:${port}`),
    icebergRestUri: Effect.succeed(icebergRestUri),
    engineIcebergRestUri: Effect.succeed(args.engineIcebergRestUri ?? icebergRestUri),
    materializeAndCommit: () =>
      Effect.fail(new Error("External engine workers must be run by the test owner")),
  });
};

/** Starts isolated engine and SeaweedFS containers; releases them when the scope closes. */
export const container = Layer.effect(Instance)(
  Effect.gen(function* () {
    const network = yield* Effect.acquireRelease(
      Effect.tryPromise({
        try: () => new Network().start(),
        catch: () => new Error("Failed to create network"),
      }),
      (network) =>
        Effect.tryPromise(() => network.stop()).pipe(
          Effect.catch(() => Effect.logWarning("Test network cleanup failed")),
        ),
    );

    const seaweedfs = yield* Effect.acquireRelease(
      Effect.tryPromise({
        try: () =>
          new GenericContainer("chrislusf/seaweedfs:4.29")
            .withNetwork(network)
            .withNetworkAliases("seaweedfs")
            .withEntrypoint(["weed"])
            .withCommand(["mini", "-s3", "-dir=/data"])
            .withEnvironment({
              AWS_ACCESS_KEY_ID: accessKeyId,
              AWS_SECRET_ACCESS_KEY: secretAccessKey,
              S3_BUCKET: "default-bucket",
              S3_TABLE_BUCKET: "default-catalog",
            })
            .withTmpFs({ "/data": "rw" })
            .withExposedPorts(8181)
            .withWaitStrategy(
              Wait.forAll([
                Wait.forLogMessage(/S3\s+ready/),
                Wait.forHttp("/v1/default-catalog/namespaces", 8181),
              ]),
            )
            .withStartupTimeout(30_000)
            .start(),
        catch: () => new Error("Failed to start SeaweedFS container"),
      }),
      (seaweedfs) =>
        Effect.tryPromise(() => seaweedfs.stop()).pipe(
          Effect.catch(() => Effect.logWarning("Test SeaweedFS cleanup failed")),
        ),
    );

    const upstreamUri = `http://${seaweedfs.getHost()}:${seaweedfs.getMappedPort(8181)}`;
    const image = "docker.useairfoil.com/airfoil/storage-engine:0.2.0-alpha.6";
    const environment = {
      RUST_LOG: "info",
      SE_S3_BUCKET: "default-bucket",
      SE_S3_ENDPOINT: "http://seaweedfs:8333",
      OTEL_SDK_DISABLED: "true",
      AWS_ACCESS_KEY_ID: accessKeyId,
      AWS_SECRET_ACCESS_KEY: secretAccessKey,
      AWS_REGION: "us-east-1",
      AWS_ALLOW_HTTP: "true",
    };

    const engine = yield* Effect.acquireRelease(
      Effect.tryPromise({
        try: () =>
          new GenericContainer(image)
            .withNetwork(network)
            // Podman network aliases may be unavailable through container DNS.
            .withExtraHosts([
              { host: "seaweedfs", ipAddress: seaweedfs.getIpAddress(network.getName()) },
            ])
            .withCommand(["dev", "--server.address=0.0.0.0:7777"])
            .withEnvironment(environment)
            .withExposedPorts(7777)
            // The dev server has no health route; GET on its POST-only catalog route returns 405.
            .withWaitStrategy(Wait.forHttp("/catalogs", 7777).forStatusCode(405))
            .withStartupTimeout(60_000)
            .start(),
        catch: (cause) => new Error("Failed to start storage-engine container", { cause }),
      }),
      (engine) =>
        Effect.tryPromise(() => engine.stop()).pipe(
          Effect.catch(() => Effect.logWarning("Test engine cleanup failed")),
        ),
    );

    return {
      accessKeyId,
      secretAccessKey,
      uri: Effect.sync(() => `http://${engine.getHost()}:${engine.getMappedPort(7777)}`),
      icebergRestUri: Effect.succeed(upstreamUri),
      engineIcebergRestUri: Effect.succeed("http://seaweedfs:8181"),
      materializeAndCommit: Effect.fnUntraced(
        function* (catalog: string, table: { namespace: string[]; name: string }) {
          const namespace = encodeURIComponent(table.namespace.join("\u001f"));
          const url = `http://${engine.getHost()}:${engine.getMappedPort(7777)}/catalogs/${encodeURIComponent(catalog)}/tables/${namespace}/${encodeURIComponent(table.name)}`;
          const snapshot = HttpClient.get(url).pipe(
            Effect.flatMap(HttpClientResponse.filterStatusOk),
            Effect.flatMap(
              HttpClientResponse.schemaBodyJson(
                Schema.Struct({
                  "current-snapshot-id": Schema.optional(Schema.NullOr(Schema.Number)),
                }),
              ),
            ),
            Effect.map((metadata) => metadata["current-snapshot-id"]),
          );
          const previous = yield* snapshot;
          yield* Effect.acquireRelease(
            Effect.tryPromise(() =>
              new GenericContainer(image)
                .withNetwork(network)
                .withExtraHosts([
                  { host: "seaweedfs", ipAddress: seaweedfs.getIpAddress(network.getName()) },
                  { host: "engine", ipAddress: engine.getIpAddress(network.getName()) },
                ])
                .withEnvironment(environment)
                .withCommand(["worker", "--metadata.url=http://engine:7777"])
                .withWaitStrategy(Wait.forLogMessage(/starting worker/))
                .start(),
            ),
            (worker) => Effect.promise(() => worker.stop()),
          );
          yield* snapshot.pipe(
            Effect.repeat({
              schedule: Schedule.spaced("250 millis"),
              until: (current) => current != null && current !== -1 && current !== previous,
            }),
            Effect.timeout("90 seconds"),
          );
        },
        Effect.scoped,
        Effect.provide(FetchHttpClient.layer),
        Effect.mapError((cause) => new Error("Engine did not publish a new snapshot", { cause })),
      ),
    };
  }),
);

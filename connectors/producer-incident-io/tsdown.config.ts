import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/main.ts", "src/manifest.ts"],
  define: {
    __COMMIT_SHA__: JSON.stringify(process.env.GIT_COMMIT) ?? "undefined",
  },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
});

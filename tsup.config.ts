import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  target: "es2022",
  // React stays a peer dependency, so it must never be bundled: two copies of
  // React in one application breaks hooks.
  external: ["react", "react-dom"],
  // No "use client" banner. This is a plain React library and takes no position
  // on framework boundaries; consumers on the Next.js App Router mark their own
  // call site, which is what both of the apps this came from already do. Note
  // that adding one later means dropping `treeshake` — it routes the bundle
  // through rollup, which strips module-level directives.
});

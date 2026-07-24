import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  dts: true,
  entry: ["src/index.ts"],
  external: ["typescript"],
  format: ["esm"],
  sourcemap: true,
  target: "es2022",
});

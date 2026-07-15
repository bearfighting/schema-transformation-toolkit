import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@aio/core": "/packages/core/src/index.ts",
      "@aio/generator-json-schema":
        "/packages/generators/json-schema/src/index.ts",
      "@aio/generator-typescript":
        "/packages/generators/typescript/src/index.ts",
      "@aio/parser-json": "/packages/parsers/json/src/index.ts",
      "@aio/sdk": "/packages/sdk/src/index.ts",
    },
  },
  test: {
    environment: "node",
    include: ["packages/**/*.test.ts", "tests/**/*.test.ts"],
  },
});

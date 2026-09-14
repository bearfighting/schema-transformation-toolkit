import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { packWorkspacePackages } from "./release-utils.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const tempRoot = mkdtempSync(
  path.join(os.tmpdir(), "schema-transformation-toolkit-sdk-package-"),
);
let completed = false;

try {
  execFileSync(process.execPath, ["scripts/build-workspace.mjs"], {
    cwd: repoRoot,
    stdio: "inherit",
  });

  const sdkBundle = readFileSync(
    path.join(repoRoot, "packages/sdk/dist/index.js"),
    "utf8",
  );
  if (
    sdkBundle.includes("Dynamic require of ") ||
    sdkBundle.includes("var __require")
  ) {
    throw new Error(
      "The SDK ESM bundle must not inline yaml's dynamic Node require compatibility code.",
    );
  }

  const { packages } = packWorkspacePackages(tempRoot);
  const packagesByName = new Map(packages.map((entry) => [entry.name, entry]));
  const sdkPackage = packagesByName.get("@schema-transformation-toolkit/sdk");
  if (!sdkPackage) throw new Error("SDK package was not packed.");
  const workspaceOverrides = Object.fromEntries(
    packages.map((entry) => [entry.name, `file:${entry.tarballPath}`]),
  );
  for (const entry of packages) {
    const packageJson = JSON.parse(
      execFileSync("tar", ["-xOf", entry.tarballPath, "package/package.json"], {
        encoding: "utf8",
      }),
    );
    const workspaceDependencies = [
      "dependencies",
      "optionalDependencies",
      "peerDependencies",
      "devDependencies",
    ].flatMap((section) =>
      Object.entries(packageJson[section] ?? {}).filter(
        ([, version]) =>
          typeof version === "string" && version.startsWith("workspace:"),
      ),
    );
    if (workspaceDependencies.length > 0) {
      throw new Error(
        `Packed ${entry.name} still contains workspace dependencies: ${workspaceDependencies
          .map(([name]) => name)
          .join(", ")}`,
      );
    }
    if (
      packageJson.name !== entry.name ||
      packageJson.version !== entry.version
    ) {
      throw new Error(`Packed manifest mismatch for ${entry.name}.`);
    }
  }
  const tarballPath = sdkPackage.tarballPath;
  writeFileSync(
    path.join(tempRoot, "package.json"),
    `${JSON.stringify(
      {
        name: "schema-transformation-toolkit-sdk-package-smoke",
        private: true,
        type: "module",
        dependencies: {
          "@schema-transformation-toolkit/sdk": `file:${tarballPath}`,
        },
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    path.join(tempRoot, "pnpm-workspace.yaml"),
    `${JSON.stringify({ packages: ["."], overrides: workspaceOverrides }, null, 2)}\n`,
  );

  execFileSync(
    "pnpm",
    // Workspace dependencies are overridden to local tarballs above. Prefer
    // the local store while allowing ordinary third-party dependencies to
    // resolve normally when they are not cached.
    ["install", "--prefer-offline", "--ignore-scripts", "--lockfile=false"],
    {
      cwd: tempRoot,
      stdio: "inherit",
    },
  );

  const tomlSmokeInput = JSON.stringify('id = 1\nname = "Ada"\n');
  const smokeScript = `
    import {
      convert,
      listSourceFormatSupports,
      listTargetFormatSupports,
    } from "@schema-transformation-toolkit/sdk";

    const sources = listSourceFormatSupports()
      .map((item) => item.format)
      .sort();
    const targets = listTargetFormatSupports()
      .map((item) => item.format)
      .sort();
    if (sources.join(",") !== "csv,go,java,json,json-schema,kotlin,openapi,python,rust,toml,typescript,yaml,zod") {
      throw new Error("Unexpected source formats: " + sources.join(","));
    }
    if (targets.join(",") !== "csv,go,java,json,json-schema,kotlin,openapi,python,rust,toml,typescript,yaml,zod") {
      throw new Error("Unexpected target formats: " + targets.join(","));
    }

    const cases = [
      { sourceFormat: "json", targetFormat: "typescript", input: "{\\"id\\":1}" },
      { sourceFormat: "json-schema", targetFormat: "zod", input: JSON.stringify({ type: "object", properties: { id: { type: "integer" } } }) },
      { sourceFormat: "typescript", targetFormat: "json-schema", input: "export interface User { id: number }" },
      { sourceFormat: "openapi", targetFormat: "openapi", input: JSON.stringify({ openapi: "3.1.0", info: { title: "Smoke", version: "1.0.0" }, paths: {}, components: { schemas: { User: { type: "object" } } } }) },
      { sourceFormat: "yaml", targetFormat: "typescript", input: "id: 1\\nname: Ada\\n" },
      { sourceFormat: "json", targetFormat: "yaml", input: "{\\"id\\":1}" },
      { sourceFormat: "csv", targetFormat: "json", input: "id,name\\n1,Ada\\n" },
      { sourceFormat: "toml", targetFormat: "json", input: ${tomlSmokeInput} },
      { sourceFormat: "rust", targetFormat: "typescript", input: "struct User { id: u64 }" },
      { sourceFormat: "typescript", targetFormat: "rust", input: "interface User { id: number }" },
      { sourceFormat: "python", targetFormat: "typescript", input: "@dataclass\\nclass User:\\n    id: int" },
      { sourceFormat: "python", targetFormat: "python", input: "@dataclass\\nclass User:\\n    id: int" },
      { sourceFormat: "java", targetFormat: "java", input: "public record User(long id, String name) {}" },
      { sourceFormat: "kotlin", targetFormat: "kotlin", input: "data class User(val id: Int, val tags: Set<String>)" },
      { sourceFormat: "go", targetFormat: "go", input: "package models\\ntype User struct { ID int64 }" },
      { sourceFormat: "json", targetFormat: "csv", input: "[{\\"id\\":1,\\"name\\":\\"Ada\\"}]" },
      { sourceFormat: "json", targetFormat: "toml", input: "{\\"id\\":1,\\"name\\":\\"Ada\\"}" },
    ];
    for (const item of cases) {
      const result = convert(item);
      if (!result.ok) {
        throw new Error(item.sourceFormat + "->" + item.targetFormat + " failed: " + result.message);
      }
    }
  `;

  const smokePath = path.join(tempRoot, "smoke.mjs");
  writeFileSync(smokePath, smokeScript);
  execFileSync(process.execPath, [smokePath], {
    cwd: tempRoot,
    stdio: "inherit",
  });

  const packageJson = JSON.parse(
    readFileSync(path.join(repoRoot, "packages/sdk/package.json"), "utf8"),
  );
  if (packageJson.private === true) {
    throw new Error(
      "@schema-transformation-toolkit/sdk must be publishable for the package smoke check.",
    );
  }

  console.log("SDK package smoke check passed.");
  completed = true;
} catch (error) {
  console.error(`SDK package smoke diagnostics preserved at: ${tempRoot}`);
  throw error;
} finally {
  if (completed) rmSync(tempRoot, { recursive: true, force: true });
}

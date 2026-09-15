import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createDescriptorRegistry } from "@schema-transformation-toolkit/core";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const builtinRoots = ["packages/parsers", "packages/generators"];
const outputPath = path.join(
  repoRoot,
  "packages/sdk/src/generated/builtin-registry.ts",
);
const manifestVersion = 1;

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  await main();
}

export {
  collectEntries,
  normalizeManifest,
  parseArguments,
  renderRegistry,
  validateEntries,
};

async function main() {
  const cli = parseArguments(process.argv.slice(2));
  const resolvedOutputPath = cli.output
    ? path.resolve(repoRoot, cli.output)
    : outputPath;
  const entries = await collectEntries(cli.manifests);
  const generated = renderRegistry(entries);

  if (cli.check) {
    checkGeneratedFile(generated, resolvedOutputPath);
  } else {
    fs.mkdirSync(path.dirname(resolvedOutputPath), { recursive: true });
    fs.writeFileSync(resolvedOutputPath, generated);
    console.log(`Generated ${path.relative(repoRoot, resolvedOutputPath)}.`);
  }
}

async function collectEntries(manifestPaths = []) {
  const entries = [];
  const stagedEntries = [];

  for (const relativeRoot of builtinRoots) {
    const rootPath = path.join(repoRoot, relativeRoot);
    const packageDirs = fs
      .readdirSync(rootPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    for (const packageName of packageDirs) {
      const relativeDir = path.join(relativeRoot, packageName);
      const packageDir = path.join(repoRoot, relativeDir);
      const packageJsonPath = path.join(packageDir, "package.json");
      if (!fs.existsSync(packageJsonPath)) {
        fail(
          `${relativeDir}: package.json is required for registry discovery.`,
        );
      }
      const packageJson = readJson(packageJsonPath);
      const registry = packageJson.schemaTransformationToolkit?.registry;
      if (!registry) {
        fail(`${relativeDir}: registry manifest is required.`);
      }
      const normalizedEntries = normalizeManifest(registry, {
        packageName: packageJson.name,
        entry: packageJson.name,
        validationEntry: resolvePackageRootForValidation(
          packageDir,
          packageJson,
        ),
        baseDir: packageDir,
        source: path.join(relativeDir, "package.json"),
      });
      if (registry.includeInBuiltinRegistry === false) {
        stagedEntries.push(...normalizedEntries);
      } else {
        entries.push(...normalizedEntries);
      }
    }
  }

  for (const manifestPath of manifestPaths) {
    if (!manifestPath) continue;
    const absolutePath = path.resolve(repoRoot, manifestPath);
    const manifest = readJson(absolutePath);
    entries.push(
      ...normalizeManifest(manifest, {
        source: path.relative(repoRoot, absolutePath),
        baseDir: path.dirname(absolutePath),
      }),
    );
  }

  entries.push({
    role: "transformer",
    packageName: "@schema-transformation-toolkit/core",
    entry: "@schema-transformation-toolkit/core",
    validationEntry: "@schema-transformation-toolkit/core",
    exportName: "valueToShapeTransformer",
    source: "generated default transformer",
  });

  entries.sort((left, right) =>
    [left.role, left.packageName, left.entry, left.exportName]
      .join("\0")
      .localeCompare(
        [right.role, right.packageName, right.entry, right.exportName].join(
          "\0",
        ),
      ),
  );
  await validateEntries([...entries, ...stagedEntries]);
  return entries;
}

function normalizeManifest(manifest, context) {
  if (!manifest || typeof manifest !== "object") {
    fail(`${context.source}: registry manifest must be an object.`);
  }
  if (manifest.version !== manifestVersion) {
    fail(
      `${context.source}: unsupported registry manifest version "${manifest.version}".`,
    );
  }
  if (!Array.isArray(manifest.entries) || manifest.entries.length === 0) {
    fail(
      `${context.source}: registry manifest entries must be a non-empty array.`,
    );
  }
  if (
    "includeInBuiltinRegistry" in manifest &&
    typeof manifest.includeInBuiltinRegistry !== "boolean"
  ) {
    fail(
      `${context.source}: includeInBuiltinRegistry must be a boolean when provided.`,
    );
  }

  return manifest.entries.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      fail(`${context.source}: each registry entry must be an object.`);
    }
    if (!isRole(entry.role)) {
      fail(`${context.source}: invalid registry role "${entry.role}".`);
    }
    const packageName = entry.package ?? context.packageName;
    const rawModuleEntry = entry.entry ?? context.entry ?? packageName;
    if (
      typeof packageName !== "string" ||
      packageName.length === 0 ||
      typeof rawModuleEntry !== "string" ||
      rawModuleEntry.length === 0 ||
      typeof entry.export !== "string" ||
      entry.export.length === 0
    ) {
      fail(`${context.source}: package, entry, and export are required.`);
    }
    const moduleEntry =
      rawModuleEntry.startsWith(".") && context.baseDir
        ? pathToFileURL(path.resolve(context.baseDir, rawModuleEntry)).href
        : rawModuleEntry;
    return {
      role: entry.role,
      packageName,
      entry: moduleEntry,
      validationEntry: context.validationEntry ?? moduleEntry,
      exportName: entry.export,
      source: context.source,
    };
  });
}

async function validateEntries(entries) {
  const seenModules = new Set();
  const seenRoles = new Set();
  const importedModules = new Map();
  const registry = createDescriptorRegistry();

  for (const entry of entries) {
    const moduleKey = `${entry.entry}\0${entry.exportName}`;
    if (seenModules.has(moduleKey)) {
      fail(`${entry.source}: duplicate package entry ${moduleKey}.`);
    }
    seenModules.add(moduleKey);

    let module = importedModules.get(entry.validationEntry);
    if (!module) {
      try {
        module = await import(entry.validationEntry);
      } catch (error) {
        fail(
          `${entry.source}: cannot import ${entry.entry}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      importedModules.set(entry.validationEntry, module);
    }
    const descriptor = module[entry.exportName];
    if (
      !descriptor ||
      typeof descriptor !== "object" ||
      Array.isArray(descriptor)
    ) {
      fail(
        `${entry.source}: ${entry.entry} does not export ${entry.exportName}.`,
      );
    }
    if (descriptor.kind !== entry.role) {
      fail(
        `${entry.source}: ${entry.exportName} declares role ${descriptor.kind}, expected ${entry.role}.`,
      );
    }

    const identity =
      entry.role === "parser"
        ? descriptor.format
        : entry.role === "generator"
          ? descriptor.format
          : descriptor.id;
    const identityKey = `${entry.role}\0${identity}`;
    if (seenRoles.has(identityKey)) {
      fail(`${entry.source}: duplicate ${entry.role} identity "${identity}".`);
    }
    seenRoles.add(identityKey);

    try {
      if (entry.role === "parser") registry.registerParser(descriptor);
      else if (entry.role === "generator")
        registry.registerGenerator(descriptor);
      else registry.registerTransformer(descriptor);
    } catch (error) {
      fail(
        `${entry.source}: invalid ${entry.role} descriptor ${entry.exportName}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

function renderRegistry(entries) {
  const imports = entries
    .map(
      (entry, index) =>
        `import { ${entry.exportName} as descriptor${index} } from ${JSON.stringify(entry.entry)};`,
    )
    .join("\n");
  const registrations = entries
    .map(
      (entry, index) =>
        `  registry.register${capitalize(entry.role)}(descriptor${index});`,
    )
    .join("\n");

  return `// Generated by scripts/generate-builtin-registry.mjs. Do not edit.\n${imports}\n\nimport { createDescriptorRegistry } from "@schema-transformation-toolkit/core";\nimport type { DescriptorRegistry } from "@schema-transformation-toolkit/core";\n\nexport function createBuiltinRegistry(): DescriptorRegistry {\n  const registry = createDescriptorRegistry();\n${registrations}\n  return registry;\n}\n`;
}

function checkGeneratedFile(expected, resolvedOutputPath) {
  if (!fs.existsSync(resolvedOutputPath)) {
    fail(
      `Generated registry is missing: ${path.relative(repoRoot, resolvedOutputPath)}.`,
    );
  }
  const actual = fs.readFileSync(resolvedOutputPath, "utf8");
  if (actual !== expected) {
    fail(
      `Generated registry is stale: run node scripts/generate-builtin-registry.mjs and review the result.`,
    );
  }
  console.log(
    `Generated registry is up to date: ${path.relative(repoRoot, resolvedOutputPath)}.`,
  );
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`Cannot read JSON ${path.relative(repoRoot, filePath)}: ${error}`);
  }
}

function isRole(value) {
  return value === "parser" || value === "generator" || value === "transformer";
}

function resolvePackageRootForValidation(packageDir, packageJson) {
  const rootExport = packageJson.exports?.["."];
  const target =
    typeof rootExport === "string"
      ? rootExport
      : (rootExport?.import ?? rootExport?.default);
  if (typeof target !== "string" || !target.startsWith("./")) {
    fail(
      `${packageJson.name}: package root must declare a resolvable exports["."] import entry.`,
    );
  }
  const targetPath = path.resolve(packageDir, target);
  if (!fs.existsSync(targetPath)) {
    fail(
      `${packageJson.name}: package root export does not exist: ${path.relative(repoRoot, targetPath)}.`,
    );
  }
  return pathToFileURL(targetPath).href;
}

function capitalize(value) {
  return value[0].toUpperCase() + value.slice(1);
}

function fail(message) {
  throw new Error(message);
}

function parseArguments(argumentsList) {
  const result = { check: false, manifests: [], output: undefined };
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--check") {
      result.check = true;
      continue;
    }
    if (argument === "--manifest") {
      const value = argumentsList[++index];
      if (!value || value.startsWith("--")) {
        fail("--manifest requires a path.");
      }
      result.manifests.push(value);
      continue;
    }
    if (argument === "--output") {
      const value = argumentsList[++index];
      if (!value || value.startsWith("--")) {
        fail("--output requires a path.");
      }
      if (result.output !== undefined) {
        fail("--output may only be provided once.");
      }
      result.output = value;
      continue;
    }
    fail(`Unknown registry generator argument: ${argument}`);
  }
  return result;
}

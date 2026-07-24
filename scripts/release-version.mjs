import {
  assertValidVersion,
  getManagedPackageJsonPaths,
  readJson,
  writeJson,
} from "./release-utils.mjs";

const version = process.argv[2];
const dryRun = process.argv.includes("--dry-run");

if (!version) {
  throw new Error(
    'Expected a version argument. Example: "pnpm release:version 0.1.1-alpha.0".',
  );
}

assertValidVersion(version);

for (const filePath of getManagedPackageJsonPaths()) {
  const manifest = readJson(filePath);
  const nextManifest = {
    ...manifest,
    version,
  };

  if (!dryRun) {
    writeJson(filePath, nextManifest);
  }

  console.log(`${dryRun ? "Would update" : "Updated"} ${filePath} -> ${version}`);
}

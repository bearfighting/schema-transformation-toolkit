import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const SEMVER_PATTERN =
  /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

export const REPO_ROOT = process.cwd();
export const ROOT_PACKAGE_JSON_PATH = path.join(REPO_ROOT, "package.json");
export const PACKAGES_ROOT = path.join(REPO_ROOT, "packages");

export function getWorkspacePackageJsonPaths() {
  const packageJsonPaths = [];
  const topLevelEntries = readdirSync(PACKAGES_ROOT, { withFileTypes: true });

  for (const entry of topLevelEntries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const directPackageJsonPath = path.join(
      PACKAGES_ROOT,
      entry.name,
      "package.json",
    );

    if (isFileReadable(directPackageJsonPath)) {
      packageJsonPaths.push(directPackageJsonPath);
      continue;
    }

    const nestedRoot = path.join(PACKAGES_ROOT, entry.name);
    const nestedEntries = readdirSync(nestedRoot, { withFileTypes: true });

    for (const nestedEntry of nestedEntries) {
      if (!nestedEntry.isDirectory()) {
        continue;
      }

      const nestedPackageJsonPath = path.join(
        nestedRoot,
        nestedEntry.name,
        "package.json",
      );

      if (isFileReadable(nestedPackageJsonPath)) {
        packageJsonPaths.push(nestedPackageJsonPath);
      }
    }
  }

  return packageJsonPaths.sort();
}

export function getManagedPackageJsonPaths() {
  return [ROOT_PACKAGE_JSON_PATH, ...getWorkspacePackageJsonPaths()];
}

export function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

export function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function assertValidVersion(version) {
  if (!SEMVER_PATTERN.test(version)) {
    throw new Error(
      `Expected a semver-like version such as "0.1.1" or "0.1.1-alpha.0", received "${version}".`,
    );
  }
}

export function normalizeTagToVersion(tagOrVersion) {
  return tagOrVersion.startsWith("v") ? tagOrVersion.slice(1) : tagOrVersion;
}

export function toReleaseTag(version) {
  return `v${version}`;
}

export function getVersionSnapshot() {
  return getManagedPackageJsonPaths().map((filePath) => {
    const manifest = readJson(filePath);

    return {
      filePath,
      relativePath: path.relative(REPO_ROOT, filePath),
      name: manifest.name,
      version: manifest.version,
      private: manifest.private === true,
    };
  });
}

export function ensureConsistentVersions(expectedVersion) {
  const snapshot = getVersionSnapshot();
  const versions = new Set(snapshot.map((entry) => entry.version));

  if (versions.size !== 1) {
    const details = snapshot
      .map((entry) => `${entry.relativePath}: ${entry.version}`)
      .join("\n");

    throw new Error(
      `Expected one shared version across manifests.\n${details}`,
    );
  }

  const [actualVersion] = versions;

  if (expectedVersion && actualVersion !== expectedVersion) {
    throw new Error(
      `Expected version "${expectedVersion}" across managed manifests, found "${actualVersion}".`,
    );
  }

  return {
    version: actualVersion,
    snapshot,
  };
}

export function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "pipe",
    encoding: "utf8",
    ...options,
  });

  if (result.status !== 0) {
    throw new Error(
      [
        `Command failed: ${command} ${args.join(" ")}`,
        result.stdout?.trim(),
        result.stderr?.trim(),
      ]
        .filter((value) => value && value.length > 0)
        .join("\n"),
    );
  }

  return result.stdout?.trim() ?? "";
}

function isFileReadable(filePath) {
  try {
    readFileSync(filePath, "utf8");
    return true;
  } catch {
    return false;
  }
}

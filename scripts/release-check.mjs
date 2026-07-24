import {
  assertValidVersion,
  ensureConsistentVersions,
  normalizeTagToVersion,
  runCommand,
  toReleaseTag,
} from "./release-utils.mjs";

const args = new Set(process.argv.slice(2));
const versionArg = readFlagValue("--version");
const versionFromTagArg = readFlagValue("--version-from-tag");
const allowDirty = args.has("--allow-dirty");
const skipTagExistenceCheck = args.has("--no-tag-existence-check");

const expectedVersion = versionArg
  ? versionArg
  : versionFromTagArg
    ? normalizeTagToVersion(versionFromTagArg)
    : undefined;

if (expectedVersion) {
  assertValidVersion(expectedVersion);
}

if (!allowDirty) {
  const status = runCommand("git", ["status", "--short"]);

  if (status.length > 0) {
    throw new Error(
      "Expected a clean git worktree before running release checks.",
    );
  }
}

const { version, snapshot } = ensureConsistentVersions(expectedVersion);

if (!skipTagExistenceCheck) {
  const tag = toReleaseTag(version);
  const existingTag = runCommand("git", ["tag", "--list", tag]);

  if (existingTag === tag) {
    throw new Error(`Release tag "${tag}" already exists.`);
  }
}

console.log(`Release check passed for ${toReleaseTag(version)}.`);
for (const entry of snapshot) {
  console.log(`- ${entry.relativePath}: ${entry.version}`);
}

function readFlagValue(flag) {
  const index = process.argv.indexOf(flag);

  if (index === -1) {
    return undefined;
  }

  const value = process.argv[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`Expected a value after ${flag}.`);
  }

  return value;
}

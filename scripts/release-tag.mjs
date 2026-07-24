import {
  ensureConsistentVersions,
  runCommand,
  toReleaseTag,
} from "./release-utils.mjs";

const pushTag = process.argv.includes("--push");
const { version } = ensureConsistentVersions();
const tag = toReleaseTag(version);

const status = runCommand("git", ["status", "--short"]);

if (status.length > 0) {
  throw new Error("Expected a clean git worktree before creating a release tag.");
}

const existingTag = runCommand("git", ["tag", "--list", tag]);

if (existingTag === tag) {
  throw new Error(`Release tag "${tag}" already exists.`);
}

runCommand("git", ["tag", "-a", tag, "-m", `Release ${tag}`]);
console.log(`Created tag ${tag}.`);

if (pushTag) {
  runCommand("git", ["push", "origin", tag], {
    stdio: "inherit",
  });
}

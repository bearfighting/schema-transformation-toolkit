import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  ensureConsistentVersions,
  getWorkspacePackageJsonPaths,
  readJson,
  REPO_ROOT,
  runCommand,
  toReleaseTag,
} from "./release-utils.mjs";

const outDirFlagIndex = process.argv.indexOf("--out-dir");
const outDir =
  outDirFlagIndex === -1
    ? path.join(REPO_ROOT, "release-artifacts")
    : path.resolve(REPO_ROOT, process.argv[outDirFlagIndex + 1] ?? "");

if (outDirFlagIndex !== -1 && !process.argv[outDirFlagIndex + 1]) {
  throw new Error("Expected a directory value after --out-dir.");
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const { version } = ensureConsistentVersions();
const packageEntries = [];

for (const filePath of getWorkspacePackageJsonPaths()) {
  const packageDir = path.dirname(filePath);
  const manifest = readJson(filePath);
  const packedFile = runCommand(
    "pnpm",
    ["pack", "--pack-destination", outDir],
    { cwd: packageDir },
  )
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .at(-1);

  if (!packedFile) {
    throw new Error(`Expected pnpm pack to output a tarball name for ${filePath}.`);
  }

  packageEntries.push({
    name: manifest.name,
    version: manifest.version,
    private: manifest.private === true,
    tarball: path.basename(packedFile),
  });
}

const manifest = {
  tag: toReleaseTag(version),
  version,
  generatedAt: new Date().toISOString(),
  packages: packageEntries,
};

writeFileSync(
  path.join(outDir, "release-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

console.log(`Packed ${packageEntries.length} workspace packages into ${outDir}.`);

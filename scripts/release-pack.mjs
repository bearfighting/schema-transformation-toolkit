import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  packWorkspacePackages,
  REPO_ROOT,
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

const { version, packages: packageEntries } = packWorkspacePackages(outDir);

const manifest = {
  tag: toReleaseTag(version),
  version,
  generatedAt: new Date().toISOString(),
  packages: packageEntries.map((entry) =>
    Object.fromEntries(
      Object.entries(entry).filter(([key]) => key !== "tarballPath"),
    ),
  ),
};

writeFileSync(
  path.join(outDir, "release-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

console.log(
  `Packed ${packageEntries.length} workspace packages into ${outDir}.`,
);

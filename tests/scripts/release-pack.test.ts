import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("release packaging scripts", () => {
  it("packs every workspace package with a stable release manifest", () => {
    const initialGitStatus = gitStatus();
    const outputDirectory = mkdtempSync(
      join(tmpdir(), "schema-toolkit-release-pack-"),
    );
    try {
      const result = spawnSync(
        process.execPath,
        ["scripts/release-pack.mjs", "--out-dir", outputDirectory],
        { encoding: "utf8" },
      );
      expect(result.status, result.stderr || result.stdout).toBe(0);

      const manifest = JSON.parse(
        readFileSync(join(outputDirectory, "release-manifest.json"), "utf8"),
      ) as {
        version: string;
        packages: Array<{
          name: string;
          version: string;
          tarball: string;
          private: boolean;
        }>;
      };
      expect(manifest.packages.length).toBeGreaterThan(1);
      expect(new Set(manifest.packages.map((entry) => entry.version))).toEqual(
        new Set([manifest.version]),
      );
      for (const entry of manifest.packages) {
        expect(entry).not.toHaveProperty("tarballPath");
        expect(entry.tarball).toMatch(/\.tgz$/u);
        const tarballPath = join(outputDirectory, entry.tarball);
        expect(existsSync(tarballPath)).toBe(true);
        const packedManifest = spawnSync(
          "tar",
          ["-xOf", tarballPath, "package/package.json"],
          { encoding: "utf8" },
        );
        expect(packedManifest.status, packedManifest.stderr).toBe(0);
        const packageJson = JSON.parse(packedManifest.stdout) as {
          name: string;
          version: string;
          dependencies?: Record<string, string>;
          optionalDependencies?: Record<string, string>;
          peerDependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
        };
        expect(packageJson.name).toBe(entry.name);
        expect(packageJson.version).toBe(entry.version);
        expect(
          [
            packageJson.dependencies,
            packageJson.optionalDependencies,
            packageJson.peerDependencies,
            packageJson.devDependencies,
          ].some((dependencies) =>
            Object.values(dependencies ?? {}).some((version) =>
              version.startsWith("workspace:"),
            ),
          ),
        ).toBe(false);
      }
      expect(
        manifest.packages.some(
          (entry) => entry.name === "@schema-transformation-toolkit/sdk",
        ),
      ).toBe(true);
    } finally {
      rmSync(outputDirectory, { recursive: true, force: true });
      expect(gitStatus()).toBe(initialGitStatus);
    }
  }, 60_000);

  it("preserves the SDK smoke diagnostics directory on failure", () => {
    const workingDirectory = mkdtempSync(
      join(tmpdir(), "schema-toolkit-sdk-smoke-failure-"),
    );
    try {
      const scriptPath = join(process.cwd(), "scripts/check-sdk-package.mjs");
      const result = spawnSync(process.execPath, [scriptPath], {
        cwd: workingDirectory,
        encoding: "utf8",
      });
      const output = `${result.stdout}\n${result.stderr}`;
      expect(result.status).not.toBe(0);
      const match = output.match(
        /SDK package smoke diagnostics preserved at: (.+)/u,
      );
      expect(match?.[1]).toBeTruthy();
      if (!match?.[1]) return;
      const diagnosticsDirectory = match[1].trim();
      expect(existsSync(diagnosticsDirectory)).toBe(true);
      rmSync(diagnosticsDirectory, { recursive: true, force: true });
    } finally {
      rmSync(workingDirectory, { recursive: true, force: true });
    }
  }, 60_000);
});

function gitStatus(): string {
  const result = spawnSync("git", ["status", "--short"], {
    encoding: "utf8",
  });
  expect(result.status, result.stderr).toBe(0);
  return result.stdout;
}

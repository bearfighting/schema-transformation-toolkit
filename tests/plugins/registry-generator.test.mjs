import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import {
  collectEntries,
  normalizeManifest,
  parseArguments,
  renderRegistry,
  validateEntries,
} from "../../scripts/generate-builtin-registry.mjs";

describe("registry manifest generator", () => {
  it("discovers all workspace component manifests plus the default transformer", async () => {
    const entries = await collectEntries();

    expect(entries).toHaveLength(27);
    expect(entries.filter((entry) => entry.role === "parser")).toHaveLength(13);
    expect(entries.filter((entry) => entry.role === "generator")).toHaveLength(
      13,
    );
    expect(
      entries.some(
        (entry) =>
          entry.packageName ===
          "@schema-transformation-toolkit/generator-csharp",
      ),
    ).toBe(false);
    expect(entries.at(-1)).toMatchObject({
      role: "transformer",
      exportName: "valueToShapeTransformer",
    });
  });

  it("renders deterministic output and validates CLI arguments", async () => {
    const entries = await collectEntries();
    expect(renderRegistry(entries)).toBe(renderRegistry([...entries]));
    expect(
      parseArguments(["--manifest", "a.json", "--manifest", "b.json"]),
    ).toEqual({
      check: false,
      manifests: ["a.json", "b.json"],
      output: undefined,
    });
    expect(() => parseArguments(["--unknown"])).toThrow(
      "Unknown registry generator argument",
    );
    expect(() => parseArguments(["--output"])).toThrow(
      "--output requires a path",
    );
  });

  it("rejects invalid manifest roles and versions", () => {
    expect(() =>
      normalizeManifest(
        { version: 2, entries: [] },
        { source: "fixture.manifest.json" },
      ),
    ).toThrow("unsupported registry manifest version");
    expect(() =>
      normalizeManifest(
        { version: 1, entries: [{ role: "unknown", export: "descriptor" }] },
        { source: "fixture.manifest.json" },
      ),
    ).toThrow('invalid registry role "unknown"');
    expect(() =>
      normalizeManifest(
        {
          version: 1,
          includeInBuiltinRegistry: "false",
          entries: [{ role: "generator", export: "descriptor" }],
        },
        { source: "fixture.manifest.json" },
      ),
    ).toThrow("includeInBuiltinRegistry must be a boolean");
  });

  it("validates staged descriptor exports before they can be excluded", async () => {
    const csharpEntry = pathToFileURL(
      path.resolve("packages/generators/csharp/dist/index.js"),
    ).href;
    const entries = normalizeManifest(
      {
        version: 1,
        includeInBuiltinRegistry: false,
        entries: [
          {
            role: "generator",
            package: "@schema-transformation-toolkit/generator-csharp",
            entry: csharpEntry,
            export: "missingCSharpDescriptor",
          },
        ],
      },
      {
        source: "staged-fixture.manifest.json",
        validationEntry: csharpEntry,
      },
    );
    await expect(validateEntries(entries)).rejects.toThrow(
      "does not export missingCSharpDescriptor",
    );
  });
});

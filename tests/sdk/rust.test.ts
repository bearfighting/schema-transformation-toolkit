import { describe, expect, it } from "vitest";
import { convert } from "@schema-transformation-toolkit/sdk";

describe("Rust SDK reporting", () => {
  it("does not report supported map nodes as unsupported", () => {
    const result = convert({
      sourceFormat: "rust",
      targetFormat: "rust",
      input:
        "use std::collections::HashMap; struct Config { labels: HashMap<String, String> }",
      includeArtifacts: true,
    });

    expect(result.ok, JSON.stringify(result)).toBe(true);
    if (!result.ok) return;
    expect(result.artifacts?.shape?.root.kind).toBe("object");
    expect(result.report?.lossHotspots ?? []).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "unsupported-rust-node" }),
      ]),
    );
  });
});

import { describe, expect, it } from "vitest";
import { inferJsonDocument } from "../packages/parsers/json/src/index.js";

describe("workspace smoke test", () => {
  it("creates a basic schema document", () => {
    expect(inferJsonDocument('"hello"', "Example")).toEqual({
      version: "0.1",
      kind: "document",
      name: {
        source: "Example",
        words: ["example"],
      },
      definitions: [],
      root: {
        kind: "scalar",
        scalar: "string",
      },
    });
  });
});

import { describe, expect, it } from "vitest";
import { inspectTypeScriptImplicitEntry } from "../../packages/sdk/src/index.js";

describe("sdk implicit entry inspection", () => {
  it("returns TypeScript implicit-entry analysis directly from source text", () => {
    expect(
      inspectTypeScriptImplicitEntry(
        [
          "type InternalToken = string;",
          "export type User = { token: InternalToken };",
          "export type UserList = User[];",
        ].join("\n"),
      ),
    ).toEqual({
      entryName: "UserList",
      rootCandidates: ["UserList"],
      exportedRootCandidates: ["UserList"],
      selectionReason: "single-exported-root",
    });
  });

  it("preserves ambiguity details for exported root conflicts", () => {
    expect(
      inspectTypeScriptImplicitEntry(
        [
          "type InternalToken = string;",
          "export type User = { token: InternalToken };",
          "export type Account = { id: number };",
        ].join("\n"),
      ),
    ).toEqual({
      rootCandidates: ["Account", "User"],
      exportedRootCandidates: ["Account", "User"],
      ambiguityReason: "multiple-exported-root-candidates",
    });
  });
});

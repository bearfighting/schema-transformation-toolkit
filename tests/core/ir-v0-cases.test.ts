import { describe, expect, it } from "vitest";

describe("core ir v0 case inventory", () => {
  it("locks the first-pass inference scope", () => {
    expect([
      "scalar-string",
      "scalar-integer",
      "scalar-number",
      "scalar-boolean",
      "simple-object",
      "nested-object",
      "array-of-string",
      "array-of-object",
      "object-field-optional",
      "object-field-nullable",
      "object-field-optional-and-nullable",
      "nested-optional-field",
      "explicit-null-without-other-sample",
    ]).toHaveLength(13);
  });
});

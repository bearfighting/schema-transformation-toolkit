import { describe, expect, it } from "vitest";
import {
  constraint,
  constraintClause,
  constraintDocument,
  constraintEntry,
  constraintTarget,
  isConstraint,
  isConstraintDocument,
  isConstraintEntry,
  isConstraintTarget,
} from "../../packages/core/src/index.js";

describe("constraint ir", () => {
  it("builds targeted constraint entries over shape paths", () => {
    const document = constraintDocument("UserConstraints", [
      constraintEntry(constraintTarget("field", ["root", "fields", "email"]), [
        constraint("pattern", {
          value: "^[^@]+@[^@]+$",
          severity: "error",
          message: "Email fields must match a basic email pattern.",
        }),
      ]),
    ]);

    expect(document).toEqual({
      kind: "constraint-document",
      name: "UserConstraints",
      entries: [
        {
          target: {
            kind: "field",
            path: ["root", "fields", "email"],
          },
          constraints: [
            {
              kind: "pattern",
              value: "^[^@]+@[^@]+$",
              severity: "error",
              message: "Email fields must match a basic email pattern.",
            },
          ],
        },
      ],
    });
  });

  it("keeps the legacy clause helper as a compatibility wrapper", () => {
    expect(
      constraintClause(
        "closed-object",
        ["root"],
        "This object should reject additional properties.",
        "warning",
        { sourceKeyword: "additionalProperties" },
      ),
    ).toEqual({
      target: {
        kind: "node",
        path: ["root"],
      },
      constraints: [
        {
          kind: "closed-object",
          message: "This object should reject additional properties.",
          severity: "warning",
          evidence: {
            sourceKeyword: "additionalProperties",
          },
        },
      ],
    });
  });

  it("recognizes the new constraint model with guards", () => {
    const target = constraintTarget("root", ["root"]);
    const rule = constraint("minItems", { value: 1 });
    const entry = constraintEntry(target, [rule]);
    const document = constraintDocument("ListConstraints", [entry]);

    expect(isConstraintTarget(target)).toBe(true);
    expect(isConstraint(rule)).toBe(true);
    expect(isConstraintEntry(entry)).toBe(true);
    expect(isConstraintDocument(document)).toBe(true);
  });
});

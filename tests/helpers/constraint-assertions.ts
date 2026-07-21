import { expect } from "vitest";
import type { ConstraintDocument } from "@aio/core";

export function expectConstraint(
  document: ConstraintDocument | undefined,
  options: {
    path: string[];
    kind: string;
    value?: unknown;
  },
): void {
  expect(document).toBeDefined();

  if (!document) {
    throw new Error("Expected constraint document to be defined.");
  }

  const matchingEntries = document.entries.filter(
    (candidate) =>
      candidate.target.kind === "node" &&
      candidate.target.path.join(".") === options.path.join("."),
  );

  expect(matchingEntries.length).toBeGreaterThan(0);

  if (matchingEntries.length === 0) {
    throw new Error(
      `Expected constraint entry at path "${options.path.join(".")}".`,
    );
  }

  const constraint = matchingEntries
    .flatMap((entry) => entry.constraints)
    .find((candidate) => candidate.kind === options.kind);

  expect(constraint).toBeDefined();

  if (!constraint) {
    throw new Error(
      `Expected constraint "${options.kind}" at path "${options.path.join(".")}".`,
    );
  }

  if ("value" in options) {
    expect(constraint.value).toEqual(options.value);
  }
}

import { describe, expect, it } from "vitest";
import { stringRecordFixture } from "../fixtures/semantics/index.js";
import {
  parseSemanticFixture,
  SemanticFixtureParseError,
} from "../helpers/semantic-fixture-parser.js";

describe("equivalence fixture parser failures", () => {
  it.each([
    ["typescript", "type = ;"],
    ["zod", 'import { z } from "zod"; export const = z.string();'],
  ] as const)("preserves %s parser diagnostics", (format, input) => {
    const fixture = {
      ...stringRecordFixture,
      sources: {
        ...stringRecordFixture.sources,
        [format]: { input, options: { name: "Failure" } },
      },
    } as unknown as typeof stringRecordFixture;

    try {
      parseSemanticFixture(fixture, format);
      throw new Error("expected parser failure");
    } catch (error) {
      expect(error).toBeInstanceOf(SemanticFixtureParseError);
      const failure = error as SemanticFixtureParseError;
      expect(failure.code).toEqual(expect.any(String));
      expect(failure.diagnostics).toEqual(expect.any(Array));
      expect(failure.diagnostics?.[0]).toEqual(
        expect.objectContaining({ source: expect.any(String) }),
      );
    }
  });

  it("preserves OpenAPI failure code and diagnostics", () => {
    const fixture = {
      ...stringRecordFixture,
      sources: {
        ...stringRecordFixture.sources,
        openapi: { input: "{", options: { name: "Failure" } },
      },
    } as unknown as typeof stringRecordFixture;

    expect(() => parseSemanticFixture(fixture, "openapi")).toThrow(
      expect.objectContaining({
        name: "SemanticFixtureParseError",
        code: "invalid-openapi-document",
        diagnostics: expect.any(Array),
      }),
    );
  });

  it("reports missing sources as structured fixture failures", () => {
    const fixture = {
      ...stringRecordFixture,
      sources: { ...stringRecordFixture.sources, typescript: undefined },
    } as unknown as typeof stringRecordFixture;

    expect(() => parseSemanticFixture(fixture, "typescript")).toThrow(
      expect.objectContaining({
        fixtureId: fixture.id,
        format: "typescript",
        code: "missing-fixture-source",
        diagnostics: [
          expect.objectContaining({
            source: "tests/semantic-fixture-parser",
            path: ["sources", "typescript"],
          }),
        ],
      }),
    );
  });
});

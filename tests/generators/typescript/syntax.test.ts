import { describe, expect, it } from "vitest";
import {
  schemaDocument,
  schemaFieldNode,
  schemaObjectNode,
  schemaScalarNode,
  schemaUnknownNode,
  schemaUnionNode,
} from "@aio/core";
import {
  generateTypeScript,
  tryGenerateTypeScript,
} from "@aio/generator-typescript";
import {
  sharedSemanticFixtures,
  unknownRootFixture,
} from "../../fixtures/semantics/index.js";
import { expectValidTypeScriptSyntax } from "../../helpers/typescript-syntax.js";

describe("generator-typescript syntax validity", () => {
  it("renders syntactically valid TypeScript for the shared canonical semantic fixtures", () => {
    for (const fixture of sharedSemanticFixtures) {
      const output = generateTypeScript(fixture.canonicalShape);

      expectValidTypeScriptSyntax(output, `${fixture.id}.ts`);
    }
  });

  it('renders syntactically valid TypeScript when object roots use rootObjectMode: "type"', () => {
    const output = generateTypeScript(
      schemaDocument(
        "UserDocument",
        schemaObjectNode([
          schemaFieldNode("id", schemaScalarNode("integer")),
          schemaFieldNode("name", schemaScalarNode("string"), {
            required: false,
            nullable: true,
          }),
        ]),
      ),
      {
        rootObjectMode: "type",
      },
    );

    expect(output).toContain("export type UserDocument = {");
    expectValidTypeScriptSyntax(output, "root-object-mode-type.ts");
  });

  it("keeps success-with-diagnostics outputs syntactically valid for wide unknown semantics", () => {
    const result = tryGenerateTypeScript(unknownRootFixture.canonicalShape);

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error("Expected unknown fixture generation to succeed.");
    }

    expect(result.diagnostics).toBeDefined();
    expectValidTypeScriptSyntax(result.output, "unknown-root.ts");
  });

  it("keeps union outputs syntactically valid when unknown members absorb narrower branches", () => {
    const result = tryGenerateTypeScript(
      schemaDocument(
        "WideValues",
        schemaUnionNode([
          schemaScalarNode("string"),
          schemaUnknownNode({
            reason: "no-evidence",
          }),
        ]),
      ),
    );

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error("Expected wide union generation to succeed.");
    }

    expect(result.diagnostics).toBeDefined();
    expectValidTypeScriptSyntax(result.output, "wide-values.ts");
  });
});

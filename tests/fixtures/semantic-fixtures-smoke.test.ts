import { describe, expect, it } from "vitest";
import { typeScriptParser } from "@aio/parser-typescript";
import {
  expectDiagnosticCode,
  expectSemanticNoteCode,
} from "../helpers/diagnostic-assertions.js";
import { parseSemanticFixture } from "../helpers/semantic-fixture-parser.js";
import {
  expectRequiredProperty,
  expectArrayFieldElementReference,
  expectIrEquivalent,
  expectObjectFieldReference,
  expectOptionalProperty,
  expectReference,
  expectShapeKind,
  expectTupleElementKinds,
  expectUnknownRoot,
  expectValidIr,
  expectNullableProperty,
} from "../helpers/schema-equivalence.js";
import {
  configLikeFixture,
  integerPropertyFixture,
  literalUnionFixture,
  localReferenceFixture,
  multiLevelDefinitionGraphFixture,
  nestedObjectFixture,
  nullablePropertyFixture,
  optionalVsNullableFixture,
  optionalPropertyFixture,
  optionalTupleFixture,
  paginatedResponseFixture,
  primitiveUnionFixture,
  primitiveStringFixture,
  recordArrayReferenceUnionFixture,
  recordTupleReferenceFixture,
  requiredPropertyFixture,
  recursiveReferenceFixture,
  sharedReferenceFixture,
  sharedSemanticFixtures,
  stringArrayFixture,
  stringRecordFixture,
  tupleNullableReferenceFixture,
  unknownRootFixture,
} from "./semantics/index.js";

describe("semantic fixture foundation", () => {
  it("keeps canonical fixture documents valid", () => {
    for (const fixture of sharedSemanticFixtures) {
      expectValidIr(fixture.canonicalShape);
    }
  });

  it("parses the shared primitive string fixture from JSON inference", () => {
    const parsed = parseSemanticFixture(primitiveStringFixture, "json");

    expectShapeKind(parsed.document, "scalar");
    expectIrEquivalent(parsed.document, primitiveStringFixture.canonicalShape);
  });

  it("parses the shared required-property fixture from TypeScript and JSON Schema", () => {
    const fromTypeScript = parseSemanticFixture(
      requiredPropertyFixture,
      "typescript",
    );
    const fromJsonSchema = parseSemanticFixture(
      requiredPropertyFixture,
      "json-schema",
    );

    expectShapeKind(fromTypeScript.document, "object");
    expectShapeKind(fromJsonSchema.document, "object");
    expectRequiredProperty(fromTypeScript.document, "name", "scalar");
    expectRequiredProperty(fromJsonSchema.document, "name", "scalar");
    expectIrEquivalent(
      fromTypeScript.document,
      requiredPropertyFixture.canonicalShape,
    );
    expectIrEquivalent(
      fromJsonSchema.document,
      requiredPropertyFixture.canonicalShape,
    );
  });

  it("parses the shared integer-property fixture from JSON inference and JSON Schema", () => {
    const fromJson = parseSemanticFixture(integerPropertyFixture, "json");
    const fromJsonSchema = parseSemanticFixture(
      integerPropertyFixture,
      "json-schema",
    );

    expectShapeKind(fromJson.document, "object");
    expectShapeKind(fromJsonSchema.document, "object");
    expectRequiredProperty(fromJson.document, "id", "scalar");
    expectRequiredProperty(fromJsonSchema.document, "id", "scalar");
    expectIrEquivalent(
      fromJson.document,
      integerPropertyFixture.canonicalShape,
    );
    expectIrEquivalent(
      fromJsonSchema.document,
      integerPropertyFixture.canonicalShape,
    );
  });

  it("parses the shared homogeneous array fixture across JSON inference, TypeScript, and JSON Schema", () => {
    const fromJson = parseSemanticFixture(stringArrayFixture, "json");
    const fromTypeScript = parseSemanticFixture(
      stringArrayFixture,
      "typescript",
    );
    const fromJsonSchema = parseSemanticFixture(
      stringArrayFixture,
      "json-schema",
    );

    expectShapeKind(fromJson.document, "array");
    expectShapeKind(fromTypeScript.document, "array");
    expectShapeKind(fromJsonSchema.document, "array");
    expectIrEquivalent(fromJson.document, stringArrayFixture.canonicalShape);
    expectIrEquivalent(
      fromTypeScript.document,
      stringArrayFixture.canonicalShape,
    );
    expectIrEquivalent(
      fromJsonSchema.document,
      stringArrayFixture.canonicalShape,
    );
  });

  it("parses the shared config-like fixture across JSON inference, TypeScript, and JSON Schema", () => {
    const fromJson = parseSemanticFixture(configLikeFixture, "json");
    const fromTypeScript = parseSemanticFixture(
      configLikeFixture,
      "typescript",
    );
    const fromJsonSchema = parseSemanticFixture(
      configLikeFixture,
      "json-schema",
    );

    expectShapeKind(fromJson.document, "object");
    expectShapeKind(fromTypeScript.document, "object");
    expectShapeKind(fromJsonSchema.document, "object");
    expectRequiredProperty(fromJson.document, "compilerOptions", "object");
    expectRequiredProperty(fromTypeScript.document, "include", "array");
    expectRequiredProperty(fromJsonSchema.document, "exclude", "array");
    expectIrEquivalent(fromJson.document, configLikeFixture.canonicalShape);
    expectIrEquivalent(
      fromTypeScript.document,
      configLikeFixture.canonicalShape,
    );
    expectIrEquivalent(
      fromJsonSchema.document,
      configLikeFixture.canonicalShape,
    );
  });

  it("parses the shared optional-property fixture from TypeScript", () => {
    const parsed = parseSemanticFixture(optionalPropertyFixture, "typescript");

    expectShapeKind(parsed.document, "object");
    expectOptionalProperty(parsed.document, "name", "scalar");
    expectIrEquivalent(parsed.document, optionalPropertyFixture.canonicalShape);
  });

  it("parses the shared optional-property fixture from JSON Schema", () => {
    const parsed = parseSemanticFixture(optionalPropertyFixture, "json-schema");

    expectShapeKind(parsed.document, "object");
    expectOptionalProperty(parsed.document, "name", "scalar");
    expectIrEquivalent(parsed.document, optionalPropertyFixture.canonicalShape);
  });

  it("parses the shared record fixture from both TypeScript and JSON Schema", () => {
    const fromTypeScript = parseSemanticFixture(
      stringRecordFixture,
      "typescript",
    );
    const fromJsonSchema = parseSemanticFixture(
      stringRecordFixture,
      "json-schema",
    );

    expectShapeKind(fromTypeScript.document, "record");
    expectShapeKind(fromJsonSchema.document, "record");
    expectIrEquivalent(
      fromTypeScript.document,
      stringRecordFixture.canonicalShape,
    );
    expectIrEquivalent(
      fromJsonSchema.document,
      stringRecordFixture.canonicalShape,
    );
  });

  it("parses the shared nullable-property fixture from TypeScript and JSON Schema", () => {
    const fromTypeScript = parseSemanticFixture(
      nullablePropertyFixture,
      "typescript",
    );
    const fromJsonSchema = parseSemanticFixture(
      nullablePropertyFixture,
      "json-schema",
    );

    expectShapeKind(fromTypeScript.document, "object");
    expectShapeKind(fromJsonSchema.document, "object");
    expectNullableProperty(fromTypeScript.document, "name", "scalar");
    expectNullableProperty(fromJsonSchema.document, "name", "scalar");
    expectIrEquivalent(
      fromTypeScript.document,
      nullablePropertyFixture.canonicalShape,
    );
    expectIrEquivalent(
      fromJsonSchema.document,
      nullablePropertyFixture.canonicalShape,
    );
    expectDiagnosticCode(
      fromJsonSchema.diagnostics,
      "json-schema-nullable-property-normalized",
    );
    expectSemanticNoteCode(
      fromJsonSchema.semanticNotes,
      "json-schema-nullable-property-normalized",
    );
  });

  it("parses the shared nested-object fixture from TypeScript and JSON Schema", () => {
    const fromTypeScript = parseSemanticFixture(
      nestedObjectFixture,
      "typescript",
    );
    const fromJsonSchema = parseSemanticFixture(
      nestedObjectFixture,
      "json-schema",
    );

    expectShapeKind(fromTypeScript.document, "object");
    expectShapeKind(fromJsonSchema.document, "object");
    expectRequiredProperty(fromTypeScript.document, "profile", "object");
    expectRequiredProperty(fromJsonSchema.document, "profile", "object");
    expectIrEquivalent(
      fromTypeScript.document,
      nestedObjectFixture.canonicalShape,
    );
    expectIrEquivalent(
      fromJsonSchema.document,
      nestedObjectFixture.canonicalShape,
    );
  });

  it("keeps optional and nullable presence semantics distinct within one shared fixture", () => {
    const fromTypeScript = parseSemanticFixture(
      optionalVsNullableFixture,
      "typescript",
    );
    const fromJsonSchema = parseSemanticFixture(
      optionalVsNullableFixture,
      "json-schema",
    );

    expectShapeKind(fromTypeScript.document, "object");
    expectShapeKind(fromJsonSchema.document, "object");
    expectOptionalProperty(fromTypeScript.document, "nickname", "scalar");
    expectOptionalProperty(fromJsonSchema.document, "nickname", "scalar");
    expectNullableProperty(fromTypeScript.document, "alias", "scalar");
    expectNullableProperty(fromJsonSchema.document, "alias", "scalar");
    expectIrEquivalent(
      fromTypeScript.document,
      optionalVsNullableFixture.canonicalShape,
    );
    expectIrEquivalent(
      fromJsonSchema.document,
      optionalVsNullableFixture.canonicalShape,
    );
    expectDiagnosticCode(
      fromJsonSchema.diagnostics,
      "json-schema-nullable-property-normalized",
    );
    expectSemanticNoteCode(
      fromJsonSchema.semanticNotes,
      "json-schema-nullable-property-normalized",
    );
  });

  it("parses the shared optional tuple fixture from TypeScript and JSON Schema", () => {
    const fromTypeScript = parseSemanticFixture(
      optionalTupleFixture,
      "typescript",
    );
    const fromJsonSchema = parseSemanticFixture(
      optionalTupleFixture,
      "json-schema",
    );

    expectShapeKind(fromTypeScript.document, "tuple");
    expectShapeKind(fromJsonSchema.document, "tuple");
    expectTupleElementKinds(fromTypeScript.document, [
      { kind: "scalar", required: true },
      { kind: "scalar", required: false },
    ]);
    expectTupleElementKinds(fromJsonSchema.document, [
      { kind: "scalar", required: true },
      { kind: "scalar", required: false },
    ]);
    expectIrEquivalent(
      fromTypeScript.document,
      optionalTupleFixture.canonicalShape,
    );
    expectIrEquivalent(
      fromJsonSchema.document,
      optionalTupleFixture.canonicalShape,
    );
  });

  it("parses the shared unknown-root fixture from JSON Schema with explicit widening diagnostics", () => {
    const parsed = parseSemanticFixture(unknownRootFixture, "json-schema");

    expectUnknownRoot(parsed.document, {
      nullable: false,
      reason: "no-evidence",
    });
    expectIrEquivalent(parsed.document, unknownRootFixture.canonicalShape);
    expectDiagnosticCode(parsed.diagnostics, "json-schema-true-schema-lowered");
    expectSemanticNoteCode(
      parsed.semanticNotes,
      "json-schema-true-schema-lowered",
    );
  });

  it("parses the shared local-reference fixture from TypeScript and JSON Schema", () => {
    const fromTypeScript = parseSemanticFixture(
      localReferenceFixture,
      "typescript",
    );
    const fromJsonSchema = parseSemanticFixture(
      localReferenceFixture,
      "json-schema",
    );

    expectReference(fromTypeScript.document, "Response");
    expectReference(fromJsonSchema.document, "Response");
    expectObjectFieldReference(fromTypeScript.document, "user", "User");
    expectObjectFieldReference(fromJsonSchema.document, "user", "User");
    expectIrEquivalent(
      fromTypeScript.document,
      localReferenceFixture.canonicalShape,
    );
    expectIrEquivalent(
      fromJsonSchema.document,
      localReferenceFixture.canonicalShape,
    );
  });

  it("parses the shared primitive and literal union fixtures from TypeScript and JSON Schema", () => {
    const primitiveUnionFromTypeScript = parseSemanticFixture(
      primitiveUnionFixture,
      "typescript",
    );
    const primitiveUnionFromJsonSchema = parseSemanticFixture(
      primitiveUnionFixture,
      "json-schema",
    );
    const literalUnionFromTypeScript = parseSemanticFixture(
      literalUnionFixture,
      "typescript",
    );
    const literalUnionFromJsonSchema = parseSemanticFixture(
      literalUnionFixture,
      "json-schema",
    );

    expectShapeKind(primitiveUnionFromTypeScript.document, "union");
    expectShapeKind(primitiveUnionFromJsonSchema.document, "union");
    expectShapeKind(literalUnionFromTypeScript.document, "union");
    expectShapeKind(literalUnionFromJsonSchema.document, "union");

    expectIrEquivalent(
      primitiveUnionFromTypeScript.document,
      primitiveUnionFixture.canonicalShape,
    );
    expectIrEquivalent(
      primitiveUnionFromJsonSchema.document,
      primitiveUnionFixture.canonicalShape,
    );
    expectIrEquivalent(
      literalUnionFromTypeScript.document,
      literalUnionFixture.canonicalShape,
    );
    expectIrEquivalent(
      literalUnionFromJsonSchema.document,
      literalUnionFixture.canonicalShape,
    );
  });

  it("parses the shared shared-reference fixture from TypeScript and JSON Schema", () => {
    const fromTypeScript = parseSemanticFixture(
      sharedReferenceFixture,
      "typescript",
    );
    const fromJsonSchema = parseSemanticFixture(
      sharedReferenceFixture,
      "json-schema",
    );

    expectReference(fromTypeScript.document, "AuditEnvelope");
    expectReference(fromJsonSchema.document, "AuditEnvelope");
    expectObjectFieldReference(fromTypeScript.document, "actor", "User");
    expectObjectFieldReference(fromTypeScript.document, "subject", "User");
    expectObjectFieldReference(fromJsonSchema.document, "actor", "User");
    expectObjectFieldReference(fromJsonSchema.document, "subject", "User");
    expectIrEquivalent(
      fromTypeScript.document,
      sharedReferenceFixture.canonicalShape,
    );
    expectIrEquivalent(
      fromJsonSchema.document,
      sharedReferenceFixture.canonicalShape,
    );
  });

  it("parses the shared recursive-reference fixture from TypeScript and JSON Schema", () => {
    const fromTypeScript = parseSemanticFixture(
      recursiveReferenceFixture,
      "typescript",
    );
    const fromJsonSchema = parseSemanticFixture(
      recursiveReferenceFixture,
      "json-schema",
    );

    expectReference(fromTypeScript.document, "Tree");
    expectReference(fromJsonSchema.document, "Tree");
    expectArrayFieldElementReference(
      fromTypeScript.document,
      "children",
      "Tree",
    );
    expectArrayFieldElementReference(
      fromJsonSchema.document,
      "children",
      "Tree",
    );
    expectIrEquivalent(
      fromTypeScript.document,
      recursiveReferenceFixture.canonicalShape,
    );
    expectIrEquivalent(
      fromJsonSchema.document,
      recursiveReferenceFixture.canonicalShape,
    );
  });

  it("parses the shared record-array-reference-union fixture from TypeScript and JSON Schema", () => {
    const fromTypeScript = parseSemanticFixture(
      recordArrayReferenceUnionFixture,
      "typescript",
    );
    const fromJsonSchema = parseSemanticFixture(
      recordArrayReferenceUnionFixture,
      "json-schema",
    );

    expectReference(fromTypeScript.document, "GroupedUsers");
    expectReference(fromJsonSchema.document, "GroupedUsers");
    expectRequiredProperty(fromTypeScript.document, "grouped", "record");
    expectRequiredProperty(fromJsonSchema.document, "grouped", "record");
    expectIrEquivalent(
      fromTypeScript.document,
      recordArrayReferenceUnionFixture.canonicalShape,
    );
    expectIrEquivalent(
      fromJsonSchema.document,
      recordArrayReferenceUnionFixture.canonicalShape,
    );
  });

  it("parses the shared tuple-nullable-reference fixture from TypeScript and JSON Schema", () => {
    const fromTypeScript = parseSemanticFixture(
      tupleNullableReferenceFixture,
      "typescript",
    );
    const fromJsonSchema = parseSemanticFixture(
      tupleNullableReferenceFixture,
      "json-schema",
    );

    expectReference(fromTypeScript.document, "TupleEnvelope");
    expectReference(fromJsonSchema.document, "TupleEnvelope");
    expectRequiredProperty(fromTypeScript.document, "pair", "tuple");
    expectRequiredProperty(fromJsonSchema.document, "pair", "tuple");
    expectIrEquivalent(
      fromTypeScript.document,
      tupleNullableReferenceFixture.canonicalShape,
    );
    expectIrEquivalent(
      fromJsonSchema.document,
      tupleNullableReferenceFixture.canonicalShape,
    );
  });

  it("parses the shared multi-level definition graph fixture from TypeScript and JSON Schema", () => {
    const fromTypeScript = parseSemanticFixture(
      multiLevelDefinitionGraphFixture,
      "typescript",
    );
    const fromJsonSchema = parseSemanticFixture(
      multiLevelDefinitionGraphFixture,
      "json-schema",
    );

    expectReference(fromTypeScript.document, "UserConnection");
    expectReference(fromJsonSchema.document, "UserConnection");
    expectIrEquivalent(
      fromTypeScript.document,
      multiLevelDefinitionGraphFixture.canonicalShape,
    );
    expectIrEquivalent(
      fromJsonSchema.document,
      multiLevelDefinitionGraphFixture.canonicalShape,
    );
  });

  it("parses the shared paginated response fixture from TypeScript and JSON Schema", () => {
    const fromTypeScript = parseSemanticFixture(
      paginatedResponseFixture,
      "typescript",
    );
    const fromJsonSchema = parseSemanticFixture(
      paginatedResponseFixture,
      "json-schema",
    );

    expectReference(fromTypeScript.document, "UserPage");
    expectReference(fromJsonSchema.document, "UserPage");
    expectIrEquivalent(
      fromTypeScript.document,
      paginatedResponseFixture.canonicalShape,
    );
    expectIrEquivalent(
      fromJsonSchema.document,
      paginatedResponseFixture.canonicalShape,
    );
  });

  it("parses the shared record-tuple-reference fixture from TypeScript and JSON Schema", () => {
    const fromTypeScript = parseSemanticFixture(
      recordTupleReferenceFixture,
      "typescript",
    );
    const fromJsonSchema = parseSemanticFixture(
      recordTupleReferenceFixture,
      "json-schema",
    );

    expectReference(fromTypeScript.document, "GroupedPairs");
    expectReference(fromJsonSchema.document, "GroupedPairs");
    expectIrEquivalent(
      fromTypeScript.document,
      recordTupleReferenceFixture.canonicalShape,
    );
    expectIrEquivalent(
      fromJsonSchema.document,
      recordTupleReferenceFixture.canonicalShape,
    );
  });

  it("supports direct diagnostic and semantic-note code assertions for future fixture migrations", () => {
    const result = typeScriptParser.parse(
      "type Maybe<T> = T extends string ? T : never",
      {
        entry: "Maybe",
        name: "Maybe",
      },
    );

    expect(result.ok).toBe(false);

    if (result.ok) {
      throw new Error("Expected unsupported conditional type parsing to fail.");
    }

    expectDiagnosticCode(
      result.diagnostics,
      "unsupported-typescript-conditional-type",
    );
  });

  it("can assert parser policy notes without repeating full-object matches", () => {
    const result = typeScriptParser.parse("type User = { id: number }");

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error("Expected implicit entry inference to succeed.");
    }

    expectSemanticNoteCode(
      result.semanticNotes,
      "typescript-implicit-entry-selected",
    );
    expect(result.document.name.source).toBe("TypeScriptDocument");
  });
});

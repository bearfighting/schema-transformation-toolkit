import { describe, expect, it } from "vitest";
import {
  selectEquivalenceFixtures,
  sharedSemanticFixtures,
} from "../fixtures/semantics/index.js";
import {
  expectArrayFieldElementReference,
  expectIrEquivalent,
  expectNullableProperty,
  expectObjectFieldReference,
  expectOptionalProperty,
  expectTupleElementKinds,
  expectShapeKind,
} from "../helpers/schema-equivalence.js";
import { parseSemanticFixture } from "../helpers/semantic-fixture-parser.js";

const typescriptJsonSchemaEquivalenceFixtures = selectEquivalenceFixtures(
  sharedSemanticFixtures,
  "typescript",
  "json-schema",
);

describe("equivalence: typescript <-> json-schema", () => {
  it("selects the expected first-wave fixture set", () => {
    expect(
      typescriptJsonSchemaEquivalenceFixtures.map((fixture) => fixture.id),
    ).toEqual([
      "primitive.string",
      "object.required-property",
      "collection.array",
      "object.optional-property",
      "collection.record",
      "object.nullable-property",
      "object.nested-object",
      "union.optional-vs-nullable",
      "collection.optional-tuple-member",
      "reference.local-reference",
      "union.primitive-union",
      "union.literal-union",
      "reference.shared-reference",
      "reference.recursive-reference",
      "collection.record-array-reference-union",
      "collection.tuple-nullable-reference",
      "reference.multi-level-definition-graph",
      "collection.record-tuple-reference",
      "reference.paginated-response",
      "object.config-like",
    ]);
  });

  for (const fixture of typescriptJsonSchemaEquivalenceFixtures) {
    it(`keeps ${fixture.id} semantically equivalent across both parsers`, () => {
      const fromTypeScript = parseSemanticFixture(fixture, "typescript");
      const fromJsonSchema = parseSemanticFixture(fixture, "json-schema");

      expectIrEquivalent(fromTypeScript.document, fixture.canonicalShape);
      expectIrEquivalent(fromJsonSchema.document, fixture.canonicalShape);
      expectIrEquivalent(fromTypeScript.document, fromJsonSchema.document);
    });
  }

  it("keeps optional and nullable object semantics distinct across both parsers", () => {
    const optionalFromTypeScript = parseSemanticFixture(
      sharedSemanticFixtures.find(
        (fixture) => fixture.id === "object.optional-property",
      )!,
      "typescript",
    );
    const optionalFromJsonSchema = parseSemanticFixture(
      sharedSemanticFixtures.find(
        (fixture) => fixture.id === "object.optional-property",
      )!,
      "json-schema",
    );
    const nullableFromTypeScript = parseSemanticFixture(
      sharedSemanticFixtures.find(
        (fixture) => fixture.id === "object.nullable-property",
      )!,
      "typescript",
    );
    const nullableFromJsonSchema = parseSemanticFixture(
      sharedSemanticFixtures.find(
        (fixture) => fixture.id === "object.nullable-property",
      )!,
      "json-schema",
    );

    expectShapeKind(optionalFromTypeScript.document, "object");
    expectShapeKind(optionalFromJsonSchema.document, "object");
    expectShapeKind(nullableFromTypeScript.document, "object");
    expectShapeKind(nullableFromJsonSchema.document, "object");

    expectOptionalProperty(optionalFromTypeScript.document, "name", "scalar");
    expectOptionalProperty(optionalFromJsonSchema.document, "name", "scalar");
    expectNullableProperty(nullableFromTypeScript.document, "name", "scalar");
    expectNullableProperty(nullableFromJsonSchema.document, "name", "scalar");
  });

  it("keeps required properties, nested objects, and homogeneous arrays aligned across both parsers", () => {
    const requiredFromTypeScript = parseSemanticFixture(
      sharedSemanticFixtures.find(
        (fixture) => fixture.id === "object.required-property",
      )!,
      "typescript",
    );
    const requiredFromJsonSchema = parseSemanticFixture(
      sharedSemanticFixtures.find(
        (fixture) => fixture.id === "object.required-property",
      )!,
      "json-schema",
    );
    const nestedFromTypeScript = parseSemanticFixture(
      sharedSemanticFixtures.find(
        (fixture) => fixture.id === "object.nested-object",
      )!,
      "typescript",
    );
    const nestedFromJsonSchema = parseSemanticFixture(
      sharedSemanticFixtures.find(
        (fixture) => fixture.id === "object.nested-object",
      )!,
      "json-schema",
    );
    const arrayFromTypeScript = parseSemanticFixture(
      sharedSemanticFixtures.find(
        (fixture) => fixture.id === "collection.array",
      )!,
      "typescript",
    );
    const arrayFromJsonSchema = parseSemanticFixture(
      sharedSemanticFixtures.find(
        (fixture) => fixture.id === "collection.array",
      )!,
      "json-schema",
    );

    expectShapeKind(requiredFromTypeScript.document, "object");
    expectShapeKind(requiredFromJsonSchema.document, "object");
    expectShapeKind(nestedFromTypeScript.document, "object");
    expectShapeKind(nestedFromJsonSchema.document, "object");
    expectShapeKind(arrayFromTypeScript.document, "array");
    expectShapeKind(arrayFromJsonSchema.document, "array");

    expectIrEquivalent(
      requiredFromTypeScript.document,
      requiredFromJsonSchema.document,
    );
    expectIrEquivalent(
      nestedFromTypeScript.document,
      nestedFromJsonSchema.document,
    );
    expectIrEquivalent(
      arrayFromTypeScript.document,
      arrayFromJsonSchema.document,
    );
  });

  it("keeps tuple optionality and local references aligned across both parsers", () => {
    const tupleFromTypeScript = parseSemanticFixture(
      sharedSemanticFixtures.find(
        (fixture) => fixture.id === "collection.optional-tuple-member",
      )!,
      "typescript",
    );
    const tupleFromJsonSchema = parseSemanticFixture(
      sharedSemanticFixtures.find(
        (fixture) => fixture.id === "collection.optional-tuple-member",
      )!,
      "json-schema",
    );
    const referenceFromTypeScript = parseSemanticFixture(
      sharedSemanticFixtures.find(
        (fixture) => fixture.id === "reference.local-reference",
      )!,
      "typescript",
    );
    const referenceFromJsonSchema = parseSemanticFixture(
      sharedSemanticFixtures.find(
        (fixture) => fixture.id === "reference.local-reference",
      )!,
      "json-schema",
    );

    expectTupleElementKinds(tupleFromTypeScript.document, [
      { kind: "scalar", required: true },
      { kind: "scalar", required: false },
    ]);
    expectTupleElementKinds(tupleFromJsonSchema.document, [
      { kind: "scalar", required: true },
      { kind: "scalar", required: false },
    ]);

    expectObjectFieldReference(
      referenceFromTypeScript.document,
      "user",
      "User",
    );
    expectObjectFieldReference(
      referenceFromJsonSchema.document,
      "user",
      "User",
    );
  });

  it("keeps unions, shared references, and recursive references aligned across both parsers", () => {
    const primitiveUnionFromTypeScript = parseSemanticFixture(
      sharedSemanticFixtures.find(
        (fixture) => fixture.id === "union.primitive-union",
      )!,
      "typescript",
    );
    const primitiveUnionFromJsonSchema = parseSemanticFixture(
      sharedSemanticFixtures.find(
        (fixture) => fixture.id === "union.primitive-union",
      )!,
      "json-schema",
    );
    const literalUnionFromTypeScript = parseSemanticFixture(
      sharedSemanticFixtures.find(
        (fixture) => fixture.id === "union.literal-union",
      )!,
      "typescript",
    );
    const literalUnionFromJsonSchema = parseSemanticFixture(
      sharedSemanticFixtures.find(
        (fixture) => fixture.id === "union.literal-union",
      )!,
      "json-schema",
    );
    const sharedReferenceFromTypeScript = parseSemanticFixture(
      sharedSemanticFixtures.find(
        (fixture) => fixture.id === "reference.shared-reference",
      )!,
      "typescript",
    );
    const sharedReferenceFromJsonSchema = parseSemanticFixture(
      sharedSemanticFixtures.find(
        (fixture) => fixture.id === "reference.shared-reference",
      )!,
      "json-schema",
    );
    const recursiveReferenceFromTypeScript = parseSemanticFixture(
      sharedSemanticFixtures.find(
        (fixture) => fixture.id === "reference.recursive-reference",
      )!,
      "typescript",
    );
    const recursiveReferenceFromJsonSchema = parseSemanticFixture(
      sharedSemanticFixtures.find(
        (fixture) => fixture.id === "reference.recursive-reference",
      )!,
      "json-schema",
    );

    expectShapeKind(primitiveUnionFromTypeScript.document, "union");
    expectShapeKind(primitiveUnionFromJsonSchema.document, "union");
    expectShapeKind(literalUnionFromTypeScript.document, "union");
    expectShapeKind(literalUnionFromJsonSchema.document, "union");

    expectObjectFieldReference(
      sharedReferenceFromTypeScript.document,
      "actor",
      "User",
    );
    expectObjectFieldReference(
      sharedReferenceFromTypeScript.document,
      "subject",
      "User",
    );
    expectObjectFieldReference(
      sharedReferenceFromJsonSchema.document,
      "actor",
      "User",
    );
    expectObjectFieldReference(
      sharedReferenceFromJsonSchema.document,
      "subject",
      "User",
    );

    expectArrayFieldElementReference(
      recursiveReferenceFromTypeScript.document,
      "children",
      "Tree",
    );
    expectArrayFieldElementReference(
      recursiveReferenceFromJsonSchema.document,
      "children",
      "Tree",
    );
  });

  it("keeps composite record-array-union and tuple-reference structures aligned across both parsers", () => {
    const recordArrayFromTypeScript = parseSemanticFixture(
      sharedSemanticFixtures.find(
        (fixture) => fixture.id === "collection.record-array-reference-union",
      )!,
      "typescript",
    );
    const recordArrayFromJsonSchema = parseSemanticFixture(
      sharedSemanticFixtures.find(
        (fixture) => fixture.id === "collection.record-array-reference-union",
      )!,
      "json-schema",
    );
    const tupleReferenceFromTypeScript = parseSemanticFixture(
      sharedSemanticFixtures.find(
        (fixture) => fixture.id === "collection.tuple-nullable-reference",
      )!,
      "typescript",
    );
    const tupleReferenceFromJsonSchema = parseSemanticFixture(
      sharedSemanticFixtures.find(
        (fixture) => fixture.id === "collection.tuple-nullable-reference",
      )!,
      "json-schema",
    );

    expectShapeKind(recordArrayFromTypeScript.document, "object");
    expectShapeKind(recordArrayFromJsonSchema.document, "object");
    expectShapeKind(tupleReferenceFromTypeScript.document, "object");
    expectShapeKind(tupleReferenceFromJsonSchema.document, "object");

    expectIrEquivalent(
      recordArrayFromTypeScript.document,
      recordArrayFromJsonSchema.document,
    );
    expectIrEquivalent(
      tupleReferenceFromTypeScript.document,
      tupleReferenceFromJsonSchema.document,
    );
  });

  it("keeps multi-level definition graphs and record-tuple-reference structures aligned across both parsers", () => {
    const multiLevelFromTypeScript = parseSemanticFixture(
      sharedSemanticFixtures.find(
        (fixture) => fixture.id === "reference.multi-level-definition-graph",
      )!,
      "typescript",
    );
    const multiLevelFromJsonSchema = parseSemanticFixture(
      sharedSemanticFixtures.find(
        (fixture) => fixture.id === "reference.multi-level-definition-graph",
      )!,
      "json-schema",
    );
    const recordTupleFromTypeScript = parseSemanticFixture(
      sharedSemanticFixtures.find(
        (fixture) => fixture.id === "collection.record-tuple-reference",
      )!,
      "typescript",
    );
    const recordTupleFromJsonSchema = parseSemanticFixture(
      sharedSemanticFixtures.find(
        (fixture) => fixture.id === "collection.record-tuple-reference",
      )!,
      "json-schema",
    );

    expectIrEquivalent(
      multiLevelFromTypeScript.document,
      multiLevelFromJsonSchema.document,
    );
    expectIrEquivalent(
      recordTupleFromTypeScript.document,
      recordTupleFromJsonSchema.document,
    );
  });

  it("keeps paginated response and config-like structures aligned across both parsers", () => {
    const paginatedFromTypeScript = parseSemanticFixture(
      sharedSemanticFixtures.find(
        (fixture) => fixture.id === "reference.paginated-response",
      )!,
      "typescript",
    );
    const paginatedFromJsonSchema = parseSemanticFixture(
      sharedSemanticFixtures.find(
        (fixture) => fixture.id === "reference.paginated-response",
      )!,
      "json-schema",
    );
    const configFromTypeScript = parseSemanticFixture(
      sharedSemanticFixtures.find(
        (fixture) => fixture.id === "object.config-like",
      )!,
      "typescript",
    );
    const configFromJsonSchema = parseSemanticFixture(
      sharedSemanticFixtures.find(
        (fixture) => fixture.id === "object.config-like",
      )!,
      "json-schema",
    );

    expectIrEquivalent(
      paginatedFromTypeScript.document,
      paginatedFromJsonSchema.document,
    );
    expectIrEquivalent(
      configFromTypeScript.document,
      configFromJsonSchema.document,
    );
  });

  it("keeps combined optional-vs-nullable semantics aligned across both parsers", () => {
    const fromTypeScript = parseSemanticFixture(
      sharedSemanticFixtures.find(
        (fixture) => fixture.id === "union.optional-vs-nullable",
      )!,
      "typescript",
    );
    const fromJsonSchema = parseSemanticFixture(
      sharedSemanticFixtures.find(
        (fixture) => fixture.id === "union.optional-vs-nullable",
      )!,
      "json-schema",
    );

    expectOptionalProperty(fromTypeScript.document, "nickname", "scalar");
    expectOptionalProperty(fromJsonSchema.document, "nickname", "scalar");
    expectNullableProperty(fromTypeScript.document, "alias", "scalar");
    expectNullableProperty(fromJsonSchema.document, "alias", "scalar");
    expectIrEquivalent(fromTypeScript.document, fromJsonSchema.document);
  });
});

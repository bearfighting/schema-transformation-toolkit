import { describe, it } from "vitest";
import {
  arrayMinItemsConstraintFixture,
  closedObjectConstraintFixture,
  collectionConstraintBundleFixture,
  descriptionAnnotationFixture,
  numericMinimumConstraintFixture,
  referencedDescriptionAnnotationFixture,
  referencedMinLengthConstraintFixture,
  stringAnnotationBundleFixture,
  stringMinLengthConstraintFixture,
} from "./semantics/index.js";
import { expectSemanticNoteCode } from "../helpers/diagnostic-assertions.js";
import { expectConstraint } from "../helpers/constraint-assertions.js";
import { parseSemanticFixture } from "../helpers/semantic-fixture-parser.js";
import {
  expectIrEquivalent,
  expectReference,
  expectShapeKind,
} from "../helpers/schema-equivalence.js";

describe("semantic constraint fixture foundation", () => {
  it("parses the shared min-length constraint fixture from JSON Schema", () => {
    const parsed = parseSemanticFixture(
      stringMinLengthConstraintFixture,
      "json-schema",
    );

    expectShapeKind(parsed.document, "object");
    expectIrEquivalent(
      parsed.document,
      stringMinLengthConstraintFixture.canonicalShape,
    );
    expectConstraint(parsed.constraints, {
      path: ["root", "code"],
      kind: "min-length",
      value: 2,
    });
    expectSemanticNoteCode(
      parsed.semanticNotes,
      "json-schema-min-length-extracted",
    );
  });

  it("parses the shared referenced min-length constraint fixture from JSON Schema", () => {
    const parsed = parseSemanticFixture(
      referencedMinLengthConstraintFixture,
      "json-schema",
    );

    expectReference(parsed.document, "Response");
    expectIrEquivalent(
      parsed.document,
      referencedMinLengthConstraintFixture.canonicalShape,
    );
    expectConstraint(parsed.constraints, {
      path: ["definitions", "User", "code"],
      kind: "min-length",
      value: 2,
    });
    expectSemanticNoteCode(
      parsed.semanticNotes,
      "json-schema-min-length-extracted",
    );
  });

  it("parses the shared closed-object constraint fixture from JSON Schema", () => {
    const parsed = parseSemanticFixture(
      closedObjectConstraintFixture,
      "json-schema",
    );

    expectShapeKind(parsed.document, "object");
    expectIrEquivalent(
      parsed.document,
      closedObjectConstraintFixture.canonicalShape,
    );
    expectConstraint(parsed.constraints, {
      path: ["root"],
      kind: "closed-object",
      value: false,
    });
    expectSemanticNoteCode(
      parsed.semanticNotes,
      "json-schema-closed-object-extracted",
    );
  });

  it("parses the shared description annotation fixture from JSON Schema", () => {
    const parsed = parseSemanticFixture(
      descriptionAnnotationFixture,
      "json-schema",
    );

    expectShapeKind(parsed.document, "object");
    expectIrEquivalent(
      parsed.document,
      descriptionAnnotationFixture.canonicalShape,
    );
    expectConstraint(parsed.constraints, {
      path: ["root"],
      kind: "description",
      value: "User constraints",
    });
    expectSemanticNoteCode(
      parsed.semanticNotes,
      "json-schema-description-extracted",
    );
  });

  it("parses the shared string annotation bundle fixture from JSON Schema", () => {
    const parsed = parseSemanticFixture(
      stringAnnotationBundleFixture,
      "json-schema",
    );

    expectShapeKind(parsed.document, "object");
    expectIrEquivalent(
      parsed.document,
      stringAnnotationBundleFixture.canonicalShape,
    );
    expectConstraint(parsed.constraints, {
      path: ["root", "code"],
      kind: "pattern",
      value: "^[A-Z]+$",
    });
    expectConstraint(parsed.constraints, {
      path: ["root", "code"],
      kind: "max-length",
      value: 8,
    });
    expectConstraint(parsed.constraints, {
      path: ["root", "code"],
      kind: "default",
      value: "ABCD",
    });
    expectConstraint(parsed.constraints, {
      path: ["root", "code"],
      kind: "examples",
      value: ["EFGH"],
    });
    expectConstraint(parsed.constraints, {
      path: ["root", "code"],
      kind: "read-only",
      value: true,
    });
    expectConstraint(parsed.constraints, {
      path: ["root", "code"],
      kind: "description",
      value: "Uppercase code",
    });
    expectSemanticNoteCode(
      parsed.semanticNotes,
      "json-schema-pattern-extracted",
    );
    expectSemanticNoteCode(
      parsed.semanticNotes,
      "json-schema-max-length-extracted",
    );
    expectSemanticNoteCode(
      parsed.semanticNotes,
      "json-schema-default-extracted",
    );
    expectSemanticNoteCode(
      parsed.semanticNotes,
      "json-schema-examples-extracted",
    );
    expectSemanticNoteCode(
      parsed.semanticNotes,
      "json-schema-read-only-extracted",
    );
    expectSemanticNoteCode(
      parsed.semanticNotes,
      "json-schema-description-extracted",
    );
  });

  it("parses the shared referenced description annotation fixture from JSON Schema", () => {
    const parsed = parseSemanticFixture(
      referencedDescriptionAnnotationFixture,
      "json-schema",
    );

    expectReference(parsed.document, "Response");
    expectIrEquivalent(
      parsed.document,
      referencedDescriptionAnnotationFixture.canonicalShape,
    );
    expectConstraint(parsed.constraints, {
      path: ["definitions", "User"],
      kind: "description",
      value: "Reusable user definition",
    });
    expectConstraint(parsed.constraints, {
      path: ["definitions", "User", "code"],
      kind: "description",
      value: "User code",
    });
    expectSemanticNoteCode(
      parsed.semanticNotes,
      "json-schema-description-extracted",
    );
  });

  it("parses the shared numeric minimum constraint fixture from JSON Schema", () => {
    const parsed = parseSemanticFixture(
      numericMinimumConstraintFixture,
      "json-schema",
    );

    expectShapeKind(parsed.document, "object");
    expectIrEquivalent(
      parsed.document,
      numericMinimumConstraintFixture.canonicalShape,
    );
    expectConstraint(parsed.constraints, {
      path: ["root", "score"],
      kind: "minimum",
      value: 0,
    });
    expectSemanticNoteCode(
      parsed.semanticNotes,
      "json-schema-minimum-extracted",
    );
  });

  it("parses the shared array min-items constraint fixture from JSON Schema", () => {
    const parsed = parseSemanticFixture(
      arrayMinItemsConstraintFixture,
      "json-schema",
    );

    expectShapeKind(parsed.document, "object");
    expectIrEquivalent(
      parsed.document,
      arrayMinItemsConstraintFixture.canonicalShape,
    );
    expectConstraint(parsed.constraints, {
      path: ["root", "tags"],
      kind: "min-items",
      value: 1,
    });
    expectSemanticNoteCode(
      parsed.semanticNotes,
      "json-schema-min-items-extracted",
    );
  });

  it("parses the shared collection constraint bundle fixture from JSON Schema", () => {
    const parsed = parseSemanticFixture(
      collectionConstraintBundleFixture,
      "json-schema",
    );

    expectShapeKind(parsed.document, "object");
    expectIrEquivalent(
      parsed.document,
      collectionConstraintBundleFixture.canonicalShape,
    );
    expectConstraint(parsed.constraints, {
      path: ["root", "tags"],
      kind: "min-items",
      value: 1,
    });
    expectConstraint(parsed.constraints, {
      path: ["root", "tags"],
      kind: "max-items",
      value: 3,
    });
    expectConstraint(parsed.constraints, {
      path: ["root", "tags"],
      kind: "unique-items",
      value: true,
    });
    expectConstraint(parsed.constraints, {
      path: ["root", "tags"],
      kind: "description",
      value: "User tags",
    });
    expectSemanticNoteCode(
      parsed.semanticNotes,
      "json-schema-min-items-extracted",
    );
    expectSemanticNoteCode(
      parsed.semanticNotes,
      "json-schema-max-items-extracted",
    );
    expectSemanticNoteCode(
      parsed.semanticNotes,
      "json-schema-unique-items-extracted",
    );
    expectSemanticNoteCode(
      parsed.semanticNotes,
      "json-schema-description-extracted",
    );
  });
});

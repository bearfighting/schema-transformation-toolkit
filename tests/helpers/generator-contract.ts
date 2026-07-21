import type { ConstraintDocument, SchemaDocument } from "@aio/core";
import type { SemanticFixture } from "../fixtures/semantics/types.js";

export function getFixtureDocument(fixture: SemanticFixture): SchemaDocument {
  return fixture.canonicalShape;
}

export function getFixtureConstraints(
  fixture: SemanticFixture,
): ConstraintDocument | undefined {
  return fixture.canonicalConstraints;
}

export function getRequiredFixtureConstraints(
  fixture: SemanticFixture,
): ConstraintDocument {
  const constraints = fixture.canonicalConstraints;

  if (!constraints) {
    throw new Error(
      `Expected semantic fixture "${fixture.id}" to define constraint IR.`,
    );
  }

  return constraints;
}

export function findFixture(
  fixtures: SemanticFixture[],
  fixtureId: string,
): SemanticFixture {
  const fixture = fixtures.find((candidate) => candidate.id === fixtureId);

  if (!fixture) {
    throw new Error(`Expected semantic fixture "${fixtureId}" to exist.`);
  }

  return fixture;
}

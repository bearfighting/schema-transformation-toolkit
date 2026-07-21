import type {
  SemanticFixture,
  SemanticFixtureFormatId,
  SemanticFixtureSupportLevel,
} from "./types.js";

const NON_EQUIVALENCE_SUPPORT_LEVELS = new Set<SemanticFixtureSupportLevel>([
  "unsupported",
  "not-applicable",
  "lossy",
  "lowered",
]);

export function supportsEquivalenceFormat(
  fixture: SemanticFixture,
  formatId: SemanticFixtureFormatId,
): boolean {
  const supportLevel = fixture.support[formatId];

  return (
    supportLevel !== undefined &&
    !NON_EQUIVALENCE_SUPPORT_LEVELS.has(supportLevel)
  );
}

export function selectEquivalenceFixtures(
  fixtures: SemanticFixture[],
  leftFormat: SemanticFixtureFormatId,
  rightFormat: SemanticFixtureFormatId,
): SemanticFixture[] {
  return fixtures.filter(
    (fixture) =>
      supportsEquivalenceFormat(fixture, leftFormat) &&
      supportsEquivalenceFormat(fixture, rightFormat),
  );
}

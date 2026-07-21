import type {
  ConversionCapability,
  GeneratorCapabilities,
  ParserCapabilities,
} from "@aio/core";
import type {
  SemanticFixture,
  SemanticFixtureCoverageSubject,
} from "../fixtures/semantics/types.js";

export function coveredCapabilitiesForSubject(
  fixtures: SemanticFixture[],
  subject: SemanticFixtureCoverageSubject,
): ConversionCapability[] {
  return [...collectCapabilities(fixtures, subject)].sort();
}

export function missingParserCapabilities(
  fixtures: SemanticFixture[],
  parserCapabilities: ParserCapabilities,
): ConversionCapability[] {
  const coveredCapabilities = collectCapabilities(
    fixtures,
    parserCapabilities.format as SemanticFixtureCoverageSubject,
  );

  return parserCapabilities.capabilities
    .filter((capability) => !coveredCapabilities.has(capability))
    .sort();
}

export function missingGeneratorCapabilities(
  fixtures: SemanticFixture[],
  generatorCapabilities: GeneratorCapabilities,
): ConversionCapability[] {
  const coveredCapabilities = collectCapabilities(
    fixtures,
    `generator:${generatorCapabilities.target}` as SemanticFixtureCoverageSubject,
  );

  return generatorCapabilities.supportsCapabilities
    .filter((capability) => !coveredCapabilities.has(capability))
    .sort();
}

function collectCapabilities(
  fixtures: SemanticFixture[],
  subject: SemanticFixtureCoverageSubject,
): Set<ConversionCapability> {
  return new Set(
    fixtures.flatMap((fixture) => fixture.capabilityCoverage?.[subject] ?? []),
  );
}

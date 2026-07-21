import { expect } from "vitest";

export interface SemanticCaveatLike {
  code: string;
}

export interface SemanticLossLike {
  code: string;
  lostCapability: string;
  sourcePath?: string[];
}

export function expectSemanticCaveatCodes(
  semanticCaveats: SemanticCaveatLike[] | undefined,
  codes: string[],
): void {
  expect(semanticCaveats).toBeDefined();

  const actualCodes = semanticCaveats?.map((caveat) => caveat.code) ?? [];

  for (const code of codes) {
    expect(actualCodes).toContain(code);
  }
}

export function expectSemanticLosses(
  losses: SemanticLossLike[] | undefined,
  expectedLosses: Array<{
    lostCapability: string;
    sourcePath: string[];
  }>,
): void {
  expect(losses).toBeDefined();

  const actual = (losses ?? []).map((loss) => ({
    code: loss.code,
    lostCapability: loss.lostCapability,
    sourcePath: loss.sourcePath ?? [],
  }));
  const normalize = (
    items: Array<{
      code: string;
      lostCapability: string;
      sourcePath: string[];
    }>,
  ) =>
    [...items].sort((left, right) =>
      `${left.lostCapability}:${left.sourcePath.join(".")}`.localeCompare(
        `${right.lostCapability}:${right.sourcePath.join(".")}`,
      ),
    );

  expect(normalize(actual)).toEqual(
    normalize(
      expectedLosses.map((loss) => ({
      code: "target-cannot-preserve-constraint",
      lostCapability: loss.lostCapability,
      sourcePath: loss.sourcePath,
      })),
    ),
  );
}

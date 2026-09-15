import type {
  GenerateOptions,
  PreparedOptions,
} from "@schema-transformation-toolkit/core";

export type CSharpGeneratorOptions = GenerateOptions;

export type ResolvedCSharpGeneratorOptions = Record<never, never>;

export const DEFAULT_CSHARP_GENERATOR_OPTIONS: ResolvedCSharpGeneratorOptions =
  {};

export function resolveCSharpGeneratorOptions(
  options: CSharpGeneratorOptions = {},
): ResolvedCSharpGeneratorOptions {
  void options;
  return DEFAULT_CSHARP_GENERATOR_OPTIONS;
}

export function validateCSharpGeneratorOptions(
  options: ResolvedCSharpGeneratorOptions,
): string[] {
  void options;
  return [];
}

export function prepareCSharpGeneratorOptions(
  options: CSharpGeneratorOptions = {},
): PreparedOptions<ResolvedCSharpGeneratorOptions> {
  const resolved = resolveCSharpGeneratorOptions(options);
  return {
    resolved,
    warnings: [],
    errors: validateCSharpGeneratorOptions(resolved),
  };
}

export function assertSupportedCSharpGeneratorOptions(
  options: ResolvedCSharpGeneratorOptions,
): void {
  const errors = validateCSharpGeneratorOptions(options);
  if (errors.length) throw new Error(errors.join("; "));
}

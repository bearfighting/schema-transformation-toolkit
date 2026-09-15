import type {
  ParseOptions,
  PreparedOptions,
} from "@schema-transformation-toolkit/core";
import { CSharpSemanticError } from "./failure.js";

export interface CSharpParserOptions extends ParseOptions {
  entry?: string;
}
export interface ResolvedCSharpParserOptions {
  name: string;
  entry?: string;
}
export const DEFAULT_CSHARP_PARSE_OPTIONS: ResolvedCSharpParserOptions = {
  name: "CSharpDocument",
};

export function resolveCSharpParseOptions(
  options: CSharpParserOptions = {},
): ResolvedCSharpParserOptions {
  return {
    name: options.name ?? DEFAULT_CSHARP_PARSE_OPTIONS.name,
    ...(options.entry !== undefined ? { entry: options.entry } : {}),
  };
}
export function validateCSharpParseOptions(
  options: ResolvedCSharpParserOptions,
): string[] {
  const errors: string[] = [];
  if (typeof options.name !== "string" || !options.name.trim())
    errors.push("name must be a non-empty string.");
  if (
    options.entry !== undefined &&
    (typeof options.entry !== "string" || !options.entry.trim())
  )
    errors.push("entry must not be empty.");
  return errors;
}
export function prepareCSharpParseOptions(
  options: CSharpParserOptions = {},
): PreparedOptions<ResolvedCSharpParserOptions> {
  const resolved = resolveCSharpParseOptions(options);
  return {
    resolved,
    warnings: [],
    errors: validateCSharpParseOptions(resolved),
  };
}
export function assertSupportedCSharpParseOptions(
  options: ResolvedCSharpParserOptions,
): void {
  const errors = validateCSharpParseOptions(options);
  if (errors.length)
    throw new CSharpSemanticError(
      "invalid-csharp-options",
      `Invalid C# parser options: ${errors.join("; ")}`,
    );
}

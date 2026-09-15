import type {
  GenerateOptions,
  PreparedOptions,
} from "@schema-transformation-toolkit/core";
import { CSharpGenerationError } from "./failure.js";

export interface CSharpGeneratorOptions extends GenerateOptions {
  namespace?: string;
  style?: "record" | "class";
}

export interface ResolvedCSharpGeneratorOptions {
  namespace?: string;
  style: "record" | "class";
}

export const DEFAULT_CSHARP_GENERATOR_OPTIONS: ResolvedCSharpGeneratorOptions =
  { style: "record" };

export function resolveCSharpGeneratorOptions(
  options: CSharpGeneratorOptions = {},
): ResolvedCSharpGeneratorOptions {
  return {
    style: options.style ?? DEFAULT_CSHARP_GENERATOR_OPTIONS.style,
    ...(options.namespace !== undefined
      ? { namespace: options.namespace }
      : {}),
  };
}

export function validateCSharpGeneratorOptions(
  options: ResolvedCSharpGeneratorOptions,
): string[] {
  const errors: string[] = [];
  if (options.style !== "record" && options.style !== "class") {
    errors.push('style must be "record" or "class".');
  }
  if (options.namespace !== undefined) {
    if (
      !options.namespace ||
      options.namespace
        .split(".")
        .some((segment) => !/^[A-Za-z_][A-Za-z0-9_]*$/u.test(segment))
    ) {
      errors.push(
        "namespace must be a dot-separated ASCII C# identifier namespace.",
      );
    }
  }
  return errors;
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
  if (errors.length) {
    throw new CSharpGenerationError(
      options.namespace !== undefined &&
        (!options.namespace ||
          options.namespace
            .split(".")
            .some((segment) => !/^[A-Za-z_][A-Za-z0-9_]*$/u.test(segment)))
        ? "invalid-csharp-namespace"
        : "invalid-csharp-style",
      `Invalid C# generator options: ${errors.join("; ")}`,
    );
  }
}

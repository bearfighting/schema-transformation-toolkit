import type { SchemaDocument, SchemaGenerator } from "@aio/core";
import { collectTypeScriptSemanticObservations } from "./diagnostics.js";
import { renderTypeScriptDocument } from "./emit.js";
import type { TypeScriptGenerateResult } from "./failure.js";
import {
  type ConfiguredTypeScriptGenerator,
  DEFAULT_TYPESCRIPT_GENERATOR_OPTIONS,
  prepareTypeScriptGeneratorOptions,
  resolveTypeScriptGeneratorOptions,
  type ResolvedTypeScriptGeneratorOptions,
  type TypeScriptGeneratorOptions,
} from "./options.js";
import { validateRenderableDocument } from "./validate.js";

const defaultConfiguredTypeScriptGenerator = configureTypeScriptGenerator();
const defaultTypeScriptGenerator =
  defaultConfiguredTypeScriptGenerator.generator;

/** Renders a schema document to TypeScript source or throws on generation failure. */
export function generateTypeScript(
  doc: SchemaDocument,
  options: TypeScriptGeneratorOptions = {},
): string {
  const result = tryGenerateTypeScript(doc, options);

  if (!result.ok) {
    throw new Error(
      `TypeScript generation failed [${result.code}]: ${result.message}`,
    );
  }

  return result.output;
}

/** Renders a schema document to TypeScript source and returns a structured success or failure result. */
export function tryGenerateTypeScript(
  doc: SchemaDocument,
  options: TypeScriptGeneratorOptions = {},
): TypeScriptGenerateResult {
  return renderTypeScriptDocumentResult(
    doc,
    resolveTypeScriptGeneratorOptions(options),
  );
}

/** Creates a TypeScript generator instance with fixed base options. */
export function createTypeScriptGenerator(
  options: TypeScriptGeneratorOptions = {},
): SchemaGenerator<
  string,
  TypeScriptGeneratorOptions,
  TypeScriptGenerateResult
> {
  return configureTypeScriptGenerator(options).generator;
}

/** Prepares options and returns both the configured TypeScript generator and its prepared option state. */
export function configureTypeScriptGenerator(
  options: TypeScriptGeneratorOptions = {},
): ConfiguredTypeScriptGenerator {
  const prepared = prepareTypeScriptGeneratorOptions(options);

  if (prepared.errors.length > 0) {
    throw new Error(
      `Invalid TypeScript generator options: ${prepared.errors.join("; ")}`,
    );
  }

  return {
    prepared,
    generator: {
      target: "typescript",
      generate(document, runtimeOptions) {
        return renderTypeScriptDocumentResult(
          document,
          resolveTypeScriptGeneratorOptions({
            ...options,
            ...runtimeOptions,
          }),
        );
      },
    },
  };
}

/** Shared default TypeScript generator instance using the default options. */
export const typeScriptGenerator: SchemaGenerator<
  string,
  TypeScriptGeneratorOptions,
  TypeScriptGenerateResult
> = defaultTypeScriptGenerator;

/** Prepared default option state for the shared TypeScript generator instance. */
export const preparedTypeScriptGeneratorOptions =
  defaultConfiguredTypeScriptGenerator.prepared;

export { DEFAULT_TYPESCRIPT_GENERATOR_OPTIONS };

function renderTypeScriptDocumentResult(
  doc: SchemaDocument,
  options: ResolvedTypeScriptGeneratorOptions,
): TypeScriptGenerateResult {
  const validationFailure = validateRenderableDocument(doc, options);

  if (validationFailure !== null) {
    return validationFailure;
  }

  const observations = collectTypeScriptSemanticObservations(doc);
  const output = renderTypeScriptDocument(doc, options);

  return {
    ok: true,
    output,
    ...(observations.diagnostics.length > 0
      ? { diagnostics: observations.diagnostics }
      : {}),
    ...(observations.semanticNotes.length > 0
      ? { semanticNotes: observations.semanticNotes }
      : {}),
  };
}

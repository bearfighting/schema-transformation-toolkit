import type { SchemaDocument, SchemaGenerator } from "@aio/core";
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

export function tryGenerateTypeScript(
  doc: SchemaDocument,
  options: TypeScriptGeneratorOptions = {},
): TypeScriptGenerateResult {
  return renderTypeScriptDocumentResult(
    doc,
    resolveTypeScriptGeneratorOptions(options),
  );
}

export function createTypeScriptGenerator(
  options: TypeScriptGeneratorOptions = {},
): SchemaGenerator<
  string,
  TypeScriptGeneratorOptions,
  TypeScriptGenerateResult
> {
  return configureTypeScriptGenerator(options).generator;
}

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

export const typeScriptGenerator: SchemaGenerator<
  string,
  TypeScriptGeneratorOptions,
  TypeScriptGenerateResult
> = defaultTypeScriptGenerator;

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

  return {
    ok: true,
    output: renderTypeScriptDocument(doc, options),
  };
}

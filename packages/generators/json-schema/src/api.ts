import type { SchemaDocument, SchemaGenerator } from "@aio/core";
import { collectJsonSchemaDiagnostics } from "./diagnostics.js";
import { renderJsonSchemaDocument } from "./emit.js";
import type { JsonSchemaGenerateResult } from "./failure.js";
import {
  type ConfiguredJsonSchemaGenerator,
  DEFAULT_JSON_SCHEMA_GENERATOR_OPTIONS,
  type JsonSchemaGeneratorOptions,
  type JsonSchemaOutput,
  prepareJsonSchemaGeneratorOptions,
  resolveJsonSchemaGeneratorOptions,
  type ResolvedJsonSchemaGeneratorOptions,
} from "./options.js";
import { validateJsonSchemaDocument } from "./validate.js";

const defaultConfiguredJsonSchemaGenerator = configureJsonSchemaGenerator();
const defaultJsonSchemaGenerator = defaultConfiguredJsonSchemaGenerator.generator;

export function generateJsonSchema(
  doc: SchemaDocument,
  options: JsonSchemaGeneratorOptions = {},
): JsonSchemaOutput {
  const result = tryGenerateJsonSchema(doc, options);

  if (!result.ok) {
    throw new Error(
      `JSON Schema generation failed [${result.code}]: ${result.message}`,
    );
  }

  return result.output;
}

export function tryGenerateJsonSchema(
  doc: SchemaDocument,
  options: JsonSchemaGeneratorOptions = {},
): JsonSchemaGenerateResult {
  return renderJsonSchemaDocumentResult(
    doc,
    resolveJsonSchemaGeneratorOptions(options),
  );
}

export function createJsonSchemaGenerator(
  options: JsonSchemaGeneratorOptions = {},
): SchemaGenerator<
  JsonSchemaOutput,
  JsonSchemaGeneratorOptions,
  JsonSchemaGenerateResult
> {
  return configureJsonSchemaGenerator(options).generator;
}

export function configureJsonSchemaGenerator(
  options: JsonSchemaGeneratorOptions = {},
): ConfiguredJsonSchemaGenerator {
  const prepared = prepareJsonSchemaGeneratorOptions(options);

  if (prepared.errors.length > 0) {
    throw new Error(
      `Invalid JSON Schema generator options: ${prepared.errors.join("; ")}`,
    );
  }

  return {
    prepared,
    generator: {
      target: "json-schema",
      generate(document, runtimeOptions) {
        return renderJsonSchemaDocumentResult(
          document,
          resolveJsonSchemaGeneratorOptions({
            ...options,
            ...runtimeOptions,
          }),
        );
      },
    },
  };
}

export const jsonSchemaGenerator: SchemaGenerator<
  JsonSchemaOutput,
  JsonSchemaGeneratorOptions,
  JsonSchemaGenerateResult
> = defaultJsonSchemaGenerator;

export const preparedJsonSchemaGeneratorOptions =
  defaultConfiguredJsonSchemaGenerator.prepared;

export { DEFAULT_JSON_SCHEMA_GENERATOR_OPTIONS };

function renderJsonSchemaDocumentResult(
  doc: SchemaDocument,
  options: ResolvedJsonSchemaGeneratorOptions,
): JsonSchemaGenerateResult {
  const validationFailure = validateJsonSchemaDocument(doc);

  if (validationFailure !== null) {
    return validationFailure;
  }

  const diagnostics = collectJsonSchemaDiagnostics(doc, options);

  return {
    ok: true,
    output: renderJsonSchemaDocument(doc, options),
    ...(diagnostics.length > 0 ? { diagnostics } : {}),
  };
}

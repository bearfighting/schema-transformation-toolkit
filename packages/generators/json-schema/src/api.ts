import type { SchemaDocument, SchemaGenerator } from "@aio/core";
import { collectJsonSchemaSemanticObservations } from "./diagnostics.js";
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
const defaultJsonSchemaGenerator =
  defaultConfiguredJsonSchemaGenerator.generator;

/** Renders a schema document to JSON Schema output or throws on generation failure. */
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

/** Renders a schema document to JSON Schema output and returns a structured success or failure result. */
export function tryGenerateJsonSchema(
  doc: SchemaDocument,
  options: JsonSchemaGeneratorOptions = {},
): JsonSchemaGenerateResult {
  return renderJsonSchemaDocumentResult(
    doc,
    resolveJsonSchemaGeneratorOptions(options),
  );
}

/** Creates a JSON Schema generator instance with fixed base options. */
export function createJsonSchemaGenerator(
  options: JsonSchemaGeneratorOptions = {},
): SchemaGenerator<
  JsonSchemaOutput,
  JsonSchemaGeneratorOptions,
  JsonSchemaGenerateResult
> {
  return configureJsonSchemaGenerator(options).generator;
}

/** Prepares options and returns both the configured JSON Schema generator and its prepared option state. */
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

/** Shared default JSON Schema generator instance using the default options. */
export const jsonSchemaGenerator: SchemaGenerator<
  JsonSchemaOutput,
  JsonSchemaGeneratorOptions,
  JsonSchemaGenerateResult
> = defaultJsonSchemaGenerator;

/** Prepared default option state for the shared JSON Schema generator instance. */
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

  const observations = collectJsonSchemaSemanticObservations(doc, options);

  return {
    ok: true,
    output: renderJsonSchemaDocument(doc, options),
    ...(observations.diagnostics.length > 0
      ? { diagnostics: observations.diagnostics }
      : {}),
    ...(observations.semanticNotes.length > 0
      ? { semanticNotes: observations.semanticNotes }
      : {}),
  };
}

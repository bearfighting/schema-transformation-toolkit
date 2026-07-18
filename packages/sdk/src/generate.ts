import type { ConstraintDocument, SchemaDocument } from "@aio/core";
import {
  tryGenerateJsonSchema,
  type JsonSchemaOutput,
} from "@aio/generator-json-schema";
import { tryGenerateTypeScript } from "@aio/generator-typescript";
import type { ConvertOptions, ConversionTargetFormat } from "./types.js";

export type GeneratedOutput = string | JsonSchemaOutput;

export function generateTarget(
  document: SchemaDocument,
  targetFormat: ConversionTargetFormat,
  options: ConvertOptions,
  constraints?: ConstraintDocument,
) {
  if (targetFormat === "typescript") {
    return tryGenerateTypeScript(
      document,
      options.generatorOptions?.typeScript ?? {},
    );
  }

  return tryGenerateJsonSchema(document, {
    ...(options.generatorOptions?.jsonSchema ?? {}),
    ...(constraints ? { constraints } : {}),
  });
}

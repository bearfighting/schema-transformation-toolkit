import type {
  ConversionCapability,
  ConversionReport,
  ConstraintDocument,
  SchemaDiagnostic,
  SchemaDocument,
  SchemaSemanticNote,
  SemanticLoss,
  ValueDocument,
  ConversionRoute,
} from "@aio/core";
import type {
  JsonSchemaGeneratorOptions,
  JsonSchemaOutput,
} from "@aio/generator-json-schema";
import type { TypeScriptGeneratorOptions } from "@aio/generator-typescript";
import type { JsonParseOptions } from "@aio/parser-json";
import type { JsonSchemaParseOptions } from "@aio/parser-json-schema";
import type { TypeScriptParseOptions } from "@aio/parser-typescript";

export type ConversionSourceFormat = "json" | "json-schema" | "typescript";
export type ConversionTargetFormat = "json-schema" | "typescript";

export interface ConvertOptions {
  sourceFormat: ConversionSourceFormat;
  targetFormat: ConversionTargetFormat;
  input: string;
  name?: string;
  includeArtifacts?: boolean;
  parserOptions?: {
    json?: JsonParseOptions;
    jsonSchema?: JsonSchemaParseOptions;
    typeScript?: TypeScriptParseOptions;
  };
  generatorOptions?: {
    jsonSchema?: JsonSchemaGeneratorOptions;
    typeScript?: TypeScriptGeneratorOptions;
  };
}

export interface ConversionArtifacts {
  value?: ValueDocument;
  shape?: SchemaDocument;
  constraints?: ConstraintDocument;
}

export interface ConvertSuccessResult<TOutput = string | JsonSchemaOutput> {
  ok: true;
  output: TOutput;
  plan: ConversionRoute;
  report?: ConversionReport;
  artifacts?: ConversionArtifacts;
  diagnostics?: SchemaDiagnostic[];
  losses?: SemanticLoss[];
  preservedCapabilities?: ConversionCapability[];
  semanticNotes?: SchemaSemanticNote[];
}

export interface ConvertFailureResult {
  ok: false;
  code: string;
  message: string;
  phase: "parse" | "generate";
  plan: ConversionRoute;
  diagnostics?: SchemaDiagnostic[];
}

export type ConvertResult<TOutput = string | JsonSchemaOutput> =
  ConvertSuccessResult<TOutput> | ConvertFailureResult;

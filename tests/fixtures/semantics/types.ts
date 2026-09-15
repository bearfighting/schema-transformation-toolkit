import type {
  ConstraintDocument,
  ConversionCapability,
  SchemaDocument,
} from "@schema-transformation-toolkit/core";
import type { JsonParseOptions } from "@schema-transformation-toolkit/parser-json";
import type { JsonSchemaParseOptions } from "@schema-transformation-toolkit/parser-json-schema";
import type { TypeScriptParseOptions } from "@schema-transformation-toolkit/parser-typescript";
import type { OpenApiParseOptions } from "@schema-transformation-toolkit/parser-openapi";
import type { ZodParseOptions } from "@schema-transformation-toolkit/parser-zod";
import type { RustParseOptions } from "@schema-transformation-toolkit/parser-rust";
import type { PythonParseOptions } from "@schema-transformation-toolkit/parser-python";
import type { GoParseOptions } from "@schema-transformation-toolkit/parser-go";
import type { JavaParseOptions } from "@schema-transformation-toolkit/parser-java";
import type { KotlinParseOptions } from "../../../packages/parsers/kotlin/src/options.js";
import type { CSharpParserOptions } from "../../../packages/parsers/csharp/src/options.js";

export type SemanticFixtureFormatId =
  | "json"
  | "json-schema"
  | "typescript"
  | "zod"
  | "openapi"
  | "rust"
  | "python"
  | "go"
  | "java"
  | "kotlin"
  | "csharp";
export type SemanticFixtureCoverageSubject =
  | SemanticFixtureFormatId
  | "generator:json-schema"
  | "generator:typescript"
  | "generator:zod";
export type SemanticFixtureGeneratorId =
  | "generator:json-schema"
  | "generator:typescript"
  | "generator:zod"
  | "generator:openapi";
export type SemanticFixtureRouteId =
  `${SemanticFixtureFormatId}->${SemanticFixtureFormatId}`;

export type SemanticFixtureSupportLevel =
  | "exact"
  | "normalized"
  | "inferred"
  | "lowered"
  | "lossy"
  | "unsupported"
  | "not-applicable";

export interface TypeScriptSemanticFixtureSource {
  input: string;
  options?: TypeScriptParseOptions;
}

export interface JsonSchemaSemanticFixtureSource {
  input: unknown;
  options?: JsonSchemaParseOptions;
}

export interface JsonSemanticFixtureSource {
  input: string;
  options?: JsonParseOptions;
}

export interface ZodSemanticFixtureSource {
  input: string;
  options?: ZodParseOptions;
}

export interface OpenApiSemanticFixtureSource {
  input: string;
  options?: OpenApiParseOptions;
}

export interface RustSemanticFixtureSource {
  input: string;
  options?: RustParseOptions;
}

export interface PythonSemanticFixtureSource {
  input: string;
  options?: PythonParseOptions;
}

export interface GoSemanticFixtureSource {
  input: string;
  options?: GoParseOptions;
}

export interface JavaSemanticFixtureSource {
  input: string;
  options?: JavaParseOptions;
}

export interface KotlinSemanticFixtureSource {
  input: string;
  options?: KotlinParseOptions;
}

export interface CSharpSemanticFixtureSource {
  input: string;
  options?: CSharpParserOptions;
}

export interface SemanticFixtureGeneratorExpectation {
  diagnosticCodes?: string[];
  semanticNoteCodes?: string[];
}

export interface SemanticFixtureValidationExamples {
  valid: unknown[];
  invalid: unknown[];
}

export interface SemanticFixtureConversionExpectation {
  constraintPolicy?: "exact" | "lossy" | "not-applicable";
  generatorExpectation?: SemanticFixtureGeneratorExpectation;
  semanticCaveatCodes?: string[];
  semanticLosses?: Array<{
    lostCapability: ConversionCapability;
    sourcePath: string[];
  }>;
}

export interface SemanticFixtureConstraintPathNormalization {
  replacePrefix: string[];
  replacement: string[];
}

export interface SemanticFixture {
  id: string;
  description: string;
  validationExamples?: SemanticFixtureValidationExamples;
  canonicalShape: SchemaDocument;
  canonicalConstraints?: ConstraintDocument;
  constraintPathNormalizations?: Partial<
    Record<SemanticFixtureFormatId, SemanticFixtureConstraintPathNormalization>
  >;
  /** Explicit opt-in for generator round-trip routes supported by a fixture. */
  equivalenceRoutes?: SemanticFixtureRouteId[];
  sources: Partial<{
    json: JsonSemanticFixtureSource;
    "json-schema": JsonSchemaSemanticFixtureSource;
    typescript: TypeScriptSemanticFixtureSource;
    zod: ZodSemanticFixtureSource;
    openapi: OpenApiSemanticFixtureSource;
    rust: RustSemanticFixtureSource;
    python: PythonSemanticFixtureSource;
    go: GoSemanticFixtureSource;
    java: JavaSemanticFixtureSource;
    kotlin: KotlinSemanticFixtureSource;
    csharp: CSharpSemanticFixtureSource;
  }>;
  support: Partial<
    Record<SemanticFixtureFormatId, SemanticFixtureSupportLevel>
  >;
  capabilityCoverage?: Partial<
    Record<SemanticFixtureCoverageSubject, ConversionCapability[]>
  >;
  generatorExpectations?: Partial<
    Record<SemanticFixtureGeneratorId, SemanticFixtureGeneratorExpectation>
  >;
  conversionExpectations?: Partial<
    Record<SemanticFixtureRouteId, SemanticFixtureConversionExpectation>
  >;
}

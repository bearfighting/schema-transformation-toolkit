# API Snapshot: @aio/sdk

Entry: packages/sdk/src/index.ts

## packages/sdk/src/convert.d.ts

```ts
import type { JsonSchemaOutput } from "@aio/generator-json-schema";
import {
  describeConversionRouteCapabilities,
  listConversionRoutes,
  planConversion,
  routeStages,
  routeUsesIr,
} from "./registry.js";
export type {
  ConvertAdvancedOptions,
  ConversionArtifacts,
  ConvertFailureResult,
  ConvertOptions,
  ConvertResult,
  ConvertSuccessResult,
  ConversionSourceFormat,
  ConversionTargetFormat,
} from "./types.js";
import type { ConvertResult, ConvertOptions } from "./types.js";
export {
  describeConversionRouteCapabilities,
  listConversionRoutes,
  planConversion,
  routeStages,
  routeUsesIr,
};
export declare function convert(
  options: ConvertOptions,
): ConvertResult<string | JsonSchemaOutput>;
```

## packages/sdk/src/index.d.ts

```ts
export {
  convert,
  describeConversionRouteCapabilities,
  listConversionRoutes,
  planConversion,
} from "./convert.js";
export { inspectTypeScriptImplicitEntry } from "./inspect.js";
export type {
  TypeScriptImplicitEntryAmbiguityReason,
  TypeScriptImplicitEntryAnalysis,
} from "./inspect.js";
export type {
  ConversionArtifacts,
  ConvertFailureResult,
  ConvertOptions,
  ConvertResult,
  ConvertSuccessResult,
  ConversionSourceFormat,
  ConversionTargetFormat,
} from "./convert.js";
```

## packages/sdk/src/inspect.d.ts

```ts
import type {
  TypeScriptImplicitEntryAmbiguityReason,
  TypeScriptImplicitEntryAnalysis,
} from "@aio/parser-typescript";
export type {
  TypeScriptImplicitEntryAmbiguityReason,
  TypeScriptImplicitEntryAnalysis,
};
export declare function inspectTypeScriptImplicitEntry(
  input: string,
): TypeScriptImplicitEntryAnalysis;
```

## packages/sdk/src/registry.d.ts

```ts
import type {
  ConversionRoute,
  ConversionRouteCapabilities,
  GeneratorCapabilities,
  IrKind,
  ParserCapabilities,
  PipelineStage,
} from "@aio/core";
import type {
  ConversionSourceFormat,
  ConversionTargetFormat,
} from "./types.js";
export declare function listConversionRoutes(): ConversionRoute[];
export declare function planConversion(
  sourceFormat: ConversionSourceFormat,
  targetFormat: ConversionTargetFormat,
): ConversionRoute;
export declare function describeConversionRouteCapabilities(
  sourceFormat: ConversionSourceFormat,
  targetFormat: ConversionTargetFormat,
): ConversionRouteCapabilities;
export declare function routeUsesIr(
  route: ConversionRoute,
  irKind: IrKind,
): boolean;
export declare function routeStages(route: ConversionRoute): PipelineStage[];
export declare function resolveParserCapabilities(
  sourceFormat: ConversionSourceFormat,
): ParserCapabilities;
export declare function resolveGeneratorCapabilities(
  targetFormat: ConversionTargetFormat,
): GeneratorCapabilities;
```

## packages/sdk/src/types.d.ts

```ts
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
export interface ConvertAdvancedOptions {
  parser?: {
    json?: JsonParseOptions;
    jsonSchema?: JsonSchemaParseOptions;
    typeScript?: TypeScriptParseOptions;
  };
  generator?: {
    jsonSchema?: JsonSchemaGeneratorOptions;
    typeScript?: TypeScriptGeneratorOptions;
  };
}
export interface ConvertOptions {
  sourceFormat: ConversionSourceFormat;
  targetFormat: ConversionTargetFormat;
  input: string;
  name?: string;
  includeArtifacts?: boolean;
  advanced?: ConvertAdvancedOptions;
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
```

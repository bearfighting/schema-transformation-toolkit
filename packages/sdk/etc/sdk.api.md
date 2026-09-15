# API Snapshot: @schema-transformation-toolkit/sdk

Entry: packages/sdk/src/index.ts

## packages/sdk/src/builtin-formats.d.ts

```ts
export declare const BUILTIN_FORMAT_CATALOG: {
  readonly json: {
    readonly source: true;
    readonly target: true;
  };
  readonly csv: {
    readonly source: true;
    readonly target: true;
  };
  readonly "json-schema": {
    readonly source: true;
    readonly target: true;
  };
  readonly typescript: {
    readonly source: true;
    readonly target: true;
  };
  readonly openapi: {
    readonly source: true;
    readonly target: true;
  };
  readonly zod: {
    readonly source: true;
    readonly target: true;
  };
  readonly yaml: {
    readonly source: true;
    readonly target: true;
  };
  readonly toml: {
    readonly source: true;
    readonly target: true;
  };
  readonly rust: {
    readonly source: true;
    readonly target: true;
  };
  readonly python: {
    readonly source: true;
    readonly target: true;
  };
  readonly go: {
    readonly source: true;
    readonly target: true;
  };
  readonly java: {
    readonly source: true;
    readonly target: true;
  };
  readonly kotlin: {
    readonly source: true;
    readonly target: true;
  };
  readonly csharp: {
    readonly source: true;
    readonly target: true;
  };
};
type BuiltinFormat = keyof typeof BUILTIN_FORMAT_CATALOG;
type NonEmptyFormatList = readonly [BuiltinFormat, ...BuiltinFormat[]];
export declare const BUILTIN_SOURCE_FORMATS: NonEmptyFormatList;
export declare const BUILTIN_TARGET_FORMATS: NonEmptyFormatList;
export type BuiltinSourceFormat = (typeof BUILTIN_SOURCE_FORMATS)[number];
export type BuiltinTargetFormat = (typeof BUILTIN_TARGET_FORMATS)[number];
export {};
```

## packages/sdk/src/builtin-types.d.ts

```ts
import type {
  JsonSchemaGeneratorOptions,
  JsonSchemaOutput,
} from "@schema-transformation-toolkit/generator-json-schema";
import type { JsonOutput } from "@schema-transformation-toolkit/generator-json";
import type {
  OpenApiGeneratorOptions,
  OpenApiOutput,
} from "@schema-transformation-toolkit/generator-openapi";
import type { TypeScriptGeneratorOptions } from "@schema-transformation-toolkit/generator-typescript";
import type { ZodGeneratorOptions } from "@schema-transformation-toolkit/generator-zod";
import type { YamlOutput } from "@schema-transformation-toolkit/generator-yaml";
import type {
  CsvGeneratorOptions,
  CsvOutput,
} from "@schema-transformation-toolkit/generator-csv";
import type {
  TomlGeneratorOptions,
  TomlOutput,
} from "@schema-transformation-toolkit/generator-toml";
import type { JsonParseOptions } from "@schema-transformation-toolkit/parser-json";
import type { JsonSchemaParseOptions } from "@schema-transformation-toolkit/parser-json-schema";
import type { TypeScriptParseOptions } from "@schema-transformation-toolkit/parser-typescript";
import type { OpenApiParseOptions } from "@schema-transformation-toolkit/parser-openapi";
import type { ZodParseOptions } from "@schema-transformation-toolkit/parser-zod";
import type { YamlParseOptions } from "@schema-transformation-toolkit/parser-yaml";
import type { CsvParseOptions } from "@schema-transformation-toolkit/parser-csv";
import type { TomlParseOptions } from "@schema-transformation-toolkit/parser-toml";
import type { RustParseOptions } from "@schema-transformation-toolkit/parser-rust";
import type { PythonGeneratorOptions } from "@schema-transformation-toolkit/generator-python";
import type { PythonParseOptions } from "@schema-transformation-toolkit/parser-python";
import type { GoGeneratorOptions } from "@schema-transformation-toolkit/generator-go";
import type { GoParseOptions } from "@schema-transformation-toolkit/parser-go";
import type { JavaGeneratorOptions } from "@schema-transformation-toolkit/generator-java";
import type { JavaParseOptions } from "@schema-transformation-toolkit/parser-java";
import type { KotlinGeneratorOptions } from "@schema-transformation-toolkit/generator-kotlin";
import type { KotlinParseOptions } from "@schema-transformation-toolkit/parser-kotlin";
import type { CSharpGeneratorOptions } from "@schema-transformation-toolkit/generator-csharp";
import type { CSharpParserOptions } from "@schema-transformation-toolkit/parser-csharp";
/** Compatibility-only builtin output map. Generic registry output is unknown-safe. */
export interface BuiltinGeneratorOutputs {
  json: JsonOutput;
  "json-schema": JsonSchemaOutput;
  typescript: string;
  zod: string;
  openapi: OpenApiOutput;
  yaml: YamlOutput;
  csv: CsvOutput;
  toml: TomlOutput;
  python: string;
  go: string;
  java: string;
  kotlin: string;
  csharp: string;
}
export interface BuiltinParserOptions {
  json?: JsonParseOptions;
  jsonSchema?: JsonSchemaParseOptions;
  typeScript?: TypeScriptParseOptions;
  openapi?: OpenApiParseOptions;
  zod?: ZodParseOptions;
  yaml?: YamlParseOptions;
  csv?: CsvParseOptions;
  toml?: TomlParseOptions;
  rust?: RustParseOptions;
  python?: PythonParseOptions;
  go?: GoParseOptions;
  java?: JavaParseOptions;
  kotlin?: KotlinParseOptions;
  csharp?: CSharpParserOptions;
}
export interface BuiltinGeneratorOptions {
  jsonSchema?: JsonSchemaGeneratorOptions;
  typeScript?: TypeScriptGeneratorOptions;
  zod?: ZodGeneratorOptions;
  openapi?: OpenApiGeneratorOptions;
  yaml?: Record<string, never>;
  csv?: CsvGeneratorOptions;
  toml?: TomlGeneratorOptions;
  python?: PythonGeneratorOptions;
  go?: GoGeneratorOptions;
  java?: JavaGeneratorOptions;
  kotlin?: KotlinGeneratorOptions;
  csharp?: CSharpGeneratorOptions;
}
```

## packages/sdk/src/convert.d.ts

```ts
import type { BuiltinGeneratorOutputs } from "./builtin-types.js";
import {
  describeConversionRouteCapabilities,
  listConversionRoutes,
  planConversion,
  routeStages,
  routeUsesIr,
} from "./registry.js";
import type { ConversionRegistry } from "./types.js";
import type { UserFacingDiagnostic } from "./ui-diagnostics.js";
import type { ConversionOptionCatalogs } from "./options-metadata.js";
import type { FormatSupportSummary } from "./support-matrix.js";
export type {
  ConvertAdvancedOptions,
  ConversionArtifacts,
  ConvertFailureResult,
  ConvertOptions,
  ConvertResult,
  ConvertSuccessResult,
  BuiltinSourceFormat,
  BuiltinTargetFormat,
  BuiltinGeneratorOutputs,
  ConversionIrPreference,
  ConversionFormat,
  ConversionOutput,
  ConversionRegistry,
  ConversionSourceFormat,
  ConversionTargetFormat,
  ExtensionConversionOptions,
  GenericConvertAdvancedOptions,
  RegistryConversionOutput,
  RegistryOutputMap,
} from "./types.js";
import type {
  ConvertOptions,
  ConvertResult,
  ConversionFormat,
  ConversionIrPreference,
  ConversionOutput,
  RegistryOutputMap,
} from "./types.js";
export {
  describeConversionRouteCapabilities,
  listConversionRoutes,
  planConversion,
  routeStages,
  routeUsesIr,
};
export interface ConversionConverter<
  TExtensions extends RegistryOutputMap = Record<never, never>,
> {
  convert<TTarget extends ConversionFormat>(
    options: ConvertOptions & {
      targetFormat: TTarget;
    },
  ): ConvertResult<ConversionOutput<TTarget, TExtensions>>;
  listConversionRoutes(): ReturnType<typeof listConversionRoutes>;
  planConversion: (
    sourceFormat: ConversionFormat,
    targetFormat: ConversionFormat,
    irPreference?: ConversionIrPreference,
  ) => ReturnType<typeof planConversion>;
  describeConversionRouteCapabilities: typeof describeConversionRouteCapabilities;
  listFormatSupports(): FormatSupportSummary[];
  listSourceFormatSupports(): FormatSupportSummary[];
  listTargetFormatSupports(): FormatSupportSummary[];
  describeFormatSupport(format: ConversionFormat): FormatSupportSummary;
  describeConversionOptions(
    sourceFormat: ConversionFormat,
    targetFormat: ConversionFormat,
  ): ConversionOptionCatalogs;
  describeParserOptions(
    format: ConversionFormat,
  ): import("@schema-transformation-toolkit/core").OptionCatalog;
  describeGeneratorOptions(
    format: ConversionFormat,
  ): import("@schema-transformation-toolkit/core").OptionCatalog;
  listOptionCatalogs(): import("@schema-transformation-toolkit/core").OptionCatalog[];
  describeTransformerOptions(
    id: string,
  ): import("@schema-transformation-toolkit/core").OptionCatalog | undefined;
  listTransformerOptions(): import("@schema-transformation-toolkit/core").OptionCatalog[];
  collectUserFacingDiagnostics<TOutput>(
    result: ConvertResult<TOutput>,
  ): UserFacingDiagnostic[];
}
export declare function createConverter<
  TExtensions extends RegistryOutputMap = Record<never, never>,
>(registry: ConversionRegistry): ConversionConverter<TExtensions>;
export declare function convert<
  TOutput = string | BuiltinGeneratorOutputs[keyof BuiltinGeneratorOutputs],
>(
  options: ConvertOptions,
  registry?: ConversionRegistry,
): ConvertResult<TOutput>;
```

## packages/sdk/src/index.d.ts

```ts
export {
  convert,
  createConverter,
  describeConversionRouteCapabilities,
  listConversionRoutes,
  planConversion,
} from "./convert.js";
export {
  createConversionRegistry,
  defaultConversionRegistry,
  DescriptorRegistrationError,
  resolveGeneratorDescriptor,
  resolveParserDescriptor,
} from "./registry.js";
export type { DescriptorRegistrationErrorCode } from "./registry.js";
export {
  conversionArtifactsSchema,
  conversionCapabilityRequirementSchema,
  conversionEntrySelectionSchema,
  conversionIrPreferenceSchema,
  conversionLossHotspotSchema,
  conversionPolicyDecisionSchema,
  conversionReportSchema,
  conversionRouteSchema,
  conversionSemanticCaveatSchema,
  convertFailureResultSchema,
  convertSuccessResultSchema,
  publicConvertResultSchema,
  schemaDiagnosticSchema,
  semanticLossSchema,
  conversionOptionCatalogsSchema,
  genericConversionOptionCatalogsSchema,
  optionCatalogSchema,
  optionMetadataCategorySchema,
  optionMetadataExampleSchema,
  optionMetadataSchema,
  optionMetadataStageSchema,
  optionValueMetadataSchema,
} from "./public-contract.js";
export {
  conversionIrPreferenceMetadata,
  describeConversionOptions,
  describeGeneratorOptions,
  describeParserOptions,
  describeTransformerOptions,
  listTransformerOptions,
  listOptionCatalogs,
} from "./options-metadata.js";
export { inspectTypeScriptImplicitEntry } from "./inspect.js";
export { collectUserFacingDiagnostics } from "./ui-diagnostics.js";
export {
  describeFormatSupport,
  listFormatSupports,
  listSourceFormatSupports,
  listTargetFormatSupports,
} from "./support-matrix.js";
export type {
  UserFacingDiagnostic,
  UserFacingSourcePosition,
  UserFacingSourceRange,
} from "./ui-diagnostics.js";
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
  BuiltinSourceFormat,
  BuiltinTargetFormat,
  BuiltinGeneratorOutputs,
  ConversionIrPreference,
  ConversionFormat,
  ConversionOutput,
  ConversionRegistry,
  ExtensionConversionOptions,
  GenericConvertAdvancedOptions,
  RegistryConversionOutput,
  RegistryOutputMap,
} from "./convert.js";
export type {
  ConsumerSurfaceFormat,
  FormatSupportSummary,
  GeneratorSupportSummary,
  ParserSupportSummary,
} from "./support-matrix.js";
export type { ConversionOptionCatalogs } from "./options-metadata.js";
```

## packages/sdk/src/inspect.d.ts

```ts
import {
  type TypeScriptImplicitEntryAmbiguityReason,
  type TypeScriptImplicitEntryAnalysis,
} from "./typescript-compatibility.js";
export type {
  TypeScriptImplicitEntryAmbiguityReason,
  TypeScriptImplicitEntryAnalysis,
};
export declare function inspectTypeScriptImplicitEntry(
  input: string,
): TypeScriptImplicitEntryAnalysis;
```

## packages/sdk/src/options-metadata.d.ts

```ts
import type {
  OptionCatalog,
  OptionMetadata,
} from "@schema-transformation-toolkit/core";
import type {
  ConversionRegistry,
  ConversionSourceFormat,
  ConversionTargetFormat,
} from "./types.js";
export interface ConversionOptionCatalogs {
  sourceFormat: ConversionSourceFormat;
  targetFormat: ConversionTargetFormat;
  parser: OptionCatalog;
  generator: OptionCatalog;
  transformers: OptionCatalog[];
  irPreference: OptionMetadata;
}
export declare const conversionIrPreferenceMetadata: OptionMetadata;
export declare function describeParserOptions(
  format: ConversionSourceFormat,
  registry?: ConversionRegistry,
): OptionCatalog;
export declare function describeGeneratorOptions(
  format: ConversionTargetFormat,
  registry?: ConversionRegistry,
): OptionCatalog;
export declare function describeConversionOptions(
  sourceFormat: ConversionSourceFormat,
  targetFormat: ConversionTargetFormat,
  registry?: ConversionRegistry,
): ConversionOptionCatalogs;
export declare function describeTransformerOptions(
  id: string,
  registry?: ConversionRegistry,
): OptionCatalog | undefined;
export declare function listTransformerOptions(
  registry?: ConversionRegistry,
): OptionCatalog[];
export declare function listOptionCatalogs(
  registry?: ConversionRegistry,
): OptionCatalog[];
```

## packages/sdk/src/public-contract.d.ts

```ts
import { z } from "zod";
export declare const conversionSourceFormatSchema: z.ZodEnum<{
  "json-schema": "json-schema";
  json: "json";
  openapi: "openapi";
  typescript: "typescript";
  zod: "zod";
  yaml: "yaml";
  csv: "csv";
  toml: "toml";
  rust: "rust";
  python: "python";
  go: "go";
  java: "java";
  kotlin: "kotlin";
  csharp: "csharp";
}>;
export declare const conversionTargetFormatSchema: z.ZodEnum<{
  "json-schema": "json-schema";
  json: "json";
  openapi: "openapi";
  typescript: "typescript";
  zod: "zod";
  yaml: "yaml";
  csv: "csv";
  toml: "toml";
  rust: "rust";
  python: "python";
  go: "go";
  java: "java";
  kotlin: "kotlin";
  csharp: "csharp";
}>;
export declare const conversionIrPreferenceSchema: z.ZodEnum<{
  value: "value";
  shape: "shape";
  auto: "auto";
}>;
export declare const optionMetadataStageSchema: z.ZodEnum<{
  parse: "parse";
  transform: "transform";
  generate: "generate";
}>;
export declare const optionMetadataCategorySchema: z.ZodEnum<{
  diagnostics: "diagnostics";
  inference: "inference";
  selection: "selection";
  formatting: "formatting";
  output: "output";
  semantics: "semantics";
  extension: "extension";
}>;
export declare const optionMetadataExampleSchema: z.ZodObject<
  {
    title: z.ZodString;
    input: z.ZodOptional<z.ZodString>;
    options: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    output: z.ZodOptional<z.ZodString>;
    semanticChange: z.ZodOptional<z.ZodString>;
    diagnostics: z.ZodOptional<z.ZodArray<z.ZodString>>;
    explanation: z.ZodString;
  },
  z.core.$strip
>;
export declare const optionValueMetadataSchema: z.ZodObject<
  {
    value: z.ZodUnknown;
    label: z.ZodString;
    description: z.ZodString;
    semanticEffect: z.ZodOptional<z.ZodString>;
    diagnosticEffect: z.ZodOptional<z.ZodString>;
    example: z.ZodOptional<
      z.ZodObject<
        {
          title: z.ZodString;
          input: z.ZodOptional<z.ZodString>;
          options: z.ZodRecord<z.ZodString, z.ZodUnknown>;
          output: z.ZodOptional<z.ZodString>;
          semanticChange: z.ZodOptional<z.ZodString>;
          diagnostics: z.ZodOptional<z.ZodArray<z.ZodString>>;
          explanation: z.ZodString;
        },
        z.core.$strip
      >
    >;
  },
  z.core.$strip
>;
export declare const optionMetadataSchema: z.ZodObject<
  {
    key: z.ZodString;
    label: z.ZodString;
    description: z.ZodString;
    category: z.ZodEnum<{
      diagnostics: "diagnostics";
      inference: "inference";
      selection: "selection";
      formatting: "formatting";
      output: "output";
      semantics: "semantics";
      extension: "extension";
    }>;
    defaultValue: z.ZodUnknown;
    valueDescriptions: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            value: z.ZodUnknown;
            label: z.ZodString;
            description: z.ZodString;
            semanticEffect: z.ZodOptional<z.ZodString>;
            diagnosticEffect: z.ZodOptional<z.ZodString>;
            example: z.ZodOptional<
              z.ZodObject<
                {
                  title: z.ZodString;
                  input: z.ZodOptional<z.ZodString>;
                  options: z.ZodRecord<z.ZodString, z.ZodUnknown>;
                  output: z.ZodOptional<z.ZodString>;
                  semanticChange: z.ZodOptional<z.ZodString>;
                  diagnostics: z.ZodOptional<z.ZodArray<z.ZodString>>;
                  explanation: z.ZodString;
                },
                z.core.$strip
              >
            >;
          },
          z.core.$strip
        >
      >
    >;
    affectedStages: z.ZodArray<
      z.ZodEnum<{
        parse: "parse";
        transform: "transform";
        generate: "generate";
      }>
    >;
    semanticEffect: z.ZodString;
    diagnosticEffect: z.ZodString;
    examples: z.ZodArray<
      z.ZodObject<
        {
          title: z.ZodString;
          input: z.ZodOptional<z.ZodString>;
          options: z.ZodRecord<z.ZodString, z.ZodUnknown>;
          output: z.ZodOptional<z.ZodString>;
          semanticChange: z.ZodOptional<z.ZodString>;
          diagnostics: z.ZodOptional<z.ZodArray<z.ZodString>>;
          explanation: z.ZodString;
        },
        z.core.$strip
      >
    >;
    supported: z.ZodBoolean;
    experimental: z.ZodOptional<z.ZodBoolean>;
  },
  z.core.$strip
>;
export declare const optionCatalogSchema: z.ZodObject<
  {
    format: z.ZodString;
    role: z.ZodEnum<{
      parser: "parser";
      transformer: "transformer";
      generator: "generator";
    }>;
    options: z.ZodArray<
      z.ZodObject<
        {
          key: z.ZodString;
          label: z.ZodString;
          description: z.ZodString;
          category: z.ZodEnum<{
            diagnostics: "diagnostics";
            inference: "inference";
            selection: "selection";
            formatting: "formatting";
            output: "output";
            semantics: "semantics";
            extension: "extension";
          }>;
          defaultValue: z.ZodUnknown;
          valueDescriptions: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  value: z.ZodUnknown;
                  label: z.ZodString;
                  description: z.ZodString;
                  semanticEffect: z.ZodOptional<z.ZodString>;
                  diagnosticEffect: z.ZodOptional<z.ZodString>;
                  example: z.ZodOptional<
                    z.ZodObject<
                      {
                        title: z.ZodString;
                        input: z.ZodOptional<z.ZodString>;
                        options: z.ZodRecord<z.ZodString, z.ZodUnknown>;
                        output: z.ZodOptional<z.ZodString>;
                        semanticChange: z.ZodOptional<z.ZodString>;
                        diagnostics: z.ZodOptional<z.ZodArray<z.ZodString>>;
                        explanation: z.ZodString;
                      },
                      z.core.$strip
                    >
                  >;
                },
                z.core.$strip
              >
            >
          >;
          affectedStages: z.ZodArray<
            z.ZodEnum<{
              parse: "parse";
              transform: "transform";
              generate: "generate";
            }>
          >;
          semanticEffect: z.ZodString;
          diagnosticEffect: z.ZodString;
          examples: z.ZodArray<
            z.ZodObject<
              {
                title: z.ZodString;
                input: z.ZodOptional<z.ZodString>;
                options: z.ZodRecord<z.ZodString, z.ZodUnknown>;
                output: z.ZodOptional<z.ZodString>;
                semanticChange: z.ZodOptional<z.ZodString>;
                diagnostics: z.ZodOptional<z.ZodArray<z.ZodString>>;
                explanation: z.ZodString;
              },
              z.core.$strip
            >
          >;
          supported: z.ZodBoolean;
          experimental: z.ZodOptional<z.ZodBoolean>;
        },
        z.core.$strip
      >
    >;
  },
  z.core.$strip
>;
export declare const conversionOptionCatalogsSchema: z.ZodObject<
  {
    sourceFormat: z.ZodEnum<{
      "json-schema": "json-schema";
      json: "json";
      openapi: "openapi";
      typescript: "typescript";
      zod: "zod";
      yaml: "yaml";
      csv: "csv";
      toml: "toml";
      rust: "rust";
      python: "python";
      go: "go";
      java: "java";
      kotlin: "kotlin";
      csharp: "csharp";
    }>;
    targetFormat: z.ZodEnum<{
      "json-schema": "json-schema";
      json: "json";
      openapi: "openapi";
      typescript: "typescript";
      zod: "zod";
      yaml: "yaml";
      csv: "csv";
      toml: "toml";
      rust: "rust";
      python: "python";
      go: "go";
      java: "java";
      kotlin: "kotlin";
      csharp: "csharp";
    }>;
    parser: z.ZodObject<
      {
        format: z.ZodString;
        role: z.ZodEnum<{
          parser: "parser";
          transformer: "transformer";
          generator: "generator";
        }>;
        options: z.ZodArray<
          z.ZodObject<
            {
              key: z.ZodString;
              label: z.ZodString;
              description: z.ZodString;
              category: z.ZodEnum<{
                diagnostics: "diagnostics";
                inference: "inference";
                selection: "selection";
                formatting: "formatting";
                output: "output";
                semantics: "semantics";
                extension: "extension";
              }>;
              defaultValue: z.ZodUnknown;
              valueDescriptions: z.ZodOptional<
                z.ZodArray<
                  z.ZodObject<
                    {
                      value: z.ZodUnknown;
                      label: z.ZodString;
                      description: z.ZodString;
                      semanticEffect: z.ZodOptional<z.ZodString>;
                      diagnosticEffect: z.ZodOptional<z.ZodString>;
                      example: z.ZodOptional<
                        z.ZodObject<
                          {
                            title: z.ZodString;
                            input: z.ZodOptional<z.ZodString>;
                            options: z.ZodRecord<z.ZodString, z.ZodUnknown>;
                            output: z.ZodOptional<z.ZodString>;
                            semanticChange: z.ZodOptional<z.ZodString>;
                            diagnostics: z.ZodOptional<z.ZodArray<z.ZodString>>;
                            explanation: z.ZodString;
                          },
                          z.core.$strip
                        >
                      >;
                    },
                    z.core.$strip
                  >
                >
              >;
              affectedStages: z.ZodArray<
                z.ZodEnum<{
                  parse: "parse";
                  transform: "transform";
                  generate: "generate";
                }>
              >;
              semanticEffect: z.ZodString;
              diagnosticEffect: z.ZodString;
              examples: z.ZodArray<
                z.ZodObject<
                  {
                    title: z.ZodString;
                    input: z.ZodOptional<z.ZodString>;
                    options: z.ZodRecord<z.ZodString, z.ZodUnknown>;
                    output: z.ZodOptional<z.ZodString>;
                    semanticChange: z.ZodOptional<z.ZodString>;
                    diagnostics: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    explanation: z.ZodString;
                  },
                  z.core.$strip
                >
              >;
              supported: z.ZodBoolean;
              experimental: z.ZodOptional<z.ZodBoolean>;
            },
            z.core.$strip
          >
        >;
      },
      z.core.$strip
    >;
    generator: z.ZodObject<
      {
        format: z.ZodString;
        role: z.ZodEnum<{
          parser: "parser";
          transformer: "transformer";
          generator: "generator";
        }>;
        options: z.ZodArray<
          z.ZodObject<
            {
              key: z.ZodString;
              label: z.ZodString;
              description: z.ZodString;
              category: z.ZodEnum<{
                diagnostics: "diagnostics";
                inference: "inference";
                selection: "selection";
                formatting: "formatting";
                output: "output";
                semantics: "semantics";
                extension: "extension";
              }>;
              defaultValue: z.ZodUnknown;
              valueDescriptions: z.ZodOptional<
                z.ZodArray<
                  z.ZodObject<
                    {
                      value: z.ZodUnknown;
                      label: z.ZodString;
                      description: z.ZodString;
                      semanticEffect: z.ZodOptional<z.ZodString>;
                      diagnosticEffect: z.ZodOptional<z.ZodString>;
                      example: z.ZodOptional<
                        z.ZodObject<
                          {
                            title: z.ZodString;
                            input: z.ZodOptional<z.ZodString>;
                            options: z.ZodRecord<z.ZodString, z.ZodUnknown>;
                            output: z.ZodOptional<z.ZodString>;
                            semanticChange: z.ZodOptional<z.ZodString>;
                            diagnostics: z.ZodOptional<z.ZodArray<z.ZodString>>;
                            explanation: z.ZodString;
                          },
                          z.core.$strip
                        >
                      >;
                    },
                    z.core.$strip
                  >
                >
              >;
              affectedStages: z.ZodArray<
                z.ZodEnum<{
                  parse: "parse";
                  transform: "transform";
                  generate: "generate";
                }>
              >;
              semanticEffect: z.ZodString;
              diagnosticEffect: z.ZodString;
              examples: z.ZodArray<
                z.ZodObject<
                  {
                    title: z.ZodString;
                    input: z.ZodOptional<z.ZodString>;
                    options: z.ZodRecord<z.ZodString, z.ZodUnknown>;
                    output: z.ZodOptional<z.ZodString>;
                    semanticChange: z.ZodOptional<z.ZodString>;
                    diagnostics: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    explanation: z.ZodString;
                  },
                  z.core.$strip
                >
              >;
              supported: z.ZodBoolean;
              experimental: z.ZodOptional<z.ZodBoolean>;
            },
            z.core.$strip
          >
        >;
      },
      z.core.$strip
    >;
    transformers: z.ZodDefault<
      z.ZodArray<
        z.ZodObject<
          {
            format: z.ZodString;
            role: z.ZodEnum<{
              parser: "parser";
              transformer: "transformer";
              generator: "generator";
            }>;
            options: z.ZodArray<
              z.ZodObject<
                {
                  key: z.ZodString;
                  label: z.ZodString;
                  description: z.ZodString;
                  category: z.ZodEnum<{
                    diagnostics: "diagnostics";
                    inference: "inference";
                    selection: "selection";
                    formatting: "formatting";
                    output: "output";
                    semantics: "semantics";
                    extension: "extension";
                  }>;
                  defaultValue: z.ZodUnknown;
                  valueDescriptions: z.ZodOptional<
                    z.ZodArray<
                      z.ZodObject<
                        {
                          value: z.ZodUnknown;
                          label: z.ZodString;
                          description: z.ZodString;
                          semanticEffect: z.ZodOptional<z.ZodString>;
                          diagnosticEffect: z.ZodOptional<z.ZodString>;
                          example: z.ZodOptional<
                            z.ZodObject<
                              {
                                title: z.ZodString;
                                input: z.ZodOptional<z.ZodString>;
                                options: z.ZodRecord<z.ZodString, z.ZodUnknown>;
                                output: z.ZodOptional<z.ZodString>;
                                semanticChange: z.ZodOptional<z.ZodString>;
                                diagnostics: z.ZodOptional<
                                  z.ZodArray<z.ZodString>
                                >;
                                explanation: z.ZodString;
                              },
                              z.core.$strip
                            >
                          >;
                        },
                        z.core.$strip
                      >
                    >
                  >;
                  affectedStages: z.ZodArray<
                    z.ZodEnum<{
                      parse: "parse";
                      transform: "transform";
                      generate: "generate";
                    }>
                  >;
                  semanticEffect: z.ZodString;
                  diagnosticEffect: z.ZodString;
                  examples: z.ZodArray<
                    z.ZodObject<
                      {
                        title: z.ZodString;
                        input: z.ZodOptional<z.ZodString>;
                        options: z.ZodRecord<z.ZodString, z.ZodUnknown>;
                        output: z.ZodOptional<z.ZodString>;
                        semanticChange: z.ZodOptional<z.ZodString>;
                        diagnostics: z.ZodOptional<z.ZodArray<z.ZodString>>;
                        explanation: z.ZodString;
                      },
                      z.core.$strip
                    >
                  >;
                  supported: z.ZodBoolean;
                  experimental: z.ZodOptional<z.ZodBoolean>;
                },
                z.core.$strip
              >
            >;
          },
          z.core.$strip
        >
      >
    >;
    irPreference: z.ZodObject<
      {
        key: z.ZodString;
        label: z.ZodString;
        description: z.ZodString;
        category: z.ZodEnum<{
          diagnostics: "diagnostics";
          inference: "inference";
          selection: "selection";
          formatting: "formatting";
          output: "output";
          semantics: "semantics";
          extension: "extension";
        }>;
        defaultValue: z.ZodUnknown;
        valueDescriptions: z.ZodOptional<
          z.ZodArray<
            z.ZodObject<
              {
                value: z.ZodUnknown;
                label: z.ZodString;
                description: z.ZodString;
                semanticEffect: z.ZodOptional<z.ZodString>;
                diagnosticEffect: z.ZodOptional<z.ZodString>;
                example: z.ZodOptional<
                  z.ZodObject<
                    {
                      title: z.ZodString;
                      input: z.ZodOptional<z.ZodString>;
                      options: z.ZodRecord<z.ZodString, z.ZodUnknown>;
                      output: z.ZodOptional<z.ZodString>;
                      semanticChange: z.ZodOptional<z.ZodString>;
                      diagnostics: z.ZodOptional<z.ZodArray<z.ZodString>>;
                      explanation: z.ZodString;
                    },
                    z.core.$strip
                  >
                >;
              },
              z.core.$strip
            >
          >
        >;
        affectedStages: z.ZodArray<
          z.ZodEnum<{
            parse: "parse";
            transform: "transform";
            generate: "generate";
          }>
        >;
        semanticEffect: z.ZodString;
        diagnosticEffect: z.ZodString;
        examples: z.ZodArray<
          z.ZodObject<
            {
              title: z.ZodString;
              input: z.ZodOptional<z.ZodString>;
              options: z.ZodRecord<z.ZodString, z.ZodUnknown>;
              output: z.ZodOptional<z.ZodString>;
              semanticChange: z.ZodOptional<z.ZodString>;
              diagnostics: z.ZodOptional<z.ZodArray<z.ZodString>>;
              explanation: z.ZodString;
            },
            z.core.$strip
          >
        >;
        supported: z.ZodBoolean;
        experimental: z.ZodOptional<z.ZodBoolean>;
      },
      z.core.$strip
    >;
  },
  z.core.$strip
>;
/** Generic registry-aware option catalog contract for custom formats. */
export declare const genericConversionOptionCatalogsSchema: z.ZodObject<
  {
    sourceFormat: z.ZodString;
    targetFormat: z.ZodString;
    parser: z.ZodObject<
      {
        format: z.ZodString;
        role: z.ZodEnum<{
          parser: "parser";
          transformer: "transformer";
          generator: "generator";
        }>;
        options: z.ZodArray<
          z.ZodObject<
            {
              key: z.ZodString;
              label: z.ZodString;
              description: z.ZodString;
              category: z.ZodEnum<{
                diagnostics: "diagnostics";
                inference: "inference";
                selection: "selection";
                formatting: "formatting";
                output: "output";
                semantics: "semantics";
                extension: "extension";
              }>;
              defaultValue: z.ZodUnknown;
              valueDescriptions: z.ZodOptional<
                z.ZodArray<
                  z.ZodObject<
                    {
                      value: z.ZodUnknown;
                      label: z.ZodString;
                      description: z.ZodString;
                      semanticEffect: z.ZodOptional<z.ZodString>;
                      diagnosticEffect: z.ZodOptional<z.ZodString>;
                      example: z.ZodOptional<
                        z.ZodObject<
                          {
                            title: z.ZodString;
                            input: z.ZodOptional<z.ZodString>;
                            options: z.ZodRecord<z.ZodString, z.ZodUnknown>;
                            output: z.ZodOptional<z.ZodString>;
                            semanticChange: z.ZodOptional<z.ZodString>;
                            diagnostics: z.ZodOptional<z.ZodArray<z.ZodString>>;
                            explanation: z.ZodString;
                          },
                          z.core.$strip
                        >
                      >;
                    },
                    z.core.$strip
                  >
                >
              >;
              affectedStages: z.ZodArray<
                z.ZodEnum<{
                  parse: "parse";
                  transform: "transform";
                  generate: "generate";
                }>
              >;
              semanticEffect: z.ZodString;
              diagnosticEffect: z.ZodString;
              examples: z.ZodArray<
                z.ZodObject<
                  {
                    title: z.ZodString;
                    input: z.ZodOptional<z.ZodString>;
                    options: z.ZodRecord<z.ZodString, z.ZodUnknown>;
                    output: z.ZodOptional<z.ZodString>;
                    semanticChange: z.ZodOptional<z.ZodString>;
                    diagnostics: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    explanation: z.ZodString;
                  },
                  z.core.$strip
                >
              >;
              supported: z.ZodBoolean;
              experimental: z.ZodOptional<z.ZodBoolean>;
            },
            z.core.$strip
          >
        >;
      },
      z.core.$strip
    >;
    generator: z.ZodObject<
      {
        format: z.ZodString;
        role: z.ZodEnum<{
          parser: "parser";
          transformer: "transformer";
          generator: "generator";
        }>;
        options: z.ZodArray<
          z.ZodObject<
            {
              key: z.ZodString;
              label: z.ZodString;
              description: z.ZodString;
              category: z.ZodEnum<{
                diagnostics: "diagnostics";
                inference: "inference";
                selection: "selection";
                formatting: "formatting";
                output: "output";
                semantics: "semantics";
                extension: "extension";
              }>;
              defaultValue: z.ZodUnknown;
              valueDescriptions: z.ZodOptional<
                z.ZodArray<
                  z.ZodObject<
                    {
                      value: z.ZodUnknown;
                      label: z.ZodString;
                      description: z.ZodString;
                      semanticEffect: z.ZodOptional<z.ZodString>;
                      diagnosticEffect: z.ZodOptional<z.ZodString>;
                      example: z.ZodOptional<
                        z.ZodObject<
                          {
                            title: z.ZodString;
                            input: z.ZodOptional<z.ZodString>;
                            options: z.ZodRecord<z.ZodString, z.ZodUnknown>;
                            output: z.ZodOptional<z.ZodString>;
                            semanticChange: z.ZodOptional<z.ZodString>;
                            diagnostics: z.ZodOptional<z.ZodArray<z.ZodString>>;
                            explanation: z.ZodString;
                          },
                          z.core.$strip
                        >
                      >;
                    },
                    z.core.$strip
                  >
                >
              >;
              affectedStages: z.ZodArray<
                z.ZodEnum<{
                  parse: "parse";
                  transform: "transform";
                  generate: "generate";
                }>
              >;
              semanticEffect: z.ZodString;
              diagnosticEffect: z.ZodString;
              examples: z.ZodArray<
                z.ZodObject<
                  {
                    title: z.ZodString;
                    input: z.ZodOptional<z.ZodString>;
                    options: z.ZodRecord<z.ZodString, z.ZodUnknown>;
                    output: z.ZodOptional<z.ZodString>;
                    semanticChange: z.ZodOptional<z.ZodString>;
                    diagnostics: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    explanation: z.ZodString;
                  },
                  z.core.$strip
                >
              >;
              supported: z.ZodBoolean;
              experimental: z.ZodOptional<z.ZodBoolean>;
            },
            z.core.$strip
          >
        >;
      },
      z.core.$strip
    >;
    transformers: z.ZodDefault<
      z.ZodArray<
        z.ZodObject<
          {
            format: z.ZodString;
            role: z.ZodEnum<{
              parser: "parser";
              transformer: "transformer";
              generator: "generator";
            }>;
            options: z.ZodArray<
              z.ZodObject<
                {
                  key: z.ZodString;
                  label: z.ZodString;
                  description: z.ZodString;
                  category: z.ZodEnum<{
                    diagnostics: "diagnostics";
                    inference: "inference";
                    selection: "selection";
                    formatting: "formatting";
                    output: "output";
                    semantics: "semantics";
                    extension: "extension";
                  }>;
                  defaultValue: z.ZodUnknown;
                  valueDescriptions: z.ZodOptional<
                    z.ZodArray<
                      z.ZodObject<
                        {
                          value: z.ZodUnknown;
                          label: z.ZodString;
                          description: z.ZodString;
                          semanticEffect: z.ZodOptional<z.ZodString>;
                          diagnosticEffect: z.ZodOptional<z.ZodString>;
                          example: z.ZodOptional<
                            z.ZodObject<
                              {
                                title: z.ZodString;
                                input: z.ZodOptional<z.ZodString>;
                                options: z.ZodRecord<z.ZodString, z.ZodUnknown>;
                                output: z.ZodOptional<z.ZodString>;
                                semanticChange: z.ZodOptional<z.ZodString>;
                                diagnostics: z.ZodOptional<
                                  z.ZodArray<z.ZodString>
                                >;
                                explanation: z.ZodString;
                              },
                              z.core.$strip
                            >
                          >;
                        },
                        z.core.$strip
                      >
                    >
                  >;
                  affectedStages: z.ZodArray<
                    z.ZodEnum<{
                      parse: "parse";
                      transform: "transform";
                      generate: "generate";
                    }>
                  >;
                  semanticEffect: z.ZodString;
                  diagnosticEffect: z.ZodString;
                  examples: z.ZodArray<
                    z.ZodObject<
                      {
                        title: z.ZodString;
                        input: z.ZodOptional<z.ZodString>;
                        options: z.ZodRecord<z.ZodString, z.ZodUnknown>;
                        output: z.ZodOptional<z.ZodString>;
                        semanticChange: z.ZodOptional<z.ZodString>;
                        diagnostics: z.ZodOptional<z.ZodArray<z.ZodString>>;
                        explanation: z.ZodString;
                      },
                      z.core.$strip
                    >
                  >;
                  supported: z.ZodBoolean;
                  experimental: z.ZodOptional<z.ZodBoolean>;
                },
                z.core.$strip
              >
            >;
          },
          z.core.$strip
        >
      >
    >;
    irPreference: z.ZodObject<
      {
        key: z.ZodString;
        label: z.ZodString;
        description: z.ZodString;
        category: z.ZodEnum<{
          diagnostics: "diagnostics";
          inference: "inference";
          selection: "selection";
          formatting: "formatting";
          output: "output";
          semantics: "semantics";
          extension: "extension";
        }>;
        defaultValue: z.ZodUnknown;
        valueDescriptions: z.ZodOptional<
          z.ZodArray<
            z.ZodObject<
              {
                value: z.ZodUnknown;
                label: z.ZodString;
                description: z.ZodString;
                semanticEffect: z.ZodOptional<z.ZodString>;
                diagnosticEffect: z.ZodOptional<z.ZodString>;
                example: z.ZodOptional<
                  z.ZodObject<
                    {
                      title: z.ZodString;
                      input: z.ZodOptional<z.ZodString>;
                      options: z.ZodRecord<z.ZodString, z.ZodUnknown>;
                      output: z.ZodOptional<z.ZodString>;
                      semanticChange: z.ZodOptional<z.ZodString>;
                      diagnostics: z.ZodOptional<z.ZodArray<z.ZodString>>;
                      explanation: z.ZodString;
                    },
                    z.core.$strip
                  >
                >;
              },
              z.core.$strip
            >
          >
        >;
        affectedStages: z.ZodArray<
          z.ZodEnum<{
            parse: "parse";
            transform: "transform";
            generate: "generate";
          }>
        >;
        semanticEffect: z.ZodString;
        diagnosticEffect: z.ZodString;
        examples: z.ZodArray<
          z.ZodObject<
            {
              title: z.ZodString;
              input: z.ZodOptional<z.ZodString>;
              options: z.ZodRecord<z.ZodString, z.ZodUnknown>;
              output: z.ZodOptional<z.ZodString>;
              semanticChange: z.ZodOptional<z.ZodString>;
              diagnostics: z.ZodOptional<z.ZodArray<z.ZodString>>;
              explanation: z.ZodString;
            },
            z.core.$strip
          >
        >;
        supported: z.ZodBoolean;
        experimental: z.ZodOptional<z.ZodBoolean>;
      },
      z.core.$strip
    >;
  },
  z.core.$strip
>;
export declare const schemaDiagnosticSchema: z.ZodObject<
  {
    severity: z.ZodEnum<{
      error: "error";
      warning: "warning";
      info: "info";
    }>;
    code: z.ZodString;
    message: z.ZodString;
    path: z.ZodOptional<z.ZodArray<z.ZodString>>;
    nodeKind: z.ZodOptional<z.ZodString>;
    source: z.ZodOptional<z.ZodString>;
    evidence: z.ZodOptional<z.ZodUnknown>;
  },
  z.core.$strip
>;
export declare const semanticLossSchema: z.ZodObject<
  {
    code: z.ZodString;
    message: z.ZodString;
    severity: z.ZodEnum<{
      error: "error";
      warning: "warning";
      info: "info";
    }>;
    phase: z.ZodEnum<{
      parse: "parse";
      transform: "transform";
      generate: "generate";
    }>;
    lostCapability: z.ZodString;
    sourcePath: z.ZodOptional<z.ZodArray<z.ZodString>>;
    targetFormat: z.ZodOptional<z.ZodString>;
    evidence: z.ZodOptional<z.ZodUnknown>;
  },
  z.core.$strip
>;
export declare const conversionRouteSchema: z.ZodObject<
  {
    sourceFormat: z.ZodString;
    targetFormat: z.ZodString;
    irSequence: z.ZodArray<
      z.ZodEnum<{
        value: "value";
        shape: "shape";
        constraint: "constraint";
      }>
    >;
    stages: z.ZodArray<
      z.ZodObject<
        {
          kind: z.ZodEnum<{
            "parse-source": "parse-source";
            "lower-to-value": "lower-to-value";
            "infer-shape": "infer-shape";
            "derive-constraints": "derive-constraints";
            "transform-ir": "transform-ir";
            "generate-target": "generate-target";
          }>;
          from: z.ZodString;
          to: z.ZodString;
          ir: z.ZodOptional<
            z.ZodEnum<{
              value: "value";
              shape: "shape";
              constraint: "constraint";
            }>
          >;
        },
        z.core.$strip
      >
    >;
  },
  z.core.$strip
>;
export declare const conversionSemanticCaveatSchema: z.ZodObject<
  {
    phase: z.ZodEnum<{
      parse: "parse";
      transform: "transform";
      generate: "generate";
    }>;
    kind: z.ZodEnum<{
      normalization: "normalization";
      loss: "loss";
      widening: "widening";
    }>;
    code: z.ZodString;
    message: z.ZodString;
    source: z.ZodOptional<z.ZodString>;
    path: z.ZodOptional<z.ZodArray<z.ZodString>>;
    layer: z.ZodOptional<
      z.ZodEnum<{
        value: "value";
        shape: "shape";
        constraint: "constraint";
        target: "target";
      }>
    >;
    evidence: z.ZodOptional<z.ZodUnknown>;
  },
  z.core.$strip
>;
export declare const conversionPolicyDecisionSchema: z.ZodObject<
  {
    phase: z.ZodEnum<{
      parse: "parse";
      transform: "transform";
      generate: "generate";
    }>;
    code: z.ZodString;
    message: z.ZodString;
    source: z.ZodOptional<z.ZodString>;
    path: z.ZodOptional<z.ZodArray<z.ZodString>>;
    evidence: z.ZodOptional<z.ZodUnknown>;
  },
  z.core.$strip
>;
export declare const conversionEntrySelectionSchema: z.ZodObject<
  {
    mode: z.ZodLiteral<"implicit">;
    entry: z.ZodString;
    strategyCode: z.ZodString;
    source: z.ZodOptional<z.ZodString>;
    path: z.ZodOptional<z.ZodArray<z.ZodString>>;
    evidence: z.ZodOptional<z.ZodUnknown>;
  },
  z.core.$strip
>;
export declare const conversionCapabilityRequirementSchema: z.ZodObject<
  {
    feature: z.ZodString;
    path: z.ZodArray<z.ZodString>;
    lexicalDefinitionName: z.ZodOptional<z.ZodString>;
    containingDefinitionName: z.ZodOptional<z.ZodString>;
    referenceStack: z.ZodArray<z.ZodString>;
    evidence: z.ZodOptional<z.ZodUnknown>;
  },
  z.core.$strip
>;
export declare const conversionLossHotspotSchema: z.ZodObject<
  {
    code: z.ZodString;
    path: z.ZodArray<z.ZodString>;
    lexicalDefinitionName: z.ZodOptional<z.ZodString>;
    containingDefinitionName: z.ZodOptional<z.ZodString>;
    referenceStack: z.ZodArray<z.ZodString>;
    evidence: z.ZodOptional<z.ZodUnknown>;
  },
  z.core.$strip
>;
export declare const conversionReportSchema: z.ZodObject<
  {
    irSelection: z.ZodOptional<
      z.ZodObject<
        {
          requested: z.ZodEnum<{
            value: "value";
            shape: "shape";
            auto: "auto";
          }>;
          selected: z.ZodEnum<{
            value: "value";
            shape: "shape";
          }>;
          fallback: z.ZodBoolean;
        },
        z.core.$strip
      >
    >;
    diagnostics: z.ZodOptional<
      z.ZodObject<
        {
          parse: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  severity: z.ZodEnum<{
                    error: "error";
                    warning: "warning";
                    info: "info";
                  }>;
                  code: z.ZodString;
                  message: z.ZodString;
                  path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                  nodeKind: z.ZodOptional<z.ZodString>;
                  source: z.ZodOptional<z.ZodString>;
                  evidence: z.ZodOptional<z.ZodUnknown>;
                },
                z.core.$strip
              >
            >
          >;
          transform: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  severity: z.ZodEnum<{
                    error: "error";
                    warning: "warning";
                    info: "info";
                  }>;
                  code: z.ZodString;
                  message: z.ZodString;
                  path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                  nodeKind: z.ZodOptional<z.ZodString>;
                  source: z.ZodOptional<z.ZodString>;
                  evidence: z.ZodOptional<z.ZodUnknown>;
                },
                z.core.$strip
              >
            >
          >;
          generate: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  severity: z.ZodEnum<{
                    error: "error";
                    warning: "warning";
                    info: "info";
                  }>;
                  code: z.ZodString;
                  message: z.ZodString;
                  path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                  nodeKind: z.ZodOptional<z.ZodString>;
                  source: z.ZodOptional<z.ZodString>;
                  evidence: z.ZodOptional<z.ZodUnknown>;
                },
                z.core.$strip
              >
            >
          >;
          all: z.ZodArray<
            z.ZodObject<
              {
                severity: z.ZodEnum<{
                  error: "error";
                  warning: "warning";
                  info: "info";
                }>;
                code: z.ZodString;
                message: z.ZodString;
                path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                nodeKind: z.ZodOptional<z.ZodString>;
                source: z.ZodOptional<z.ZodString>;
                evidence: z.ZodOptional<z.ZodUnknown>;
              },
              z.core.$strip
            >
          >;
        },
        z.core.$strip
      >
    >;
    losses: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            code: z.ZodString;
            message: z.ZodString;
            severity: z.ZodEnum<{
              error: "error";
              warning: "warning";
              info: "info";
            }>;
            phase: z.ZodEnum<{
              parse: "parse";
              transform: "transform";
              generate: "generate";
            }>;
            lostCapability: z.ZodString;
            sourcePath: z.ZodOptional<z.ZodArray<z.ZodString>>;
            targetFormat: z.ZodOptional<z.ZodString>;
            evidence: z.ZodOptional<z.ZodUnknown>;
          },
          z.core.$strip
        >
      >
    >;
    preservedCapabilities: z.ZodOptional<z.ZodArray<z.ZodString>>;
    semanticNotes: z.ZodOptional<
      z.ZodObject<
        {
          parse: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  kind: z.ZodEnum<{
                    normalization: "normalization";
                    loss: "loss";
                    widening: "widening";
                    policy: "policy";
                  }>;
                  code: z.ZodString;
                  message: z.ZodString;
                  path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                  nodeKind: z.ZodOptional<z.ZodString>;
                  source: z.ZodOptional<z.ZodString>;
                  layer: z.ZodOptional<
                    z.ZodEnum<{
                      value: "value";
                      shape: "shape";
                      constraint: "constraint";
                      target: "target";
                    }>
                  >;
                  evidence: z.ZodOptional<z.ZodUnknown>;
                },
                z.core.$strip
              >
            >
          >;
          transform: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  kind: z.ZodEnum<{
                    normalization: "normalization";
                    loss: "loss";
                    widening: "widening";
                    policy: "policy";
                  }>;
                  code: z.ZodString;
                  message: z.ZodString;
                  path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                  nodeKind: z.ZodOptional<z.ZodString>;
                  source: z.ZodOptional<z.ZodString>;
                  layer: z.ZodOptional<
                    z.ZodEnum<{
                      value: "value";
                      shape: "shape";
                      constraint: "constraint";
                      target: "target";
                    }>
                  >;
                  evidence: z.ZodOptional<z.ZodUnknown>;
                },
                z.core.$strip
              >
            >
          >;
          generate: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  kind: z.ZodEnum<{
                    normalization: "normalization";
                    loss: "loss";
                    widening: "widening";
                    policy: "policy";
                  }>;
                  code: z.ZodString;
                  message: z.ZodString;
                  path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                  nodeKind: z.ZodOptional<z.ZodString>;
                  source: z.ZodOptional<z.ZodString>;
                  layer: z.ZodOptional<
                    z.ZodEnum<{
                      value: "value";
                      shape: "shape";
                      constraint: "constraint";
                      target: "target";
                    }>
                  >;
                  evidence: z.ZodOptional<z.ZodUnknown>;
                },
                z.core.$strip
              >
            >
          >;
          all: z.ZodArray<
            z.ZodObject<
              {
                kind: z.ZodEnum<{
                  normalization: "normalization";
                  loss: "loss";
                  widening: "widening";
                  policy: "policy";
                }>;
                code: z.ZodString;
                message: z.ZodString;
                path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                nodeKind: z.ZodOptional<z.ZodString>;
                source: z.ZodOptional<z.ZodString>;
                layer: z.ZodOptional<
                  z.ZodEnum<{
                    value: "value";
                    shape: "shape";
                    constraint: "constraint";
                    target: "target";
                  }>
                >;
                evidence: z.ZodOptional<z.ZodUnknown>;
              },
              z.core.$strip
            >
          >;
        },
        z.core.$strip
      >
    >;
    semanticCaveats: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            phase: z.ZodEnum<{
              parse: "parse";
              transform: "transform";
              generate: "generate";
            }>;
            kind: z.ZodEnum<{
              normalization: "normalization";
              loss: "loss";
              widening: "widening";
            }>;
            code: z.ZodString;
            message: z.ZodString;
            source: z.ZodOptional<z.ZodString>;
            path: z.ZodOptional<z.ZodArray<z.ZodString>>;
            layer: z.ZodOptional<
              z.ZodEnum<{
                value: "value";
                shape: "shape";
                constraint: "constraint";
                target: "target";
              }>
            >;
            evidence: z.ZodOptional<z.ZodUnknown>;
          },
          z.core.$strip
        >
      >
    >;
    capabilityRequirements: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            feature: z.ZodString;
            path: z.ZodArray<z.ZodString>;
            lexicalDefinitionName: z.ZodOptional<z.ZodString>;
            containingDefinitionName: z.ZodOptional<z.ZodString>;
            referenceStack: z.ZodArray<z.ZodString>;
            evidence: z.ZodOptional<z.ZodUnknown>;
          },
          z.core.$strip
        >
      >
    >;
    lossHotspots: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            code: z.ZodString;
            path: z.ZodArray<z.ZodString>;
            lexicalDefinitionName: z.ZodOptional<z.ZodString>;
            containingDefinitionName: z.ZodOptional<z.ZodString>;
            referenceStack: z.ZodArray<z.ZodString>;
            evidence: z.ZodOptional<z.ZodUnknown>;
          },
          z.core.$strip
        >
      >
    >;
    policyDecisions: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            phase: z.ZodEnum<{
              parse: "parse";
              transform: "transform";
              generate: "generate";
            }>;
            code: z.ZodString;
            message: z.ZodString;
            source: z.ZodOptional<z.ZodString>;
            path: z.ZodOptional<z.ZodArray<z.ZodString>>;
            evidence: z.ZodOptional<z.ZodUnknown>;
          },
          z.core.$strip
        >
      >
    >;
    entrySelection: z.ZodOptional<
      z.ZodObject<
        {
          mode: z.ZodLiteral<"implicit">;
          entry: z.ZodString;
          strategyCode: z.ZodString;
          source: z.ZodOptional<z.ZodString>;
          path: z.ZodOptional<z.ZodArray<z.ZodString>>;
          evidence: z.ZodOptional<z.ZodUnknown>;
        },
        z.core.$strip
      >
    >;
  },
  z.core.$strip
>;
export declare const conversionArtifactsSchema: z.ZodObject<
  {
    value: z.ZodOptional<z.ZodUnknown>;
    shape: z.ZodOptional<z.ZodUnknown>;
    constraints: z.ZodOptional<z.ZodUnknown>;
  },
  z.core.$strip
>;
export declare const convertSuccessResultSchema: z.ZodObject<
  {
    ok: z.ZodLiteral<true>;
    output: z.ZodUnion<
      readonly [
        z.ZodString,
        z.ZodRecord<z.ZodString, z.ZodUnknown>,
        z.ZodBoolean,
      ]
    >;
    plan: z.ZodObject<
      {
        sourceFormat: z.ZodString;
        targetFormat: z.ZodString;
        irSequence: z.ZodArray<
          z.ZodEnum<{
            value: "value";
            shape: "shape";
            constraint: "constraint";
          }>
        >;
        stages: z.ZodArray<
          z.ZodObject<
            {
              kind: z.ZodEnum<{
                "parse-source": "parse-source";
                "lower-to-value": "lower-to-value";
                "infer-shape": "infer-shape";
                "derive-constraints": "derive-constraints";
                "transform-ir": "transform-ir";
                "generate-target": "generate-target";
              }>;
              from: z.ZodString;
              to: z.ZodString;
              ir: z.ZodOptional<
                z.ZodEnum<{
                  value: "value";
                  shape: "shape";
                  constraint: "constraint";
                }>
              >;
            },
            z.core.$strip
          >
        >;
      },
      z.core.$strip
    >;
    report: z.ZodOptional<
      z.ZodObject<
        {
          irSelection: z.ZodOptional<
            z.ZodObject<
              {
                requested: z.ZodEnum<{
                  value: "value";
                  shape: "shape";
                  auto: "auto";
                }>;
                selected: z.ZodEnum<{
                  value: "value";
                  shape: "shape";
                }>;
                fallback: z.ZodBoolean;
              },
              z.core.$strip
            >
          >;
          diagnostics: z.ZodOptional<
            z.ZodObject<
              {
                parse: z.ZodOptional<
                  z.ZodArray<
                    z.ZodObject<
                      {
                        severity: z.ZodEnum<{
                          error: "error";
                          warning: "warning";
                          info: "info";
                        }>;
                        code: z.ZodString;
                        message: z.ZodString;
                        path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                        nodeKind: z.ZodOptional<z.ZodString>;
                        source: z.ZodOptional<z.ZodString>;
                        evidence: z.ZodOptional<z.ZodUnknown>;
                      },
                      z.core.$strip
                    >
                  >
                >;
                transform: z.ZodOptional<
                  z.ZodArray<
                    z.ZodObject<
                      {
                        severity: z.ZodEnum<{
                          error: "error";
                          warning: "warning";
                          info: "info";
                        }>;
                        code: z.ZodString;
                        message: z.ZodString;
                        path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                        nodeKind: z.ZodOptional<z.ZodString>;
                        source: z.ZodOptional<z.ZodString>;
                        evidence: z.ZodOptional<z.ZodUnknown>;
                      },
                      z.core.$strip
                    >
                  >
                >;
                generate: z.ZodOptional<
                  z.ZodArray<
                    z.ZodObject<
                      {
                        severity: z.ZodEnum<{
                          error: "error";
                          warning: "warning";
                          info: "info";
                        }>;
                        code: z.ZodString;
                        message: z.ZodString;
                        path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                        nodeKind: z.ZodOptional<z.ZodString>;
                        source: z.ZodOptional<z.ZodString>;
                        evidence: z.ZodOptional<z.ZodUnknown>;
                      },
                      z.core.$strip
                    >
                  >
                >;
                all: z.ZodArray<
                  z.ZodObject<
                    {
                      severity: z.ZodEnum<{
                        error: "error";
                        warning: "warning";
                        info: "info";
                      }>;
                      code: z.ZodString;
                      message: z.ZodString;
                      path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                      nodeKind: z.ZodOptional<z.ZodString>;
                      source: z.ZodOptional<z.ZodString>;
                      evidence: z.ZodOptional<z.ZodUnknown>;
                    },
                    z.core.$strip
                  >
                >;
              },
              z.core.$strip
            >
          >;
          losses: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  code: z.ZodString;
                  message: z.ZodString;
                  severity: z.ZodEnum<{
                    error: "error";
                    warning: "warning";
                    info: "info";
                  }>;
                  phase: z.ZodEnum<{
                    parse: "parse";
                    transform: "transform";
                    generate: "generate";
                  }>;
                  lostCapability: z.ZodString;
                  sourcePath: z.ZodOptional<z.ZodArray<z.ZodString>>;
                  targetFormat: z.ZodOptional<z.ZodString>;
                  evidence: z.ZodOptional<z.ZodUnknown>;
                },
                z.core.$strip
              >
            >
          >;
          preservedCapabilities: z.ZodOptional<z.ZodArray<z.ZodString>>;
          semanticNotes: z.ZodOptional<
            z.ZodObject<
              {
                parse: z.ZodOptional<
                  z.ZodArray<
                    z.ZodObject<
                      {
                        kind: z.ZodEnum<{
                          normalization: "normalization";
                          loss: "loss";
                          widening: "widening";
                          policy: "policy";
                        }>;
                        code: z.ZodString;
                        message: z.ZodString;
                        path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                        nodeKind: z.ZodOptional<z.ZodString>;
                        source: z.ZodOptional<z.ZodString>;
                        layer: z.ZodOptional<
                          z.ZodEnum<{
                            value: "value";
                            shape: "shape";
                            constraint: "constraint";
                            target: "target";
                          }>
                        >;
                        evidence: z.ZodOptional<z.ZodUnknown>;
                      },
                      z.core.$strip
                    >
                  >
                >;
                transform: z.ZodOptional<
                  z.ZodArray<
                    z.ZodObject<
                      {
                        kind: z.ZodEnum<{
                          normalization: "normalization";
                          loss: "loss";
                          widening: "widening";
                          policy: "policy";
                        }>;
                        code: z.ZodString;
                        message: z.ZodString;
                        path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                        nodeKind: z.ZodOptional<z.ZodString>;
                        source: z.ZodOptional<z.ZodString>;
                        layer: z.ZodOptional<
                          z.ZodEnum<{
                            value: "value";
                            shape: "shape";
                            constraint: "constraint";
                            target: "target";
                          }>
                        >;
                        evidence: z.ZodOptional<z.ZodUnknown>;
                      },
                      z.core.$strip
                    >
                  >
                >;
                generate: z.ZodOptional<
                  z.ZodArray<
                    z.ZodObject<
                      {
                        kind: z.ZodEnum<{
                          normalization: "normalization";
                          loss: "loss";
                          widening: "widening";
                          policy: "policy";
                        }>;
                        code: z.ZodString;
                        message: z.ZodString;
                        path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                        nodeKind: z.ZodOptional<z.ZodString>;
                        source: z.ZodOptional<z.ZodString>;
                        layer: z.ZodOptional<
                          z.ZodEnum<{
                            value: "value";
                            shape: "shape";
                            constraint: "constraint";
                            target: "target";
                          }>
                        >;
                        evidence: z.ZodOptional<z.ZodUnknown>;
                      },
                      z.core.$strip
                    >
                  >
                >;
                all: z.ZodArray<
                  z.ZodObject<
                    {
                      kind: z.ZodEnum<{
                        normalization: "normalization";
                        loss: "loss";
                        widening: "widening";
                        policy: "policy";
                      }>;
                      code: z.ZodString;
                      message: z.ZodString;
                      path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                      nodeKind: z.ZodOptional<z.ZodString>;
                      source: z.ZodOptional<z.ZodString>;
                      layer: z.ZodOptional<
                        z.ZodEnum<{
                          value: "value";
                          shape: "shape";
                          constraint: "constraint";
                          target: "target";
                        }>
                      >;
                      evidence: z.ZodOptional<z.ZodUnknown>;
                    },
                    z.core.$strip
                  >
                >;
              },
              z.core.$strip
            >
          >;
          semanticCaveats: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  phase: z.ZodEnum<{
                    parse: "parse";
                    transform: "transform";
                    generate: "generate";
                  }>;
                  kind: z.ZodEnum<{
                    normalization: "normalization";
                    loss: "loss";
                    widening: "widening";
                  }>;
                  code: z.ZodString;
                  message: z.ZodString;
                  source: z.ZodOptional<z.ZodString>;
                  path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                  layer: z.ZodOptional<
                    z.ZodEnum<{
                      value: "value";
                      shape: "shape";
                      constraint: "constraint";
                      target: "target";
                    }>
                  >;
                  evidence: z.ZodOptional<z.ZodUnknown>;
                },
                z.core.$strip
              >
            >
          >;
          capabilityRequirements: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  feature: z.ZodString;
                  path: z.ZodArray<z.ZodString>;
                  lexicalDefinitionName: z.ZodOptional<z.ZodString>;
                  containingDefinitionName: z.ZodOptional<z.ZodString>;
                  referenceStack: z.ZodArray<z.ZodString>;
                  evidence: z.ZodOptional<z.ZodUnknown>;
                },
                z.core.$strip
              >
            >
          >;
          lossHotspots: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  code: z.ZodString;
                  path: z.ZodArray<z.ZodString>;
                  lexicalDefinitionName: z.ZodOptional<z.ZodString>;
                  containingDefinitionName: z.ZodOptional<z.ZodString>;
                  referenceStack: z.ZodArray<z.ZodString>;
                  evidence: z.ZodOptional<z.ZodUnknown>;
                },
                z.core.$strip
              >
            >
          >;
          policyDecisions: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  phase: z.ZodEnum<{
                    parse: "parse";
                    transform: "transform";
                    generate: "generate";
                  }>;
                  code: z.ZodString;
                  message: z.ZodString;
                  source: z.ZodOptional<z.ZodString>;
                  path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                  evidence: z.ZodOptional<z.ZodUnknown>;
                },
                z.core.$strip
              >
            >
          >;
          entrySelection: z.ZodOptional<
            z.ZodObject<
              {
                mode: z.ZodLiteral<"implicit">;
                entry: z.ZodString;
                strategyCode: z.ZodString;
                source: z.ZodOptional<z.ZodString>;
                path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                evidence: z.ZodOptional<z.ZodUnknown>;
              },
              z.core.$strip
            >
          >;
        },
        z.core.$strip
      >
    >;
    artifacts: z.ZodOptional<
      z.ZodObject<
        {
          value: z.ZodOptional<z.ZodUnknown>;
          shape: z.ZodOptional<z.ZodUnknown>;
          constraints: z.ZodOptional<z.ZodUnknown>;
        },
        z.core.$strip
      >
    >;
    diagnostics: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            severity: z.ZodEnum<{
              error: "error";
              warning: "warning";
              info: "info";
            }>;
            code: z.ZodString;
            message: z.ZodString;
            path: z.ZodOptional<z.ZodArray<z.ZodString>>;
            nodeKind: z.ZodOptional<z.ZodString>;
            source: z.ZodOptional<z.ZodString>;
            evidence: z.ZodOptional<z.ZodUnknown>;
          },
          z.core.$strip
        >
      >
    >;
    losses: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            code: z.ZodString;
            message: z.ZodString;
            severity: z.ZodEnum<{
              error: "error";
              warning: "warning";
              info: "info";
            }>;
            phase: z.ZodEnum<{
              parse: "parse";
              transform: "transform";
              generate: "generate";
            }>;
            lostCapability: z.ZodString;
            sourcePath: z.ZodOptional<z.ZodArray<z.ZodString>>;
            targetFormat: z.ZodOptional<z.ZodString>;
            evidence: z.ZodOptional<z.ZodUnknown>;
          },
          z.core.$strip
        >
      >
    >;
    preservedCapabilities: z.ZodOptional<z.ZodArray<z.ZodString>>;
    semanticNotes: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            kind: z.ZodEnum<{
              normalization: "normalization";
              loss: "loss";
              widening: "widening";
              policy: "policy";
            }>;
            code: z.ZodString;
            message: z.ZodString;
            path: z.ZodOptional<z.ZodArray<z.ZodString>>;
            nodeKind: z.ZodOptional<z.ZodString>;
            source: z.ZodOptional<z.ZodString>;
            layer: z.ZodOptional<
              z.ZodEnum<{
                value: "value";
                shape: "shape";
                constraint: "constraint";
                target: "target";
              }>
            >;
            evidence: z.ZodOptional<z.ZodUnknown>;
          },
          z.core.$strip
        >
      >
    >;
  },
  z.core.$strip
>;
export declare const convertFailureResultSchema: z.ZodObject<
  {
    ok: z.ZodLiteral<false>;
    code: z.ZodString;
    message: z.ZodString;
    phase: z.ZodEnum<{
      parse: "parse";
      transform: "transform";
      generate: "generate";
    }>;
    plan: z.ZodObject<
      {
        sourceFormat: z.ZodString;
        targetFormat: z.ZodString;
        irSequence: z.ZodArray<
          z.ZodEnum<{
            value: "value";
            shape: "shape";
            constraint: "constraint";
          }>
        >;
        stages: z.ZodArray<
          z.ZodObject<
            {
              kind: z.ZodEnum<{
                "parse-source": "parse-source";
                "lower-to-value": "lower-to-value";
                "infer-shape": "infer-shape";
                "derive-constraints": "derive-constraints";
                "transform-ir": "transform-ir";
                "generate-target": "generate-target";
              }>;
              from: z.ZodString;
              to: z.ZodString;
              ir: z.ZodOptional<
                z.ZodEnum<{
                  value: "value";
                  shape: "shape";
                  constraint: "constraint";
                }>
              >;
            },
            z.core.$strip
          >
        >;
      },
      z.core.$strip
    >;
    diagnostics: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            severity: z.ZodEnum<{
              error: "error";
              warning: "warning";
              info: "info";
            }>;
            code: z.ZodString;
            message: z.ZodString;
            path: z.ZodOptional<z.ZodArray<z.ZodString>>;
            nodeKind: z.ZodOptional<z.ZodString>;
            source: z.ZodOptional<z.ZodString>;
            evidence: z.ZodOptional<z.ZodUnknown>;
          },
          z.core.$strip
        >
      >
    >;
    artifacts: z.ZodOptional<
      z.ZodObject<
        {
          value: z.ZodOptional<z.ZodUnknown>;
          shape: z.ZodOptional<z.ZodUnknown>;
          constraints: z.ZodOptional<z.ZodUnknown>;
        },
        z.core.$strip
      >
    >;
    losses: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            code: z.ZodString;
            message: z.ZodString;
            severity: z.ZodEnum<{
              error: "error";
              warning: "warning";
              info: "info";
            }>;
            phase: z.ZodEnum<{
              parse: "parse";
              transform: "transform";
              generate: "generate";
            }>;
            lostCapability: z.ZodString;
            sourcePath: z.ZodOptional<z.ZodArray<z.ZodString>>;
            targetFormat: z.ZodOptional<z.ZodString>;
            evidence: z.ZodOptional<z.ZodUnknown>;
          },
          z.core.$strip
        >
      >
    >;
    semanticNotes: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            kind: z.ZodEnum<{
              normalization: "normalization";
              loss: "loss";
              widening: "widening";
              policy: "policy";
            }>;
            code: z.ZodString;
            message: z.ZodString;
            path: z.ZodOptional<z.ZodArray<z.ZodString>>;
            nodeKind: z.ZodOptional<z.ZodString>;
            source: z.ZodOptional<z.ZodString>;
            layer: z.ZodOptional<
              z.ZodEnum<{
                value: "value";
                shape: "shape";
                constraint: "constraint";
                target: "target";
              }>
            >;
            evidence: z.ZodOptional<z.ZodUnknown>;
          },
          z.core.$strip
        >
      >
    >;
  },
  z.core.$strip
>;
export declare const publicConvertResultSchema: z.ZodDiscriminatedUnion<
  [
    z.ZodObject<
      {
        ok: z.ZodLiteral<true>;
        output: z.ZodUnion<
          readonly [
            z.ZodString,
            z.ZodRecord<z.ZodString, z.ZodUnknown>,
            z.ZodBoolean,
          ]
        >;
        plan: z.ZodObject<
          {
            sourceFormat: z.ZodString;
            targetFormat: z.ZodString;
            irSequence: z.ZodArray<
              z.ZodEnum<{
                value: "value";
                shape: "shape";
                constraint: "constraint";
              }>
            >;
            stages: z.ZodArray<
              z.ZodObject<
                {
                  kind: z.ZodEnum<{
                    "parse-source": "parse-source";
                    "lower-to-value": "lower-to-value";
                    "infer-shape": "infer-shape";
                    "derive-constraints": "derive-constraints";
                    "transform-ir": "transform-ir";
                    "generate-target": "generate-target";
                  }>;
                  from: z.ZodString;
                  to: z.ZodString;
                  ir: z.ZodOptional<
                    z.ZodEnum<{
                      value: "value";
                      shape: "shape";
                      constraint: "constraint";
                    }>
                  >;
                },
                z.core.$strip
              >
            >;
          },
          z.core.$strip
        >;
        report: z.ZodOptional<
          z.ZodObject<
            {
              irSelection: z.ZodOptional<
                z.ZodObject<
                  {
                    requested: z.ZodEnum<{
                      value: "value";
                      shape: "shape";
                      auto: "auto";
                    }>;
                    selected: z.ZodEnum<{
                      value: "value";
                      shape: "shape";
                    }>;
                    fallback: z.ZodBoolean;
                  },
                  z.core.$strip
                >
              >;
              diagnostics: z.ZodOptional<
                z.ZodObject<
                  {
                    parse: z.ZodOptional<
                      z.ZodArray<
                        z.ZodObject<
                          {
                            severity: z.ZodEnum<{
                              error: "error";
                              warning: "warning";
                              info: "info";
                            }>;
                            code: z.ZodString;
                            message: z.ZodString;
                            path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                            nodeKind: z.ZodOptional<z.ZodString>;
                            source: z.ZodOptional<z.ZodString>;
                            evidence: z.ZodOptional<z.ZodUnknown>;
                          },
                          z.core.$strip
                        >
                      >
                    >;
                    transform: z.ZodOptional<
                      z.ZodArray<
                        z.ZodObject<
                          {
                            severity: z.ZodEnum<{
                              error: "error";
                              warning: "warning";
                              info: "info";
                            }>;
                            code: z.ZodString;
                            message: z.ZodString;
                            path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                            nodeKind: z.ZodOptional<z.ZodString>;
                            source: z.ZodOptional<z.ZodString>;
                            evidence: z.ZodOptional<z.ZodUnknown>;
                          },
                          z.core.$strip
                        >
                      >
                    >;
                    generate: z.ZodOptional<
                      z.ZodArray<
                        z.ZodObject<
                          {
                            severity: z.ZodEnum<{
                              error: "error";
                              warning: "warning";
                              info: "info";
                            }>;
                            code: z.ZodString;
                            message: z.ZodString;
                            path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                            nodeKind: z.ZodOptional<z.ZodString>;
                            source: z.ZodOptional<z.ZodString>;
                            evidence: z.ZodOptional<z.ZodUnknown>;
                          },
                          z.core.$strip
                        >
                      >
                    >;
                    all: z.ZodArray<
                      z.ZodObject<
                        {
                          severity: z.ZodEnum<{
                            error: "error";
                            warning: "warning";
                            info: "info";
                          }>;
                          code: z.ZodString;
                          message: z.ZodString;
                          path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                          nodeKind: z.ZodOptional<z.ZodString>;
                          source: z.ZodOptional<z.ZodString>;
                          evidence: z.ZodOptional<z.ZodUnknown>;
                        },
                        z.core.$strip
                      >
                    >;
                  },
                  z.core.$strip
                >
              >;
              losses: z.ZodOptional<
                z.ZodArray<
                  z.ZodObject<
                    {
                      code: z.ZodString;
                      message: z.ZodString;
                      severity: z.ZodEnum<{
                        error: "error";
                        warning: "warning";
                        info: "info";
                      }>;
                      phase: z.ZodEnum<{
                        parse: "parse";
                        transform: "transform";
                        generate: "generate";
                      }>;
                      lostCapability: z.ZodString;
                      sourcePath: z.ZodOptional<z.ZodArray<z.ZodString>>;
                      targetFormat: z.ZodOptional<z.ZodString>;
                      evidence: z.ZodOptional<z.ZodUnknown>;
                    },
                    z.core.$strip
                  >
                >
              >;
              preservedCapabilities: z.ZodOptional<z.ZodArray<z.ZodString>>;
              semanticNotes: z.ZodOptional<
                z.ZodObject<
                  {
                    parse: z.ZodOptional<
                      z.ZodArray<
                        z.ZodObject<
                          {
                            kind: z.ZodEnum<{
                              normalization: "normalization";
                              loss: "loss";
                              widening: "widening";
                              policy: "policy";
                            }>;
                            code: z.ZodString;
                            message: z.ZodString;
                            path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                            nodeKind: z.ZodOptional<z.ZodString>;
                            source: z.ZodOptional<z.ZodString>;
                            layer: z.ZodOptional<
                              z.ZodEnum<{
                                value: "value";
                                shape: "shape";
                                constraint: "constraint";
                                target: "target";
                              }>
                            >;
                            evidence: z.ZodOptional<z.ZodUnknown>;
                          },
                          z.core.$strip
                        >
                      >
                    >;
                    transform: z.ZodOptional<
                      z.ZodArray<
                        z.ZodObject<
                          {
                            kind: z.ZodEnum<{
                              normalization: "normalization";
                              loss: "loss";
                              widening: "widening";
                              policy: "policy";
                            }>;
                            code: z.ZodString;
                            message: z.ZodString;
                            path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                            nodeKind: z.ZodOptional<z.ZodString>;
                            source: z.ZodOptional<z.ZodString>;
                            layer: z.ZodOptional<
                              z.ZodEnum<{
                                value: "value";
                                shape: "shape";
                                constraint: "constraint";
                                target: "target";
                              }>
                            >;
                            evidence: z.ZodOptional<z.ZodUnknown>;
                          },
                          z.core.$strip
                        >
                      >
                    >;
                    generate: z.ZodOptional<
                      z.ZodArray<
                        z.ZodObject<
                          {
                            kind: z.ZodEnum<{
                              normalization: "normalization";
                              loss: "loss";
                              widening: "widening";
                              policy: "policy";
                            }>;
                            code: z.ZodString;
                            message: z.ZodString;
                            path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                            nodeKind: z.ZodOptional<z.ZodString>;
                            source: z.ZodOptional<z.ZodString>;
                            layer: z.ZodOptional<
                              z.ZodEnum<{
                                value: "value";
                                shape: "shape";
                                constraint: "constraint";
                                target: "target";
                              }>
                            >;
                            evidence: z.ZodOptional<z.ZodUnknown>;
                          },
                          z.core.$strip
                        >
                      >
                    >;
                    all: z.ZodArray<
                      z.ZodObject<
                        {
                          kind: z.ZodEnum<{
                            normalization: "normalization";
                            loss: "loss";
                            widening: "widening";
                            policy: "policy";
                          }>;
                          code: z.ZodString;
                          message: z.ZodString;
                          path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                          nodeKind: z.ZodOptional<z.ZodString>;
                          source: z.ZodOptional<z.ZodString>;
                          layer: z.ZodOptional<
                            z.ZodEnum<{
                              value: "value";
                              shape: "shape";
                              constraint: "constraint";
                              target: "target";
                            }>
                          >;
                          evidence: z.ZodOptional<z.ZodUnknown>;
                        },
                        z.core.$strip
                      >
                    >;
                  },
                  z.core.$strip
                >
              >;
              semanticCaveats: z.ZodOptional<
                z.ZodArray<
                  z.ZodObject<
                    {
                      phase: z.ZodEnum<{
                        parse: "parse";
                        transform: "transform";
                        generate: "generate";
                      }>;
                      kind: z.ZodEnum<{
                        normalization: "normalization";
                        loss: "loss";
                        widening: "widening";
                      }>;
                      code: z.ZodString;
                      message: z.ZodString;
                      source: z.ZodOptional<z.ZodString>;
                      path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                      layer: z.ZodOptional<
                        z.ZodEnum<{
                          value: "value";
                          shape: "shape";
                          constraint: "constraint";
                          target: "target";
                        }>
                      >;
                      evidence: z.ZodOptional<z.ZodUnknown>;
                    },
                    z.core.$strip
                  >
                >
              >;
              capabilityRequirements: z.ZodOptional<
                z.ZodArray<
                  z.ZodObject<
                    {
                      feature: z.ZodString;
                      path: z.ZodArray<z.ZodString>;
                      lexicalDefinitionName: z.ZodOptional<z.ZodString>;
                      containingDefinitionName: z.ZodOptional<z.ZodString>;
                      referenceStack: z.ZodArray<z.ZodString>;
                      evidence: z.ZodOptional<z.ZodUnknown>;
                    },
                    z.core.$strip
                  >
                >
              >;
              lossHotspots: z.ZodOptional<
                z.ZodArray<
                  z.ZodObject<
                    {
                      code: z.ZodString;
                      path: z.ZodArray<z.ZodString>;
                      lexicalDefinitionName: z.ZodOptional<z.ZodString>;
                      containingDefinitionName: z.ZodOptional<z.ZodString>;
                      referenceStack: z.ZodArray<z.ZodString>;
                      evidence: z.ZodOptional<z.ZodUnknown>;
                    },
                    z.core.$strip
                  >
                >
              >;
              policyDecisions: z.ZodOptional<
                z.ZodArray<
                  z.ZodObject<
                    {
                      phase: z.ZodEnum<{
                        parse: "parse";
                        transform: "transform";
                        generate: "generate";
                      }>;
                      code: z.ZodString;
                      message: z.ZodString;
                      source: z.ZodOptional<z.ZodString>;
                      path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                      evidence: z.ZodOptional<z.ZodUnknown>;
                    },
                    z.core.$strip
                  >
                >
              >;
              entrySelection: z.ZodOptional<
                z.ZodObject<
                  {
                    mode: z.ZodLiteral<"implicit">;
                    entry: z.ZodString;
                    strategyCode: z.ZodString;
                    source: z.ZodOptional<z.ZodString>;
                    path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    evidence: z.ZodOptional<z.ZodUnknown>;
                  },
                  z.core.$strip
                >
              >;
            },
            z.core.$strip
          >
        >;
        artifacts: z.ZodOptional<
          z.ZodObject<
            {
              value: z.ZodOptional<z.ZodUnknown>;
              shape: z.ZodOptional<z.ZodUnknown>;
              constraints: z.ZodOptional<z.ZodUnknown>;
            },
            z.core.$strip
          >
        >;
        diagnostics: z.ZodOptional<
          z.ZodArray<
            z.ZodObject<
              {
                severity: z.ZodEnum<{
                  error: "error";
                  warning: "warning";
                  info: "info";
                }>;
                code: z.ZodString;
                message: z.ZodString;
                path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                nodeKind: z.ZodOptional<z.ZodString>;
                source: z.ZodOptional<z.ZodString>;
                evidence: z.ZodOptional<z.ZodUnknown>;
              },
              z.core.$strip
            >
          >
        >;
        losses: z.ZodOptional<
          z.ZodArray<
            z.ZodObject<
              {
                code: z.ZodString;
                message: z.ZodString;
                severity: z.ZodEnum<{
                  error: "error";
                  warning: "warning";
                  info: "info";
                }>;
                phase: z.ZodEnum<{
                  parse: "parse";
                  transform: "transform";
                  generate: "generate";
                }>;
                lostCapability: z.ZodString;
                sourcePath: z.ZodOptional<z.ZodArray<z.ZodString>>;
                targetFormat: z.ZodOptional<z.ZodString>;
                evidence: z.ZodOptional<z.ZodUnknown>;
              },
              z.core.$strip
            >
          >
        >;
        preservedCapabilities: z.ZodOptional<z.ZodArray<z.ZodString>>;
        semanticNotes: z.ZodOptional<
          z.ZodArray<
            z.ZodObject<
              {
                kind: z.ZodEnum<{
                  normalization: "normalization";
                  loss: "loss";
                  widening: "widening";
                  policy: "policy";
                }>;
                code: z.ZodString;
                message: z.ZodString;
                path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                nodeKind: z.ZodOptional<z.ZodString>;
                source: z.ZodOptional<z.ZodString>;
                layer: z.ZodOptional<
                  z.ZodEnum<{
                    value: "value";
                    shape: "shape";
                    constraint: "constraint";
                    target: "target";
                  }>
                >;
                evidence: z.ZodOptional<z.ZodUnknown>;
              },
              z.core.$strip
            >
          >
        >;
      },
      z.core.$strip
    >,
    z.ZodObject<
      {
        ok: z.ZodLiteral<false>;
        code: z.ZodString;
        message: z.ZodString;
        phase: z.ZodEnum<{
          parse: "parse";
          transform: "transform";
          generate: "generate";
        }>;
        plan: z.ZodObject<
          {
            sourceFormat: z.ZodString;
            targetFormat: z.ZodString;
            irSequence: z.ZodArray<
              z.ZodEnum<{
                value: "value";
                shape: "shape";
                constraint: "constraint";
              }>
            >;
            stages: z.ZodArray<
              z.ZodObject<
                {
                  kind: z.ZodEnum<{
                    "parse-source": "parse-source";
                    "lower-to-value": "lower-to-value";
                    "infer-shape": "infer-shape";
                    "derive-constraints": "derive-constraints";
                    "transform-ir": "transform-ir";
                    "generate-target": "generate-target";
                  }>;
                  from: z.ZodString;
                  to: z.ZodString;
                  ir: z.ZodOptional<
                    z.ZodEnum<{
                      value: "value";
                      shape: "shape";
                      constraint: "constraint";
                    }>
                  >;
                },
                z.core.$strip
              >
            >;
          },
          z.core.$strip
        >;
        diagnostics: z.ZodOptional<
          z.ZodArray<
            z.ZodObject<
              {
                severity: z.ZodEnum<{
                  error: "error";
                  warning: "warning";
                  info: "info";
                }>;
                code: z.ZodString;
                message: z.ZodString;
                path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                nodeKind: z.ZodOptional<z.ZodString>;
                source: z.ZodOptional<z.ZodString>;
                evidence: z.ZodOptional<z.ZodUnknown>;
              },
              z.core.$strip
            >
          >
        >;
        artifacts: z.ZodOptional<
          z.ZodObject<
            {
              value: z.ZodOptional<z.ZodUnknown>;
              shape: z.ZodOptional<z.ZodUnknown>;
              constraints: z.ZodOptional<z.ZodUnknown>;
            },
            z.core.$strip
          >
        >;
        losses: z.ZodOptional<
          z.ZodArray<
            z.ZodObject<
              {
                code: z.ZodString;
                message: z.ZodString;
                severity: z.ZodEnum<{
                  error: "error";
                  warning: "warning";
                  info: "info";
                }>;
                phase: z.ZodEnum<{
                  parse: "parse";
                  transform: "transform";
                  generate: "generate";
                }>;
                lostCapability: z.ZodString;
                sourcePath: z.ZodOptional<z.ZodArray<z.ZodString>>;
                targetFormat: z.ZodOptional<z.ZodString>;
                evidence: z.ZodOptional<z.ZodUnknown>;
              },
              z.core.$strip
            >
          >
        >;
        semanticNotes: z.ZodOptional<
          z.ZodArray<
            z.ZodObject<
              {
                kind: z.ZodEnum<{
                  normalization: "normalization";
                  loss: "loss";
                  widening: "widening";
                  policy: "policy";
                }>;
                code: z.ZodString;
                message: z.ZodString;
                path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                nodeKind: z.ZodOptional<z.ZodString>;
                source: z.ZodOptional<z.ZodString>;
                layer: z.ZodOptional<
                  z.ZodEnum<{
                    value: "value";
                    shape: "shape";
                    constraint: "constraint";
                    target: "target";
                  }>
                >;
                evidence: z.ZodOptional<z.ZodUnknown>;
              },
              z.core.$strip
            >
          >
        >;
      },
      z.core.$strip
    >,
  ],
  "ok"
>;
```

## packages/sdk/src/registry.d.ts

```ts
import { DescriptorRegistryError as DescriptorRegistrationError } from "@schema-transformation-toolkit/core";
import type {
  ConversionRoute,
  ConversionRouteCapabilities,
  EntryIrKind,
  GeneratorCapabilities,
  GeneratorDescriptor,
  IrDocument,
  IrKind,
  IrPipelinePlan,
  IrTransformerDescriptor,
  OverlayIrKind,
  ParserCapabilities,
  ParserDescriptor,
  PipelineStage,
  ValueRootKind,
  DescriptorRegistryErrorCode,
} from "@schema-transformation-toolkit/core";
import type {
  ConversionFormat,
  ConversionIrPreference,
  ConversionRegistry,
} from "./types.js";
export type { DescriptorRegistryErrorCode as DescriptorRegistrationErrorCode };
export type ConversionRouteErrorCode =
  "unsupported-route" | "unsupported-ir-preference";
export declare class ConversionRouteError extends Error {
  readonly code: ConversionRouteErrorCode;
  constructor(code: ConversionRouteErrorCode, message: string);
}
export { DescriptorRegistrationError };
export interface NormalizedGeneratorCapabilities {
  entryIr: EntryIrKind[];
  overlays: OverlayIrKind[];
  valueRootKinds?: ValueRootKind[];
  entries: import("@schema-transformation-toolkit/core").IrInputContract[];
}
type RegisteredGeneratorDescriptor = GeneratorDescriptor<
  never,
  unknown,
  unknown
>;
type RegisteredTransformerDescriptor = IrTransformerDescriptor;
export declare function createConversionRegistry(options?: {
  parsers?: ParserDescriptor[];
  generators?: RegisteredGeneratorDescriptor[];
  transformers?: RegisteredTransformerDescriptor[];
}): ConversionRegistry;
export declare const defaultConversionRegistry: ConversionRegistry;
export declare function listConversionRoutes(
  registry?: ConversionRegistry,
): ConversionRoute[];
export declare function planConversion(
  sourceFormat: ConversionFormat,
  targetFormat: ConversionFormat,
  registryOrPreference?: ConversionRegistry | ConversionIrPreference,
  providedRegistry?: ConversionRegistry,
): ConversionRoute;
export interface ConversionExecutionPlan {
  route: ConversionRoute;
  pipelinePlan: IrPipelinePlan;
  selectedIr: Exclude<ConversionIrPreference, "auto">;
  requestedIr: ConversionIrPreference;
  fallback: boolean;
  requiresShapeInference: boolean;
  requiresConstraintInference: boolean;
  generatorInputIr: Exclude<ConversionIrPreference, "auto">;
  parserRequestedIr: readonly IrKind[];
  transformerIds: readonly string[];
}
/** @deprecated Use ConversionExecutionPlan. */
export type ConversionRouteDecision = ConversionExecutionPlan;
export declare function resolveConversionRouteDecision(
  sourceFormat: ConversionFormat,
  targetFormat: ConversionFormat,
  irPreference?: ConversionIrPreference,
  registry?: ConversionRegistry,
): ConversionExecutionPlan;
export declare function describeConversionRouteCapabilities(
  sourceFormat: ConversionFormat,
  targetFormat: ConversionFormat,
  registry?: ConversionRegistry,
): ConversionRouteCapabilities;
export declare function routeUsesIr(
  route: ConversionRoute,
  irKind: IrKind,
): boolean;
export declare function routeStages(route: ConversionRoute): PipelineStage[];
export declare function resolveParserCapabilities(
  sourceFormat: ConversionFormat,
  registry?: ConversionRegistry,
): ParserCapabilities;
export declare function resolveGeneratorCapabilities(
  targetFormat: ConversionFormat,
  registry?: ConversionRegistry,
): GeneratorCapabilities;
export declare function resolveParserDescriptor(
  sourceFormat: ConversionFormat,
  registry?: ConversionRegistry,
): ParserDescriptor;
export declare function resolveGeneratorDescriptor<TOutput = unknown>(
  targetFormat: ConversionFormat,
  registry?: ConversionRegistry,
): GeneratorDescriptor<IrDocument, TOutput, unknown>;
export declare function resolveTransformerDescriptor(
  id: string,
  registry?: ConversionRegistry,
): IrTransformerDescriptor;
export declare function resolveNormalizedGeneratorCapabilities(
  targetFormat: ConversionFormat,
  registry?: ConversionRegistry,
): NormalizedGeneratorCapabilities;
```

## packages/sdk/src/support-matrix.d.ts

```ts
import type {
  ConversionCapability,
  GeneratorCapabilities,
  ParserCapabilities,
} from "@schema-transformation-toolkit/core";
import type { ConversionFormat, ConversionRegistry } from "./types.js";
export type ConsumerSurfaceFormat = ConversionFormat;
export interface ParserSupportSummary {
  producesIr: ParserCapabilities["producesIr"];
  capabilities: ConversionCapability[];
}
export interface GeneratorSupportSummary {
  consumesIr: GeneratorCapabilities["consumesIr"];
  entryIr: NonNullable<GeneratorCapabilities["entryIr"]>;
  overlays: NonNullable<GeneratorCapabilities["overlays"]>;
  capabilities: ConversionCapability[];
}
export interface FormatSupportSummary {
  format: ConsumerSurfaceFormat;
  parser?: ParserSupportSummary;
  generator?: GeneratorSupportSummary;
  sharedShapeKinds: string[];
  constraintFamilies: string[];
  notableLimitations: string[];
  experimentalAreas: string[];
}
export declare function describeFormatSupport(
  format: ConsumerSurfaceFormat,
  registry?: ConversionRegistry,
): FormatSupportSummary;
export declare function listFormatSupports(
  registry?: ConversionRegistry,
): FormatSupportSummary[];
/** Lists formats that can be selected as conversion sources. */
export declare function listSourceFormatSupports(
  registry?: ConversionRegistry,
): FormatSupportSummary[];
/** Lists formats that can be selected as conversion targets. */
export declare function listTargetFormatSupports(
  registry?: ConversionRegistry,
): FormatSupportSummary[];
```

## packages/sdk/src/types.d.ts

```ts
import type {
  ConversionCapability,
  ConversionReport,
  ConversionIrPreference as CoreConversionIrPreference,
  ConstraintDocument,
  SchemaDiagnostic,
  SchemaDocument,
  SchemaSemanticNote,
  SemanticLoss,
  ValueDocument,
  ConversionRoute,
  ParserDescriptor,
  GeneratorDescriptor,
  IrTransformerDescriptor,
} from "@schema-transformation-toolkit/core";
import type {
  BuiltinGeneratorOptions,
  BuiltinGeneratorOutputs,
  BuiltinParserOptions,
} from "./builtin-types.js";
export type { BuiltinGeneratorOutputs } from "./builtin-types.js";
export type {
  BuiltinSourceFormat,
  BuiltinTargetFormat,
} from "./builtin-formats.js";
export type ConversionIrPreference = CoreConversionIrPreference;
/** Registry-driven format identity. Builtin format aliases remain available for compatibility. */
export type ConversionFormat = string;
export type ConversionSourceFormat = ConversionFormat;
export type ConversionTargetFormat = ConversionFormat;
export type RegistryOutputMap = object;
export type RegistryConversionOutput<
  TTarget extends string,
  TOutputs extends RegistryOutputMap,
> = TTarget extends keyof TOutputs ? TOutputs[TTarget] : unknown;
export type ConversionOutput<
  TTarget extends string,
  TExtensions extends RegistryOutputMap = Record<never, never>,
> = RegistryConversionOutput<TTarget, BuiltinGeneratorOutputs & TExtensions>;
export interface ExtensionConversionOptions {
  parser?: Record<string, unknown>;
  transformer?: Record<string, unknown>;
  generator?: Record<string, unknown>;
}
export interface GenericConvertAdvancedOptions {
  parser?: unknown;
  transformer?: Record<string, unknown>;
  generator?: unknown;
}
export interface ConversionRegistry {
  registerParser(descriptor: ParserDescriptor): void;
  registerGenerator(
    descriptor: GeneratorDescriptor<never, unknown, unknown>,
  ): void;
  listParsers(): ParserDescriptor[];
  listGenerators(): GeneratorDescriptor<never, unknown, unknown>[];
  registerTransformer?(descriptor: IrTransformerDescriptor): void;
  listTransformers?(): IrTransformerDescriptor[];
  parser?(format: string): ParserDescriptor;
  generator?(format: string): GeneratorDescriptor<never, unknown, unknown>;
  transformer?(id: string): IrTransformerDescriptor;
}
export interface ConvertAdvancedOptions {
  parser?: BuiltinParserOptions;
  transformer?: Record<string, unknown>;
  generator?: BuiltinGeneratorOptions;
}
export interface ConvertOptions {
  sourceFormat: ConversionSourceFormat;
  targetFormat: ConversionTargetFormat;
  input: string;
  name?: string;
  irPreference?: ConversionIrPreference;
  includeArtifacts?: boolean;
  advanced?: ConvertAdvancedOptions | GenericConvertAdvancedOptions;
  extension?: ExtensionConversionOptions;
}
export interface ConversionArtifacts {
  value?: ValueDocument;
  shape?: SchemaDocument;
  constraints?: ConstraintDocument;
}
export interface ConvertSuccessResult<
  TOutput = string | BuiltinGeneratorOutputs[keyof BuiltinGeneratorOutputs],
> {
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
  phase: "parse" | "transform" | "generate";
  plan: ConversionRoute;
  diagnostics?: SchemaDiagnostic[];
  artifacts?: ConversionArtifacts;
  losses?: SemanticLoss[];
  semanticNotes?: SchemaSemanticNote[];
}
export type ConvertResult<
  TOutput = string | BuiltinGeneratorOutputs[keyof BuiltinGeneratorOutputs],
> = ConvertSuccessResult<TOutput> | ConvertFailureResult;
```

## packages/sdk/src/typescript-compatibility.d.ts

```ts
export { analyzeImplicitEntryFromSource } from "@schema-transformation-toolkit/parser-typescript";
export type {
  TypeScriptImplicitEntryAmbiguityReason,
  TypeScriptImplicitEntryAnalysis,
} from "@schema-transformation-toolkit/parser-typescript";
```

## packages/sdk/src/ui-diagnostics.d.ts

```ts
import type { ConvertResult } from "./types.js";
export interface UserFacingSourcePosition {
  offset: number;
  line: number;
  column: number;
}
export interface UserFacingSourceRange {
  start: UserFacingSourcePosition;
  end: UserFacingSourcePosition;
  length?: number;
}
export interface UserFacingDiagnostic {
  severity: "error" | "warning" | "info";
  code: string;
  title: string;
  message: string;
  path?: string;
  source?: string;
  sourceRange?: UserFacingSourceRange;
  suggestion?: string;
  technicalDetails?: unknown;
}
export declare function collectUserFacingDiagnostics<TOutput>(
  result: ConvertResult<TOutput>,
): UserFacingDiagnostic[];
```

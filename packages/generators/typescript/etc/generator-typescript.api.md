# API Snapshot: @aio/generator-typescript

Entry: packages/generators/typescript/src/index.ts

## packages/generators/typescript/src/api.d.ts

```ts
import type { SchemaDocument, SchemaGenerator } from "@aio/core";
import type { TypeScriptGenerateResult } from "./failure.js";
import {
  type ConfiguredTypeScriptGenerator,
  DEFAULT_TYPESCRIPT_GENERATOR_OPTIONS,
  type ResolvedTypeScriptGeneratorOptions,
  type TypeScriptGeneratorOptions,
} from "./options.js";
/** Renders a schema document to TypeScript source or throws on generation failure. */
export declare function generateTypeScript(
  doc: SchemaDocument,
  options?: TypeScriptGeneratorOptions,
): string;
/** Renders a schema document to TypeScript source and returns a structured success or failure result. */
export declare function tryGenerateTypeScript(
  doc: SchemaDocument,
  options?: TypeScriptGeneratorOptions,
): TypeScriptGenerateResult;
/** Creates a TypeScript generator instance with fixed base options. */
export declare function createTypeScriptGenerator(
  options?: TypeScriptGeneratorOptions,
): SchemaGenerator<
  string,
  TypeScriptGeneratorOptions,
  TypeScriptGenerateResult
>;
/** Prepares options and returns both the configured TypeScript generator and its prepared option state. */
export declare function configureTypeScriptGenerator(
  options?: TypeScriptGeneratorOptions,
): ConfiguredTypeScriptGenerator;
/** Shared default TypeScript generator instance using the default options. */
export declare const typeScriptGenerator: SchemaGenerator<
  string,
  TypeScriptGeneratorOptions,
  TypeScriptGenerateResult
>;
/** Prepared default option state for the shared TypeScript generator instance. */
export declare const preparedTypeScriptGeneratorOptions: import("@aio/core").PreparedOptions<ResolvedTypeScriptGeneratorOptions>;
export { DEFAULT_TYPESCRIPT_GENERATOR_OPTIONS };
```

## packages/generators/typescript/src/capabilities.d.ts

```ts
import type { GeneratorCapabilities } from "@aio/core";
export declare const typeScriptGeneratorCapabilities: GeneratorCapabilities;
```

## packages/generators/typescript/src/failure.d.ts

```ts
import type { GenerateFailureResult, GenerateSuccessResult } from "@aio/core";
export type TypeScriptGeneratorFailureCode =
  | "invalid-type-name"
  | "invalid-field-name"
  | "invalid-reference-name"
  | "unsupported-node-kind";
export type TypeScriptGenerateFailureResult =
  GenerateFailureResult<TypeScriptGeneratorFailureCode>;
export type TypeScriptGenerateResult =
  GenerateSuccessResult<string> | TypeScriptGenerateFailureResult;
```

## packages/generators/typescript/src/index.d.ts

```ts
export {
  DEFAULT_TYPESCRIPT_GENERATOR_OPTIONS,
  configureTypeScriptGenerator,
  createTypeScriptGenerator,
  generateTypeScript,
  preparedTypeScriptGeneratorOptions,
  tryGenerateTypeScript,
  typeScriptGenerator,
} from "./api.js";
export { typeScriptGeneratorCapabilities } from "./capabilities.js";
export {
  prepareTypeScriptGeneratorOptions,
  resolveTypeScriptGeneratorOptions,
  validateTypeScriptGeneratorOptions,
} from "./options.js";
export type {
  ConfiguredTypeScriptGenerator,
  ResolvedTypeScriptGeneratorOptions,
  TypeScriptArrayStyle,
  TypeScriptGeneratorOptions,
  TypeScriptRootObjectMode,
} from "./options.js";
export type {
  TypeScriptGenerateFailureResult,
  TypeScriptGenerateResult,
  TypeScriptGeneratorFailureCode,
} from "./failure.js";
```

## packages/generators/typescript/src/options.d.ts

```ts
import type {
  ConfiguredGenerator,
  GenerateOptions,
  PreparedOptions,
  SchemaGenerator,
} from "@aio/core";
import type { NamingStrategy } from "@aio/core";
import type { TypeScriptGenerateResult } from "./failure.js";
export type TypeScriptRootObjectMode = "interface" | "type";
export type TypeScriptArrayStyle = "smart" | "compact" | "generic";
export interface TypeScriptGeneratorOptions extends GenerateOptions {
  namingStrategy?: NamingStrategy;
  rootObjectMode?: TypeScriptRootObjectMode;
  arrayStyle?: TypeScriptArrayStyle;
}
export interface ResolvedTypeScriptGeneratorOptions {
  namingStrategy: NamingStrategy;
  rootObjectMode: TypeScriptRootObjectMode;
  arrayStyle: TypeScriptArrayStyle;
}
export declare const DEFAULT_TYPESCRIPT_GENERATOR_OPTIONS: ResolvedTypeScriptGeneratorOptions;
export declare function resolveTypeScriptGeneratorOptions(
  options?: TypeScriptGeneratorOptions,
): ResolvedTypeScriptGeneratorOptions;
export declare function prepareTypeScriptGeneratorOptions(
  options?: TypeScriptGeneratorOptions,
): PreparedOptions<ResolvedTypeScriptGeneratorOptions>;
export declare function validateTypeScriptGeneratorOptions(
  options: ResolvedTypeScriptGeneratorOptions,
): string[];
export type ConfiguredTypeScriptGenerator = ConfiguredGenerator<
  SchemaGenerator<string, TypeScriptGeneratorOptions, TypeScriptGenerateResult>,
  ResolvedTypeScriptGeneratorOptions
>;
```

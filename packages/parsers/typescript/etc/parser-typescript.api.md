# API Snapshot: @aio/parser-typescript

Entry: packages/parsers/typescript/src/index.ts

## packages/parsers/typescript/src/api.d.ts

```ts
import type {
  ParseFailureResult,
  SchemaDiagnostic,
  SchemaDocument,
  SchemaSemanticNote,
} from "@aio/core";
import {
  type ResolvedTypeScriptParseOptions,
  type TypeScriptParseOptions,
} from "./options.js";
export interface TypeScriptInferenceSuccessResult {
  ok: true;
  document: SchemaDocument;
  diagnostics?: SchemaDiagnostic[];
  semanticNotes?: SchemaSemanticNote[];
}
export type TypeScriptInferenceFailureResult = ParseFailureResult<
  | "missing-typescript-entry"
  | "missing-typescript-entry-declaration"
  | "missing-typescript-property-type"
  | "unsupported-typescript-enum-member-initializer"
  | "unsupported-typescript-entry-declaration-kind"
  | "unsupported-typescript-export-all-entry"
  | "unsupported-typescript-conditional-type"
  | "unsupported-typescript-function-type"
  | "unsupported-typescript-imported-type-reference"
  | "unsupported-typescript-interface-heritage"
  | "unsupported-typescript-intersection-type"
  | "unsupported-typescript-mapped-type"
  | "unsupported-typescript-namespace-import-reference"
  | "unsupported-typescript-parser-v0"
  | "unsupported-typescript-property-name"
  | "unsupported-typescript-reexported-entry"
  | "unsupported-typescript-record-key"
  | "unsupported-typescript-syntax"
  | "unsupported-typescript-top-level-module-statement"
  | "unsupported-typescript-tuple-rest-element"
  | "unsupported-typescript-type-member"
  | "unsupported-typescript-type-reference"
>;
export type TypeScriptInferenceResult =
  TypeScriptInferenceSuccessResult | TypeScriptInferenceFailureResult;
/** Parses TypeScript source and returns the inferred schema document or throws on failure. */
export declare function inferTypeScriptDocument(
  input: string,
  name?: string,
): SchemaDocument;
/** Parses TypeScript source with explicit parser options and returns the inferred schema document or throws on failure. */
export declare function inferTypeScriptDocumentWithOptions(
  input: string,
  options?: TypeScriptParseOptions,
): SchemaDocument;
/** Parses TypeScript source and returns a structured success or failure result. */
export declare function tryInferTypeScriptDocument(
  input: string,
  name?: string,
): TypeScriptInferenceResult;
/** Parses TypeScript source with explicit parser options and returns a structured success or failure result. */
export declare function tryInferTypeScriptDocumentWithOptions(
  input: string,
  options?: TypeScriptParseOptions,
): TypeScriptInferenceResult;
/** Shared default TypeScript parser instance using the default v0 options. */
export declare const typeScriptParser: import("@aio/core").SchemaParser<
  string,
  TypeScriptParseOptions,
  TypeScriptInferenceResult
>;
/** Prepared default option state for the shared TypeScript parser instance. */
export declare const preparedTypeScriptParserOptions: import("@aio/core").PreparedOptions<ResolvedTypeScriptParseOptions>;
```

## packages/parsers/typescript/src/capabilities.d.ts

```ts
import type { ParserCapabilities } from "@aio/core";
export declare const typeScriptParserCapabilities: ParserCapabilities;
```

## packages/parsers/typescript/src/errors.d.ts

```ts
import type { SchemaDiagnostic } from "@aio/core";
export type TypeScriptInferenceErrorCode =
  | "unsupported-typescript-enum-member-initializer"
  | "unsupported-typescript-entry-declaration-kind"
  | "unsupported-typescript-conditional-type"
  | "unsupported-typescript-function-type"
  | "unsupported-typescript-imported-type-reference"
  | "unsupported-typescript-interface-heritage"
  | "unsupported-typescript-intersection-type"
  | "unsupported-typescript-mapped-type"
  | "unsupported-typescript-namespace-import-reference"
  | "unsupported-typescript-property-name"
  | "unsupported-typescript-reexported-entry"
  | "unsupported-typescript-record-key"
  | "unsupported-typescript-syntax"
  | "unsupported-typescript-tuple-rest-element"
  | "unsupported-typescript-type-member"
  | "unsupported-typescript-type-reference"
  | "missing-typescript-property-type";
export declare class TypeScriptInferenceError extends Error {
  readonly code: TypeScriptInferenceErrorCode;
  readonly diagnostics: SchemaDiagnostic[] | undefined;
  constructor(
    code: TypeScriptInferenceErrorCode,
    message: string,
    diagnostics?: SchemaDiagnostic[],
  );
}
export declare function isTypeScriptInferenceError(
  error: unknown,
): error is TypeScriptInferenceError;
export declare function throwTypeScriptInferenceError(
  code: TypeScriptInferenceErrorCode,
  message: string,
  diagnostics: SchemaDiagnostic[],
): never;
```

## packages/parsers/typescript/src/implicit-entry.d.ts

```ts
import type { TypeScriptEntryDeclaration } from "./types.js";
/**
 * Ambiguity reasons are intentionally narrow and mutually exclusive.
 *
 * They answer "why could preprocess not choose an implicit entry?" after all
 * supported single-file root-discovery rules have been attempted.
 *
 * Taxonomy:
 * - `multiple-exported-root-candidates`: exported declarations still expose
 *   more than one plausible public root.
 * - `multiple-local-root-candidates`: exported declarations do not disambiguate,
 *   and the local declaration graph still has multiple plausible roots.
 * - `cyclic-root-candidates`: no declaration root exists because every
 *   declaration participates in a cycle or is consumed by one.
 */
export type TypeScriptImplicitEntryAmbiguityReason =
  | "multiple-exported-root-candidates"
  | "multiple-local-root-candidates"
  | "cyclic-root-candidates";
/**
 * Selection reasons are ordered from strongest source-based evidence to the
 * weakest still-acceptable conservative tie-breaker.
 *
 * Taxonomy:
 * - `single-declaration`: the file has exactly one supported declaration.
 * - `single-exported-declaration`: the file has multiple declarations but only
 *   one exported supported declaration.
 * - `single-exported-root`: exported declarations exist, and their exported
 *   dependency graph collapses to one root.
 * - `single-root`: exported declarations do not help, but the local dependency
 *   graph still collapses to one root.
 * - `document-name-match`: root discovery remains ambiguous until a custom
 *   `...Document` name matches exactly one root candidate.
 */
export type TypeScriptImplicitEntrySelectionReason =
  | "single-declaration"
  | "single-exported-declaration"
  | "single-exported-root"
  | "single-root"
  | "document-name-match";
/**
 * Shared internal contract for implicit-entry analysis.
 *
 * Invariants:
 * - success-like analyses set `entryName` and `selectionReason`
 * - ambiguous analyses set `ambiguityReason`
 * - `rootCandidates` always describe local graph roots
 * - `exportedRootCandidates` always describe exported graph roots
 */
export interface TypeScriptImplicitEntryAnalysis {
  entryName?: string | undefined;
  rootCandidates: string[];
  exportedRootCandidates: string[];
  selectionReason?: TypeScriptImplicitEntrySelectionReason;
  ambiguityReason?: TypeScriptImplicitEntryAmbiguityReason;
}
/**
 * Analyze implicit entry candidates from already-collected declaration maps.
 *
 * Rule order is part of the contract:
 * 1. exact single declaration
 * 2. exact single exported declaration
 * 3. exact single exported root
 * 4. exact single local root
 * 5. conservative document-name tie-break
 * 6. explicit ambiguity classification
 */
export declare function analyzeImplicitEntry(options: {
  declarationMap: ReadonlyMap<string, TypeScriptEntryDeclaration>;
  exportedDeclarationMap: ReadonlyMap<string, TypeScriptEntryDeclaration>;
  preferredEntryName?: string | undefined;
}): TypeScriptImplicitEntryAnalysis;
export declare function analyzeImplicitEntryFromSource(
  input: string,
  preferredEntryName?: string,
): TypeScriptImplicitEntryAnalysis;
/**
 * Derive a conservative preferred entry name from a custom document name.
 *
 * The default `TypeScriptDocument` is intentionally ignored so default parser
 * behavior never changes because of the package's fallback document name.
 */
export declare function derivePreferredEntryNameFromDocumentName(
  documentName: string,
): string | undefined;
/**
 * Collect declaration names that are not referenced by any other supported
 * declaration in the same map.
 */
export declare function collectRootDeclarationNames(
  declarationMap: ReadonlyMap<string, TypeScriptEntryDeclaration>,
): string[];
```

## packages/parsers/typescript/src/index.d.ts

```ts
export {
  TypeScriptInferenceError,
  isTypeScriptInferenceError,
} from "./errors.js";
export { typeScriptParserCapabilities } from "./capabilities.js";
export {
  analyzeImplicitEntry,
  analyzeImplicitEntryFromSource,
  collectRootDeclarationNames,
  type TypeScriptImplicitEntryAmbiguityReason,
  type TypeScriptImplicitEntryAnalysis,
} from "./implicit-entry.js";
export {
  inferTypeScriptDocument,
  inferTypeScriptDocumentWithOptions,
  preparedTypeScriptParserOptions,
  tryInferTypeScriptDocument,
  tryInferTypeScriptDocumentWithOptions,
  typeScriptParser,
  type TypeScriptInferenceFailureResult,
  type TypeScriptInferenceResult,
  type TypeScriptInferenceSuccessResult,
} from "./api.js";
export {
  preprocessTypeScriptSource,
  type TypeScriptPreprocessFailureResult,
  type TypeScriptPreprocessResult,
  type TypeScriptPreprocessSuccessResult,
} from "./preprocess.js";
export { createTypeScriptSourceFile } from "./syntax.js";
export {
  DEFAULT_TYPESCRIPT_PARSE_OPTIONS,
  assertSupportedTypeScriptParseOptions,
  configureTypeScriptParser,
  createTypeScriptParser,
  prepareTypeScriptParseOptions,
  resolveTypeScriptParseOptions,
  validateTypeScriptParseOptions,
  type ResolvedTypeScriptParseOptions,
  type TypeScriptDiagnosticsOptions,
  type TypeScriptParseOptions,
  type TypeScriptParseStrictness,
} from "./options.js";
```

## packages/parsers/typescript/src/options.d.ts

```ts
import type {
  ConfiguredParser,
  ParseOptions,
  PreparedOptions,
  SchemaParser,
} from "@aio/core";
import type { TypeScriptInferenceResult } from "./api.js";
export type TypeScriptParseStrictness = "strict";
export interface TypeScriptDiagnosticsOptions {
  preserveSourceInfo?: false;
}
export interface TypeScriptParseOptions extends ParseOptions {
  entry?: string;
  strictness?: TypeScriptParseStrictness;
  diagnostics?: TypeScriptDiagnosticsOptions;
}
export interface ResolvedTypeScriptParseOptions {
  name: string;
  entry: string | undefined;
  strictness: TypeScriptParseStrictness;
  diagnostics: {
    preserveSourceInfo: false;
  };
}
export declare const DEFAULT_TYPESCRIPT_PARSE_OPTIONS: ResolvedTypeScriptParseOptions;
export declare function resolveTypeScriptParseOptions(
  options?: TypeScriptParseOptions,
): ResolvedTypeScriptParseOptions;
export declare function validateTypeScriptParseOptions(
  options: ResolvedTypeScriptParseOptions,
): string[];
export declare function assertSupportedTypeScriptParseOptions(
  options: ResolvedTypeScriptParseOptions,
): void;
export declare function prepareTypeScriptParseOptions(
  options?: TypeScriptParseOptions,
): PreparedOptions<ResolvedTypeScriptParseOptions>;
export declare function createTypeScriptParser(
  parseWithOptions: (
    input: string,
    options: ResolvedTypeScriptParseOptions,
  ) => TypeScriptInferenceResult,
  options?: TypeScriptParseOptions,
): SchemaParser<string, TypeScriptParseOptions, TypeScriptInferenceResult>;
export declare function configureTypeScriptParser(
  parseWithOptions: (
    input: string,
    options: ResolvedTypeScriptParseOptions,
  ) => TypeScriptInferenceResult,
  options?: TypeScriptParseOptions,
): ConfiguredParser<
  SchemaParser<string, TypeScriptParseOptions, TypeScriptInferenceResult>,
  ResolvedTypeScriptParseOptions
>;
```

## packages/parsers/typescript/src/preprocess.d.ts

```ts
import type { SchemaDiagnostic } from "@aio/core";
import ts from "typescript";
import { type TypeScriptImplicitEntryAnalysis } from "./implicit-entry.js";
import type { ResolvedTypeScriptParseOptions } from "./options.js";
import type { TypeScriptEntryDeclaration } from "./types.js";
export interface TypeScriptPreprocessSuccessResult {
  ok: true;
  sourceFile: ts.SourceFile;
  entryDeclaration: TypeScriptEntryDeclaration;
  declarationMap: ReadonlyMap<string, TypeScriptEntryDeclaration>;
  declarationNames: Set<string>;
  importedTypeMap: ReadonlyMap<string, string>;
  implicitEntryAnalysis: TypeScriptImplicitEntryAnalysis;
}
export interface TypeScriptPreprocessFailureResult {
  ok: false;
  code:
    | "missing-typescript-entry"
    | "missing-typescript-entry-declaration"
    | "unsupported-typescript-syntax"
    | "unsupported-typescript-entry-declaration-kind"
    | "unsupported-typescript-interface-heritage"
    | "unsupported-typescript-export-all-entry"
    | "unsupported-typescript-top-level-module-statement"
    | "unsupported-typescript-reexported-entry";
  message: string;
  diagnostics: SchemaDiagnostic[];
}
export type TypeScriptPreprocessResult =
  TypeScriptPreprocessSuccessResult | TypeScriptPreprocessFailureResult;
export declare function preprocessTypeScriptSource(
  input: string,
  options: ResolvedTypeScriptParseOptions,
): TypeScriptPreprocessResult;
```

## packages/parsers/typescript/src/syntax.d.ts

```ts
import ts from "typescript";
import type { TypeScriptSourceLocation } from "./types.js";
export declare function createTypeScriptSourceFile(
  input: string,
  fileName?: string,
): ts.SourceFile;
export declare function getTypeScriptSourceLocationFromSpan(
  sourceFile: ts.SourceFile,
  startOffset: number,
  length: number,
): TypeScriptSourceLocation;
export declare function getTypeScriptSourceLocation(
  node: ts.Node | ts.SourceFile,
): TypeScriptSourceLocation;
```

## packages/parsers/typescript/src/types.d.ts

```ts
import type {
  SchemaDefinition,
  SchemaDiagnostic,
  SchemaSemanticNote,
} from "@aio/core";
import type ts from "typescript";
export type TypeScriptEntryDeclaration =
  ts.TypeAliasDeclaration | ts.InterfaceDeclaration | ts.EnumDeclaration;
export type TypeScriptNamedTopLevelStatement =
  TypeScriptEntryDeclaration | ts.ClassDeclaration | ts.ModuleDeclaration;
export interface TypeScriptReExportReference {
  exportedName: string;
  importedName: string;
  moduleSpecifier: string;
  declarationText: string;
  sourceLocation: TypeScriptSourceLocation;
}
export interface TypeScriptExportAllReference {
  moduleSpecifier: string;
  declarationText: string;
  sourceLocation: TypeScriptSourceLocation;
}
export interface TypeScriptBlockingTopLevelStatement {
  statementKind: string;
  declarationText: string;
  sourceLocation: TypeScriptSourceLocation;
}
export interface TypeScriptConvertContext {
  definitions: SchemaDefinition[];
  diagnostics: SchemaDiagnostic[];
  semanticNotes: SchemaSemanticNote[];
  declarationMap: ReadonlyMap<string, TypeScriptEntryDeclaration>;
  declarationNames: Set<string>;
  importedTypeMap: ReadonlyMap<string, string>;
  convertedDefinitionNames: Set<string>;
  activeDefinitionNames: Set<string>;
  path: string[];
  sourceName: string;
}
export interface TypeScriptSourcePosition {
  offset: number;
  line: number;
  column: number;
}
export interface TypeScriptSourceLocation {
  start: TypeScriptSourcePosition;
  end: TypeScriptSourcePosition;
  length: number;
}
```

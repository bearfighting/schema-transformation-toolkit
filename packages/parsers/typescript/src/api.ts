import type {
  ParseFailureResult,
  SchemaDiagnostic,
  SchemaDocument,
  SchemaSemanticNote,
} from "@aio/core";
import { getTypeScriptSourceLocation } from "./syntax.js";
import { convertTypeScriptEntryDeclarationToSchemaDocument } from "./convert.js";
import { unsupportedTypeScriptParserV0Diagnostic } from "./diagnostics.js";
import { isTypeScriptInferenceError } from "./errors.js";
import {
  assertSupportedTypeScriptParseOptions,
  configureTypeScriptParser,
  resolveTypeScriptParseOptions,
  type ResolvedTypeScriptParseOptions,
  type TypeScriptParseOptions,
} from "./options.js";
import { preprocessTypeScriptSource } from "./preprocess.js";

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
  | "unsupported-typescript-tuple-rest-element"
  | "unsupported-typescript-type-member"
  | "unsupported-typescript-type-reference"
>;

export type TypeScriptInferenceResult =
  TypeScriptInferenceSuccessResult | TypeScriptInferenceFailureResult;

/** Parses TypeScript source and returns the inferred schema document or throws on failure. */
export function inferTypeScriptDocument(
  input: string,
  name = "TypeScriptDocument",
): SchemaDocument {
  return inferTypeScriptDocumentWithOptions(input, { name });
}

/** Parses TypeScript source with explicit parser options and returns the inferred schema document or throws on failure. */
export function inferTypeScriptDocumentWithOptions(
  input: string,
  options: TypeScriptParseOptions = {},
): SchemaDocument {
  const result = tryInferTypeScriptDocumentWithOptions(input, options);

  if (!result.ok) {
    throw new Error(result.message);
  }

  return result.document;
}

/** Parses TypeScript source and returns a structured success or failure result. */
export function tryInferTypeScriptDocument(
  input: string,
  name = "TypeScriptDocument",
): TypeScriptInferenceResult {
  return tryInferTypeScriptDocumentWithOptions(input, { name });
}

/** Parses TypeScript source with explicit parser options and returns a structured success or failure result. */
export function tryInferTypeScriptDocumentWithOptions(
  input: string,
  options: TypeScriptParseOptions = {},
): TypeScriptInferenceResult {
  const resolvedOptions = resolveTypeScriptParseOptions(options);

  assertSupportedTypeScriptParseOptions(resolvedOptions);

  return tryInferTypeScriptDocumentWithResolvedOptions(input, resolvedOptions);
}

const defaultConfiguredTypeScriptParser = configureTypeScriptParser(
  (input, options) =>
    tryInferTypeScriptDocumentWithResolvedOptions(input, options),
);

/** Shared default TypeScript parser instance using the default v0 options. */
export const typeScriptParser = defaultConfiguredTypeScriptParser.parser;
/** Prepared default option state for the shared TypeScript parser instance. */
export const preparedTypeScriptParserOptions =
  defaultConfiguredTypeScriptParser.prepared;

function createUnsupportedTypeScriptParserResult(
  options: ResolvedTypeScriptParseOptions,
  sourceLocation?: {
    start: { offset: number; line: number; column: number };
    end: { offset: number; line: number; column: number };
    length: number;
  },
): TypeScriptInferenceFailureResult {
  return createFailureResult(
    "unsupported-typescript-parser-v0",
    "The TypeScript parser hit an unexpected fallback outside the supported v0 schema subset.",
    [
      unsupportedTypeScriptParserV0Diagnostic({
        documentName: options.name,
        ...(options.entry ? { entry: options.entry } : {}),
        ...(sourceLocation ? { sourceLocation } : {}),
      }),
    ],
  );
}

function tryInferTypeScriptDocumentWithResolvedOptions(
  input: string,
  options: ResolvedTypeScriptParseOptions,
): TypeScriptInferenceResult {
  const preprocessed = preprocessTypeScriptSource(input, options);

  if (!preprocessed.ok) {
    return createFailureResult(
      preprocessed.code,
      preprocessed.message,
      preprocessed.diagnostics,
    );
  }

  try {
    const converted = convertTypeScriptEntryDeclarationToSchemaDocument(
      preprocessed.entryDeclaration,
      options.name,
      preprocessed.declarationMap,
      preprocessed.declarationNames,
      preprocessed.importedTypeMap,
    );

    return {
      ok: true,
      document: converted.document,
      ...(converted.diagnostics.length > 0
        ? { diagnostics: converted.diagnostics }
        : {}),
      ...(converted.semanticNotes.length > 0
        ? { semanticNotes: converted.semanticNotes }
        : {}),
    };
  } catch (error) {
    if (isTypeScriptInferenceError(error)) {
      return createFailureResult(
        error.code,
        error.message,
        error.diagnostics ?? [],
      );
    }

    return createUnsupportedTypeScriptParserResult(
      options,
      getTypeScriptSourceLocation(preprocessed.sourceFile),
    );
  }
}

function createFailureResult(
  code: TypeScriptInferenceFailureResult["code"],
  message: string,
  diagnostics: SchemaDiagnostic[],
): TypeScriptInferenceFailureResult {
  return {
    ok: false,
    code,
    message,
    diagnostics,
  };
}

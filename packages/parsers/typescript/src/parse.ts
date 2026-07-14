import type {
  ParseFailureResult,
  SchemaDiagnostic,
  SchemaDocument,
} from "@aio/core";
import {
  createTypeScriptSourceFile,
  getTypeScriptSourceLocation,
} from "./syntax.js";
import {
  collectTopLevelDeclarations,
  findTypeScriptEntryDeclaration,
} from "./entry.js";
import { convertTypeScriptEntryDeclarationToSchemaDocument } from "./convert.js";
import {
  missingEntryDeclarationDiagnostic,
  missingEntryNameDiagnostic,
  unsupportedTypeScriptParserV0Diagnostic,
} from "./diagnostics.js";
import { isTypeScriptInferenceError } from "./errors.js";
import {
  assertSupportedTypeScriptParseOptions,
  configureTypeScriptParser,
  resolveTypeScriptParseOptions,
  type ResolvedTypeScriptParseOptions,
  type TypeScriptParseOptions,
} from "./options.js";

export interface TypeScriptInferenceSuccessResult {
  ok: true;
  document: SchemaDocument;
  diagnostics?: SchemaDiagnostic[];
}

export type TypeScriptInferenceFailureResult = ParseFailureResult<
  | "missing-typescript-entry"
  | "missing-typescript-entry-declaration"
  | "missing-typescript-property-type"
  | "unsupported-typescript-enum-member-initializer"
  | "unsupported-typescript-conditional-type"
  | "unsupported-typescript-function-type"
  | "unsupported-typescript-intersection-type"
  | "unsupported-typescript-mapped-type"
  | "unsupported-typescript-parser-v0"
  | "unsupported-typescript-property-name"
  | "unsupported-typescript-record-key"
  | "unsupported-typescript-syntax"
  | "unsupported-typescript-tuple-rest-element"
  | "unsupported-typescript-type-member"
  | "unsupported-typescript-type-reference"
>;

export type TypeScriptInferenceResult =
  TypeScriptInferenceSuccessResult | TypeScriptInferenceFailureResult;

export function inferTypeScriptDocument(
  input: string,
  name = "TypeScriptDocument",
): SchemaDocument {
  return inferTypeScriptDocumentWithOptions(input, { name });
}

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

export function tryInferTypeScriptDocument(
  input: string,
  name = "TypeScriptDocument",
): TypeScriptInferenceResult {
  return tryInferTypeScriptDocumentWithOptions(input, { name });
}

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

export const typeScriptParser = defaultConfiguredTypeScriptParser.parser;
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
  const sourceFile = createTypeScriptSourceFile(input);

  if (!options.entry) {
    return createFailureResult(
      "missing-typescript-entry",
      "TypeScript parser v0 requires an explicit entry declaration name.",
      [missingEntryNameDiagnostic(getTypeScriptSourceLocation(sourceFile))],
    );
  }

  const declarationMap = collectTopLevelDeclarations(sourceFile);
  const declarationNames = new Set(declarationMap.keys());
  const entryDeclaration = findTypeScriptEntryDeclaration(
    sourceFile,
    options.entry,
  );

  if (!entryDeclaration) {
    return createFailureResult(
      "missing-typescript-entry-declaration",
      `The TypeScript parser could not find a supported declaration named "${options.entry}".`,
      [
        {
          ...missingEntryDeclarationDiagnostic(
            options.entry,
            getTypeScriptSourceLocation(sourceFile),
          ),
          evidence: {
            entry: options.entry,
            availableDeclarations: Array.from(declarationNames).sort(),
            sourceLocation: getTypeScriptSourceLocation(sourceFile),
          },
        },
      ],
    );
  }

  try {
    const converted = convertTypeScriptEntryDeclarationToSchemaDocument(
      entryDeclaration,
      options.name,
      declarationMap,
      declarationNames,
    );

    return {
      ok: true,
      document: converted.document,
      ...(converted.diagnostics.length > 0
        ? { diagnostics: converted.diagnostics }
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
      getTypeScriptSourceLocation(sourceFile),
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

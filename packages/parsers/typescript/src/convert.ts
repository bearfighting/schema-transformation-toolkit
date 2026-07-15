import {
  schemaDefinition,
  schemaDocument,
  schemaReferenceNode,
  type SchemaDiagnostic,
  tryValidateSchemaDocument,
  type SchemaDocument,
} from "@aio/core";
import ts from "typescript";
import { convertTypeScriptEnumDeclaration } from "./convert-enum.js";
import { createUnsupportedDeclarationShapeDiagnostic } from "./declaration-shape.js";
import { convertTypeScriptTypeNode } from "./convert-node.js";
import { throwTypeScriptInferenceError } from "./errors.js";
import type {
  TypeScriptConvertContext,
  TypeScriptEntryDeclaration,
} from "./types.js";

export function convertTypeScriptEntryDeclarationToSchemaDocument(
  declaration: TypeScriptEntryDeclaration,
  sourceName: string,
  declarationMap: ReadonlyMap<string, TypeScriptEntryDeclaration>,
  declarationNames: Set<string>,
  importedTypeMap: ReadonlyMap<string, string>,
): {
  ok: true;
  document: SchemaDocument;
  diagnostics: SchemaDiagnostic[];
} {
  const context: TypeScriptConvertContext = {
    definitions: [],
    diagnostics: [],
    declarationMap,
    declarationNames,
    importedTypeMap,
    convertedDefinitionNames: new Set<string>(),
    activeDefinitionNames: new Set<string>(),
    path: [],
    sourceName,
  };

  ensureDefinitionForDeclaration(declaration.name.text, context);

  const document = schemaDocument(
    sourceName,
    schemaReferenceNode(declaration.name.text),
    {
      definitions: context.definitions,
    },
  );
  const validation = tryValidateSchemaDocument(document);

  if (!validation.ok) {
    context.diagnostics.push(...validation.diagnostics);
  }

  return {
    ok: true,
    document,
    diagnostics: context.diagnostics,
  };
}

function ensureDefinitionForDeclaration(
  name: string,
  context: TypeScriptConvertContext,
): void {
  if (context.convertedDefinitionNames.has(name)) {
    return;
  }

  if (context.activeDefinitionNames.has(name)) {
    return;
  }

  const declaration = context.declarationMap.get(name);

  if (!declaration) {
    throw new Error(`Unknown TypeScript declaration "${name}".`);
  }

  context.activeDefinitionNames.add(name);

  assertSupportedDeclarationShape(declaration, context.sourceName, [
    "definitions",
    name,
  ]);

  const type = ts.isTypeAliasDeclaration(declaration)
    ? convertTypeScriptTypeNode(declaration.type, {
        ...context,
        path: ["definitions", name],
      })
    : ts.isEnumDeclaration(declaration)
      ? convertTypeScriptEnumDeclaration(declaration, {
          sourceName: context.sourceName,
          path: ["definitions", name],
        })
      : convertTypeScriptTypeNode(
          ts.factory.createTypeLiteralNode(declaration.members),
          {
            ...context,
            path: ["definitions", name],
          },
        );

  context.activeDefinitionNames.delete(name);
  context.definitions.push(schemaDefinition(name, type));
  context.convertedDefinitionNames.add(name);
}

function assertSupportedDeclarationShape(
  declaration: TypeScriptEntryDeclaration,
  sourceName: string,
  path: string[],
): void {
  const diagnostic = createUnsupportedDeclarationShapeDiagnostic(
    declaration,
    sourceName,
    path,
  );

  if (diagnostic) {
    throwTypeScriptInferenceError(
      "unsupported-typescript-interface-heritage",
      "Interface extends clauses are outside the supported TypeScript schema subset.",
      [diagnostic],
    );
  }
}

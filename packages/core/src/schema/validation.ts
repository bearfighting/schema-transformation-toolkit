import type {
  SchemaDefinition,
  SchemaDiagnostic,
  SchemaDocument,
  SchemaNode,
  SchemaValidationResult,
} from "./types.js";
import { walkSchemaDocument } from "./traversal.js";

export function validateSchemaDocument(document: SchemaDocument): void {
  const result = tryValidateSchemaDocument(document);

  if (!result.ok) {
    throw new Error(
      result.diagnostics[0]?.message ?? "Invalid schema document.",
    );
  }
}

export function validateSchemaFieldNullability(type: SchemaNode): void {
  const result = tryValidateSchemaFieldNullability(type);

  if (!result.ok) {
    throw new Error(result.diagnostics[0]?.message ?? "Invalid schema field.");
  }
}

export function tryValidateSchemaDocument(
  document: SchemaDocument,
): SchemaValidationResult {
  const diagnostics = collectSchemaDocumentValidationDiagnostics(document);

  if (diagnostics.length === 0) {
    return { ok: true };
  }

  return {
    ok: false,
    diagnostics,
  };
}

export function tryValidateSchemaFieldNullability(
  type: SchemaNode,
): SchemaValidationResult {
  const diagnostics = collectSchemaFieldNullabilityDiagnostics(type);

  if (diagnostics.length === 0) {
    return { ok: true };
  }

  return {
    ok: false,
    diagnostics,
  };
}

function collectSchemaDocumentValidationDiagnostics(
  document: SchemaDocument,
): SchemaDiagnostic[] {
  const diagnostics: SchemaDiagnostic[] = [];
  const definitionMap = new Map<string, SchemaDefinition>();

  for (const definition of document.definitions) {
    if (definition.name.source.trim().length === 0) {
      diagnostics.push({
        severity: "error",
        code: "invalid-definition-name",
        message:
          "Invalid schema document: definitions must use a non-empty name.",
        path: ["definitions"],
        nodeKind: "definition",
        source: "core",
      });
      continue;
    }

    if (definitionMap.has(definition.name.source)) {
      diagnostics.push({
        severity: "error",
        code: "duplicate-definition-name",
        message: `Invalid schema document: duplicate definition name "${definition.name.source}".`,
        path: ["definitions", definition.name.source],
        nodeKind: "definition",
        source: "core",
      });
      continue;
    }

    definitionMap.set(definition.name.source, definition);
  }

  walkSchemaDocument(
    document,
    {
      enter(context) {
        if (context.node.kind !== "reference") {
          return;
        }

        if (definitionMap.has(context.node.name)) {
          return;
        }

        diagnostics.push({
          severity: "error",
          code: "unknown-reference",
          message: `Invalid schema document: reference "${context.node.name}" does not match a known definition.`,
          path: context.path,
          nodeKind: "reference",
          source: "core",
          evidence: {
            referenceName: context.node.name,
          },
        });
      },
    },
    { references: "preserve" },
  );

  return diagnostics;
}

function collectSchemaFieldNullabilityDiagnostics(
  type: SchemaNode,
): SchemaDiagnostic[] {
  if (!schemaNodeIncludesNull(type)) {
    return [];
  }

  return [
    {
      severity: "error",
      code: "invalid-field-nullability",
      message:
        'Invalid schema field: a field whose type already includes "null" cannot also be marked nullable.',
      nodeKind: "field",
      source: "core",
    },
  ];
}

function schemaNodeIncludesNull(type: SchemaNode): boolean {
  if (type.kind === "null") {
    return true;
  }

  if (type.kind === "union") {
    return type.members.some(schemaNodeIncludesNull);
  }

  return false;
}

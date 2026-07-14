import type {
  SchemaDefinition,
  SchemaDiagnostic,
  SchemaDocument,
  SchemaNode,
  SchemaValidationResult,
} from "./types.js";

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

  for (const definition of document.definitions) {
    collectSchemaNodeReferenceDiagnostics(
      definition.type,
      definitionMap,
      diagnostics,
      ["definitions", definition.name.source],
    );
  }

  collectSchemaNodeReferenceDiagnostics(
    document.root,
    definitionMap,
    diagnostics,
    ["root"],
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

function collectSchemaNodeReferenceDiagnostics(
  node: SchemaNode,
  definitions: ReadonlyMap<string, SchemaDefinition>,
  diagnostics: SchemaDiagnostic[],
  path: string[],
): void {
  switch (node.kind) {
    case "scalar":
    case "literal":
    case "null":
    case "unknown":
      return;
    case "reference":
      if (!definitions.has(node.name)) {
        diagnostics.push({
          severity: "error",
          code: "unknown-reference",
          message: `Invalid schema document: reference "${node.name}" does not match a known definition.`,
          path,
          nodeKind: "reference",
          source: "core",
          evidence: {
            referenceName: node.name,
          },
        });
      }
      return;
    case "array":
      collectSchemaNodeReferenceDiagnostics(
        node.elementType,
        definitions,
        diagnostics,
        [...path, "elementType"],
      );
      return;
    case "tuple":
      for (const [index, element] of node.elements.entries()) {
        collectSchemaNodeReferenceDiagnostics(
          element.type,
          definitions,
          diagnostics,
          [...path, "elements", String(index)],
        );
      }
      return;
    case "record":
      collectSchemaNodeReferenceDiagnostics(
        node.key,
        definitions,
        diagnostics,
        [...path, "key"],
      );
      collectSchemaNodeReferenceDiagnostics(
        node.value,
        definitions,
        diagnostics,
        [...path, "value"],
      );
      return;
    case "union":
      for (const [index, member] of node.members.entries()) {
        collectSchemaNodeReferenceDiagnostics(
          member,
          definitions,
          diagnostics,
          [...path, "members", String(index)],
        );
      }
      return;
    case "object":
      for (const field of node.fields) {
        collectSchemaNodeReferenceDiagnostics(
          field.type,
          definitions,
          diagnostics,
          [...path, field.name.source],
        );
      }
      return;
  }
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
